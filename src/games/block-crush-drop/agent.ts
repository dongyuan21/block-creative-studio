import { createRuntimeId } from '../../domain/runtimeId';
import {
  GAME_REPLAY_CONTRACT,
  GAME_REPLAY_CONTRACT_VERSION,
  type GameReplayEnvelope,
} from '../../game-runtime/replayEnvelope';
import { BLOCK_CRUSH_DROP_GAME_ID, BLOCK_CRUSH_DROP_MODULE_VERSION } from './manifest';
import { legalCrushWoodActions, crushWoodRuntime, hashCrushWoodState } from './runtime';
import { CRUSH_WOOD_ACTION_SCHEMA_ID } from './schemas';
import { crushWoodShapeSize } from './shapes';
import type { CrushWoodAction, CrushWoodConfig } from './types';

function scoreAction(state: ReturnType<typeof crushWoodRuntime.createInitialState>, action: CrushWoodAction, seed: number, stepIndex: number): number {
  const resolution = crushWoodRuntime.resolve(state, action, { seed, stepIndex });
  const width = crushWoodShapeSize(resolution.shape).width;
  const center = (state.columns - 1) / 2;
  const pieceCenter = action.column + (width - 1) / 2;
  return resolution.clearedRows.length * 10_000 + resolution.landingRow * 12 - Math.abs(pieceCenter - center);
}

export function pickCrushWoodAgentAction(
  state: ReturnType<typeof crushWoodRuntime.createInitialState>,
  seed: number,
  stepIndex: number,
): CrushWoodAction | null {
  const legal = legalCrushWoodActions(state);
  if (legal.length === 0) return null;
  let best = legal[0]!;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const action of legal) {
    const score = scoreAction(state, action, seed, stepIndex);
    if (score > bestScore) {
      best = action;
      bestScore = score;
    }
  }
  return best;
}

export function createCrushWoodAgentReplay(
  config: CrushWoodConfig,
  seed: number,
  maxMoves = 24,
): GameReplayEnvelope {
  let state = crushWoodRuntime.createInitialState(config, seed);
  const initialStateHash = hashCrushWoodState(state);
  const actions: CrushWoodAction[] = [];
  for (let stepIndex = 0; stepIndex < maxMoves && state.status === 'playing'; stepIndex += 1) {
    const action = pickCrushWoodAgentAction(state, seed, stepIndex);
    if (!action) break;
    state = crushWoodRuntime.stateAfter(crushWoodRuntime.resolve(state, action, { seed, stepIndex }));
    actions.push(action);
  }
  return createCrushWoodReplay(initialStateHash, seed, actions, 'agent', createRuntimeId('agent'));
}

export function createCrushWoodReplay(
  initialStateHash: string,
  seed: number,
  actions: readonly CrushWoodAction[],
  actor: 'human' | 'agent',
  takeId = createRuntimeId('take'),
): GameReplayEnvelope {
  return {
    contract: GAME_REPLAY_CONTRACT,
    contractVersion: GAME_REPLAY_CONTRACT_VERSION,
    gameId: BLOCK_CRUSH_DROP_GAME_ID,
    moduleVersion: BLOCK_CRUSH_DROP_MODULE_VERSION,
    takeId,
    initialStateHash,
    seed,
    actions: actions.map((action, index) => ({
      id: `drop-${index + 1}`,
      actor,
      schemaId: CRUSH_WOOD_ACTION_SCHEMA_ID,
      action: { ...action },
    })),
    interactions: actions.map((_, index) => ({
      id: `interaction-drop-${index + 1}`,
      modality: actor === 'human' ? 'pointer' as const : 'system' as const,
      startFrame: index * 74,
      endFrame: index * 74 + 1,
      committedActionId: `drop-${index + 1}`,
    })),
  };
}
