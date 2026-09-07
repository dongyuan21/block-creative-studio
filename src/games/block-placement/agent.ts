import {
  completeAgentRun,
  createEmptyGameReplay,
  GAME_REPLAY_CONTRACT,
  GAME_REPLAY_CONTRACT_VERSION,
  splitPointerPlacement,
  type GameAgentAdapter,
  type GameAgentRunRequest,
  type GameAgentRunStatus,
  type GameReplayEnvelope,
} from '../../game-runtime';
import { GameRuntimeError } from '../../game-runtime/errors';
import { blockPlacementDefinition } from './definition';
import { hashBlockPlacementState } from './legacyRuntime';
import {
  BLOCK_PLACEMENT_GAME_ID,
  BLOCK_PLACEMENT_MODULE_VERSION,
  BLOCK_PLACEMENT_SEMANTIC_ACTION_SCHEMA_ID,
} from './manifest';
import { makeAgentTake } from './runtime/gameEngine';
import {
  defaultBlockPlacementConfig,
  parseBlockPlacementConfig,
  type BlockPlacementConfig,
} from './schemas';

const PLACEMENT_AGENT_PROFILES = ['greedy'] as const;

function replayFromPlacementTake(
  take: ReturnType<typeof makeAgentTake>,
  seed: number,
  initialStateHash: string,
): GameReplayEnvelope {
  const split = take.actions.map((action) => splitPointerPlacement({
    ...action,
    actionSchemaId: BLOCK_PLACEMENT_SEMANTIC_ACTION_SCHEMA_ID,
  }));
  return {
    contract: GAME_REPLAY_CONTRACT,
    contractVersion: GAME_REPLAY_CONTRACT_VERSION,
    gameId: BLOCK_PLACEMENT_GAME_ID,
    moduleVersion: BLOCK_PLACEMENT_MODULE_VERSION,
    takeId: take.id,
    initialStateHash,
    seed,
    actions: split.map((item) => item.semantic),
    interactions: split.map((item) => item.interaction),
  };
}

function terminalStatus(
  actionCount: number,
  status: ReturnType<typeof blockPlacementDefinition.runtime.createInitialState>['status'],
): Exclude<GameAgentRunStatus, 'failed'> {
  if (actionCount === 0) return 'empty';
  return status === 'game-over' ? 'solved' : 'partial';
}

export const blockPlacementAgent: GameAgentAdapter = {
  gameId: BLOCK_PLACEMENT_GAME_ID,
  profiles: PLACEMENT_AGENT_PROFILES,
  defaultConfig: () => defaultBlockPlacementConfig(),
  run(request: GameAgentRunRequest) {
    if (request.profile !== undefined && request.profile !== 'greedy') {
      throw new GameRuntimeError(
        'UNKNOWN_PROFILE',
        `Block Placement agent profile ${request.profile} is not registered.`,
        { details: { profile: request.profile, profiles: PLACEMENT_AGENT_PROFILES } },
      );
    }
    let config: BlockPlacementConfig;
    try {
      config = parseBlockPlacementConfig(request.config ?? defaultBlockPlacementConfig());
    } catch (error) {
      const replay = createEmptyGameReplay({
        gameId: BLOCK_PLACEMENT_GAME_ID,
        moduleVersion: BLOCK_PLACEMENT_MODULE_VERSION,
        seed: request.seed,
        initialStateHash: 'invalid-config',
      });
      return completeAgentRun(
        blockPlacementDefinition,
        request.config ?? defaultBlockPlacementConfig(),
        replay,
        'failed',
        { diagnostic: error instanceof Error ? error.message : 'Config failed to parse.' },
      );
    }
    const initial = blockPlacementDefinition.runtime.createInitialState(config, request.seed);
    const initialStateHash = hashBlockPlacementState(initial);
    const take = makeAgentTake(initial, request.maxMoves ?? 12);
    const replay = replayFromPlacementTake(take, request.seed, initialStateHash);
    let state = initial;
    for (const [stepIndex, action] of take.actions.entries()) {
      state = blockPlacementDefinition.runtime.stateAfter(
        blockPlacementDefinition.runtime.resolve(
          state,
          { pieceId: action.pieceId, anchor: action.anchor },
          { seed: request.seed, stepIndex },
        ),
      );
    }
    return completeAgentRun(
      blockPlacementDefinition,
      config,
      replay,
      terminalStatus(take.actions.length, state.status),
      { metrics: { actionCount: take.actions.length, status: state.status } },
    );
  },
};
