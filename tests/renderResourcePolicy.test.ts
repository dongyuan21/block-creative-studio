import { describe, expect, it } from 'vitest';
import type { CompiledFrameSource } from '../src/game-runtime/frameSource';
import { assertVideoRenderJobContract } from '../src/rendering/renderJob';
import { readyRenderResources } from '../src/rendering/preparedRenderResources';
import {
  assertRenderResourcePolicy,
  bindPreparedResources,
  type PlanBoundRenderPlan,
  type RenderResourcePolicy,
} from '../src/rendering/resourcePolicy';
import { RenderBackendError } from '../src/rendering/backendRegistry';
import { BLOCK_CRUSH_DROP_GAME_ID } from '../src/games/block-crush-drop/manifest';
import { crushWoodCinematicBackend } from '../src/games/block-crush-drop/render/cinematicBackendAdapter';
import { crushWoodRenderContract } from '../src/games/block-crush-drop/render/renderContract';

const backend = crushWoodCinematicBackend;
const plan: PlanBoundRenderPlan = {
  planHash: 'fnv1a32:crush-plan',
  renderer: 'fixed-camera-cinematic',
  slots: {
    'tile.material': {} as PlanBoundRenderPlan['slots'][string],
    'clear.primary': {} as PlanBoundRenderPlan['slots'][string],
    'crush.board': {} as PlanBoundRenderPlan['slots'][string],
  },
};

function resources(overrides: Partial<ReturnType<typeof readyRenderResources>> = {}) {
  return {
    ...readyRenderResources(plan.planHash, {
      slots: [
        { slotId: 'tile.material', uri: 'mem:tile', contentHash: 'sha256:b', readiness: 'ready' },
        { slotId: 'clear.primary', uri: 'mem:fx', contentHash: 'sha256:c', readiness: 'ready' },
        { slotId: 'crush.board', uri: 'mem:board', contentHash: 'sha256:f', readiness: 'ready' },
      ],
    }),
    ...overrides,
  };
}

function frameSource(): CompiledFrameSource {
  return {
    gameId: BLOCK_CRUSH_DROP_GAME_ID,
    takeId: 'reference-take',
    fps: 30,
    totalFrames: 1,
    frameSourceHash: 'fnv1a32:source',
    evaluate: () => {
      throw new Error('not used');
    },
  };
}

describe('plan-bound render resource policy', () => {
  it('accepts resources bound to the resolved render plan and derived required slots', () => {
    const policy = bindPreparedResources({
      plan,
      resources: resources(),
      renderContract: crushWoodRenderContract,
      backend,
    });
    expect(policy.requiredSlotIds).toEqual(['tile.material', 'clear.primary', 'crush.board']);
    expect(() => assertRenderResourcePolicy(policy, {
      plan,
      renderContract: crushWoodRenderContract,
      backend,
    })).not.toThrow();
    expect(() => assertVideoRenderJobContract({
      frameSource: frameSource(),
      backend,
      output: { width: 1080, height: 1920, fps: 30, quality: 'preview' },
      projectName: 'crush',
      takeName: 'reference-take',
      resourcePolicy: policy,
      plan,
      renderContract: crushWoodRenderContract,
    })).not.toThrow();
  });

  it('rejects a prepared resource set whose planHash does not match the resolved plan', () => {
    const policy = bindPreparedResources({
      plan,
      resources: resources({ planHash: 'fnv1a32:other-plan' }),
      renderContract: crushWoodRenderContract,
      backend,
    });
    expect(() => assertRenderResourcePolicy(policy, {
      plan,
      renderContract: crushWoodRenderContract,
      backend,
    })).toThrow(RenderBackendError);
    try {
      assertRenderResourcePolicy(policy, { plan, renderContract: crushWoodRenderContract, backend });
    } catch (error) {
      expect((error as RenderBackendError).code).toMatch(/PLAN_HASH_MISMATCH|RESOURCES_PLAN_HASH_MISMATCH/);
    }
  });

  it('rejects a plan-bound policy that omits PreparedResources', () => {
    const policy = {
      mode: 'plan-bound' as const,
      planHash: plan.planHash,
      requiredSlotIds: ['tile.material', 'clear.primary', 'crush.board'],
    } as unknown as RenderResourcePolicy;
    expect(() => assertRenderResourcePolicy(policy, {
      plan,
      renderContract: crushWoodRenderContract,
      backend,
    })).toThrow(/PREPARED_RESOURCES_MISSING|PreparedResources/);
  });

  it('rejects a resource set that omits a required runtime slot', () => {
    const incomplete = readyRenderResources(plan.planHash, {
      slots: [
        { slotId: 'tile.material', uri: 'mem:tile', contentHash: 'sha256:b', readiness: 'ready' },
        { slotId: 'clear.primary', uri: 'mem:fx', contentHash: 'sha256:c', readiness: 'ready' },
      ],
    });
    const policy = bindPreparedResources({
      plan,
      resources: incomplete,
      renderContract: crushWoodRenderContract,
      backend,
    });
    expect(() => assertRenderResourcePolicy(policy, {
      plan,
      renderContract: crushWoodRenderContract,
      backend,
    })).toThrow(/crush\.board|not ready/);
  });

  it('rejects a required slot that is pending or failed', () => {
    const pending = readyRenderResources(plan.planHash, {
      slots: [
        { slotId: 'tile.material', uri: 'mem:tile', contentHash: 'sha256:b', readiness: 'ready' },
        { slotId: 'clear.primary', uri: 'mem:fx', contentHash: 'sha256:c', readiness: 'pending' },
        { slotId: 'crush.board', uri: 'mem:board', contentHash: 'sha256:f', readiness: 'failed' },
      ],
    });
    const policy = bindPreparedResources({
      plan,
      resources: pending,
      renderContract: crushWoodRenderContract,
      backend,
    });
    expect(() => assertRenderResourcePolicy(policy, {
      plan,
      renderContract: crushWoodRenderContract,
      backend,
    })).toThrow(/not ready/);
  });
});
