import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createHeadlessPlatform } from '../../../src/bootstrap/gamePackage';
import { blockPlacementPackage } from '../../../src/games/block-placement/package';
import {
  GAME_PROJECT_CONTRACT,
  GAME_PROJECT_CONTRACT_VERSION,
  STUDIO_PROJECT_V2_FORMAT,
  STUDIO_PROJECT_V2_VERSION,
} from '../../../src/game-runtime/projectEnvelope';
import { GAME_REPLAY_CONTRACT, GAME_REPLAY_CONTRACT_VERSION } from '../../../src/game-runtime/replayEnvelope';
import { compileFrameSourceFromDocument, validateStudioProjectDocumentV2 } from '../../../src/game-runtime/projectDocument';
import { catalogAcceptsEvent } from '../../../src/game-runtime/renderContract';
import { AssetRegistry } from '../../../src/headless/assetRegistry';
import type { EffectPackManifest, LookPackManifest } from '../../../src/headless/contracts';
import { compileVariantV2 } from '../../../src/headless/variantCompilerV2';
import { buildCreativeMasterV2 } from '../../../src/headless/creativeMasterV2';
import { createCalibrationCase } from '../../../src/headless/calibration';
import { requireCaptureSuite } from '../../../src/capture/captureSuiteRegistry';
import { getDefaultCalibrationProfile, requireCalibrationProfile } from '../../../src/rendering/compositionRegistry';
import { assertBackendSupportsPacket, requireRenderBackend } from '../../../src/rendering/backendRegistry';
import { assertPacketMatchesFrameSource, assertVideoRenderJobContract } from '../../../src/rendering/renderJob';
import { readyRenderResources } from '../../../src/rendering/preparedRenderResources';
import { makeFixture, ref } from '../../headlessFixtures';
import {
  CRUSH_ACTION_SCHEMA_ID,
  CRUSH_CALIBRATION_ID,
  CRUSH_CONFIG_SCHEMA_ID,
  CRUSH_GAME_ID,
  CRUSH_MODULE_VERSION,
  CRUSH_STATE_SCHEMA_ID,
  crushCaptureSuite,
  crushDiagnosticBackend,
  crushRenderContract,
  crushRuntime,
  fakeCrushPackage,
  hashCrushState,
} from './fakeCrushPackage';

function crushDocument() {
  const config = { columns: 2, rows: 2 };
  const initial = crushRuntime.createInitialState(config, 1);
  return {
    format: STUDIO_PROJECT_V2_FORMAT,
    version: STUDIO_PROJECT_V2_VERSION,
    id: 'crush.diag',
    name: 'Crush Diagnostic',
    game: {
      contract: GAME_PROJECT_CONTRACT,
      contractVersion: GAME_PROJECT_CONTRACT_VERSION,
      game: {
        id: CRUSH_GAME_ID,
        moduleVersion: CRUSH_MODULE_VERSION,
        rulesetId: 'crush-diag',
        rulesetVersion: CRUSH_MODULE_VERSION,
      },
      config: { schemaId: CRUSH_CONFIG_SCHEMA_ID, data: config },
      initialState: {
        schemaId: CRUSH_STATE_SCHEMA_ID,
        data: initial,
        stateHash: hashCrushState(initial),
      },
    },
    production: {
      layoutProfileRef: ref('layout.vertical', 'ui-theme', 'd'),
      cameraProfileRef: ref('camera.fixed', 'camera-profile', 'e'),
      lookPackRef: ref('look.crush', 'look-pack', '8'),
      output: { width: 1080, height: 1920, fps: 30, quality: 'preview' as const },
    },
    takes: [
      {
        contract: GAME_REPLAY_CONTRACT,
        contractVersion: GAME_REPLAY_CONTRACT_VERSION,
        gameId: CRUSH_GAME_ID,
        moduleVersion: CRUSH_MODULE_VERSION,
        takeId: 'drop-0',
        initialStateHash: hashCrushState(initial),
        seed: 1,
        actions: [
          {
            id: 'drop-col-0',
            actor: 'agent' as const,
            schemaId: CRUSH_ACTION_SCHEMA_ID,
            action: { column: 0 },
          },
        ],
        interactions: [
          {
            id: 'tap-0',
            modality: 'tap' as const,
            startFrame: 0,
            endFrame: 8,
            committedActionId: 'drop-col-0',
            samples: [{ frameOffset: 0, x: 0.2, y: 0.4 }],
          },
        ],
      },
    ],
  };
}

describe('fake block-crush-drop platform contract', () => {
  it('registers a second game without changing platform compiler exporter or studio shell', () => {
    const variantSource = readFileSync(resolve(process.cwd(), 'src/headless/variantCompilerV2.ts'), 'utf8');
    const exporterSource = readFileSync(resolve(process.cwd(), 'src/exporter/offlineVideoExporter.ts'), 'utf8');
    const shellSource = readFileSync(resolve(process.cwd(), 'src/studio/StudioShell.tsx'), 'utf8');
    const jobSource = readFileSync(resolve(process.cwd(), 'src/rendering/renderJob.ts'), 'utf8');
    const studioRegistrySource = readFileSync(resolve(process.cwd(), 'src/studio/gameStudioRegistry.ts'), 'utf8');
    expect(variantSource).not.toMatch(/block-placement\./);
    expect(variantSource).not.toMatch(/block-crush/);
    expect(exporterSource).not.toMatch(/block-crush/);
    expect(shellSource).not.toMatch(/block-crush/);
    expect(shellSource).not.toMatch(/vita-mahjong/);
    expect(jobSource).not.toMatch(/block-crush|block-placement/);
    expect(studioRegistrySource).not.toMatch(/block-crush|block-placement|vita-mahjong/);
  });

  it('walks package → registry → V2 validation → frame source → contract → effect → profiles → job', async () => {
    const platform = createHeadlessPlatform([blockPlacementPackage, fakeCrushPackage]);
    expect(platform.games.require(CRUSH_GAME_ID).manifest.gameId).toBe(CRUSH_GAME_ID);
    expect(platform.renderContracts.require(crushRenderContract.id).gameId).toBe(CRUSH_GAME_ID);
    expect(platform.presentations.require(CRUSH_GAME_ID).gameId).toBe(CRUSH_GAME_ID);
    expect(requireCalibrationProfile(CRUSH_CALIBRATION_ID).rois.map((roi) => roi.id)).toEqual(['well', 'impact']);
    expect(getDefaultCalibrationProfile().gameId).toBe('block-placement');
    expect(requireCaptureSuite(CRUSH_GAME_ID).stills).toHaveLength(1);
    expect(requireRenderBackend(crushDiagnosticBackend.id).supportedPresentationSchemas).toEqual(
      crushDiagnosticBackend.supportedPresentationSchemas,
    );
    expect(crushCaptureSuite.stills).toHaveLength(1);

    const document = crushDocument();
    const validated = validateStudioProjectDocumentV2(document, platform.games);
    expect(validated.parsed.takes[0]?.actions).toEqual([{ column: 0 }]);

    const frameSource = compileFrameSourceFromDocument(document, platform, {
      takeId: 'drop-0',
      directorProfile: {},
      fps: 30,
    });
    expect(frameSource.gameId).toBe(CRUSH_GAME_ID);
    const packet0 = frameSource.evaluate(0);
    assertPacketMatchesFrameSource(packet0, frameSource, 0);
    expect(packet0.semanticEvents.some((item) => item.type === 'block-crush.impact')).toBe(true);

    expect(catalogAcceptsEvent(crushRenderContract, 'block-crush.collapse')).toBe(true);
    expect(catalogAcceptsEvent(crushRenderContract, 'line-clear')).toBe(false);

    const crushCase = createCalibrationCase({
      id: 'crush-roi',
      eventId: 'impact',
      eventType: 'block-crush.impact',
      targetFrame: 0,
      correspondence: 'isolated-presentation',
      calibrationProfileId: CRUSH_CALIBRATION_ID,
    });
    expect(crushCase.roi.map((roi) => roi.id)).toEqual(['well', 'impact']);
    expect(crushCase.compositionProfileId).toBe('block-crush-drop.composition.diag');
    expect(getDefaultCalibrationProfile().rois.some((roi) => roi.id === 'tray')).toBe(true);
    expect(() => createCalibrationCase({
      id: 'missing-profile',
      eventId: 'impact',
      eventType: 'block-crush.impact',
      targetFrame: 0,
      correspondence: 'isolated-presentation',
    })).toThrow(/calibrationProfileId/);

    const fixture = makeFixture();
    const crushEffect: EffectPackManifest = {
      ...(fixture.assets.find((item) => item.id === 'effect.copper-clear') as EffectPackManifest),
      id: 'effect.crush-impact',
      supportedEvents: ['block-crush.impact', 'block-crush.crush-resolved', 'block-crush.collapse'],
    };
    const look: LookPackManifest = {
      ...(fixture.assets.find((item) => item.id === 'look.copper') as LookPackManifest),
      id: 'look.crush',
      slots: {
        'tile.material': ref('material.copper', 'material-pack', 'b'),
        'clear.primary': { id: 'effect.crush-impact', version: '1.0.0', kind: 'effect-pack', contentHash: crushEffect.contentHash },
        'crush.board': ref('background.dark', 'background', 'f'),
      },
    };
    const assets = fixture.assets.filter((item) => item.id !== 'look.copper').concat(look, crushEffect);
    const master = buildCreativeMasterV2(document, platform.games, {
      id: 'master.crush',
      takeId: 'drop-0',
      renderContract: crushRenderContract,
      fps: 30,
      totalFrames: frameSource.totalFrames,
      semanticHash: 'fnv1a32:crush',
    });
    const recipe = {
      ...fixture.recipe,
      id: 'variant.crush',
      masterId: 'master.crush',
      lockMode: 'semantic' as const,
      lookPackRef: { id: 'look.crush', version: '1.0.0', kind: 'look-pack' as const, contentHash: look.contentHash },
    };
    const plan = compileVariantV2(master, recipe, new AssetRegistry(assets), crushRenderContract, {
      renderer: 'fixed-camera-cinematic',
      requireHashes: true,
    });
    expect(plan.slots['tile.material']).toBeDefined();
    expect(plan.slots['clear.primary']).toBeDefined();
    expect(plan.game.id).toBe(CRUSH_GAME_ID);

    const resources = readyRenderResources(plan.planHash, {
      slots: [
        { slotId: 'tile.material', uri: 'mem:tile', contentHash: 'sha256:b', readiness: 'ready' },
        { slotId: 'clear.primary', uri: 'mem:fx', contentHash: crushEffect.contentHash ?? 'sha256:c', readiness: 'ready' },
      ],
    });
    const backend = requireRenderBackend(crushDiagnosticBackend.id);
    assertVideoRenderJobContract({
      frameSource,
      backend,
      output: { width: 1080, height: 1920, fps: frameSource.fps, quality: 'preview' },
      projectName: 'crush',
      takeName: 'drop-0',
      resources,
      requiredSlotIds: ['tile.material', 'clear.primary'],
    });

    const suite = requireCaptureSuite(CRUSH_GAME_ID);
    const stage = backend.createStage({} as HTMLCanvasElement, resources);
    try {
      await stage.warmup(packet0);
      for (const still of suite.stills) {
        expect(still.renderer).toBe(backend.renderer);
        const packet = frameSource.evaluate(0);
        assertPacketMatchesFrameSource(packet, frameSource, 0);
        assertBackendSupportsPacket(backend, packet);
        stage.renderAt(packet);
      }
    } finally {
      stage.dispose();
    }
  });
});
