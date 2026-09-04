import type { GameRuntime } from '../../game-runtime/contracts';
import { GameRuntimeError } from '../../game-runtime/errors';
import {
  applyTapAction,
  compileTapTileLevel,
  createInitialTapTileGameState,
  playableTapTileIds,
  tapTileStateHash,
} from './gameplay';
import { tapTileProjectFromConfig, type TapTileConfig } from './project/config';
import type {
  TapTileRuntimeAction,
  TapTileRuntimeResolution,
  TapTileRuntimeState,
} from './types';

export function compileTapTileConfig(config: TapTileConfig) {
  const project = tapTileProjectFromConfig(config, { id: 'runtime', name: 'runtime' });
  const level = compileTapTileLevel(project);
  const errors = level.validation.issues.filter((issue) => issue.severity === 'error');
  if (errors.length > 0) {
    throw new GameRuntimeError(
      'INVALID_CONFIG',
      `TapTile project cannot compile: ${errors.map((issue) => `${issue.code}: ${issue.message}`).join('; ')}`,
      { details: errors },
    );
  }
  return level;
}

export function hashTapTileRuntimeState(state: TapTileRuntimeState): string {
  return `${state.seed}:${state.level.levelHash}:${tapTileStateHash(state.game)}`;
}

export const tapTileTrayMatch3Runtime: GameRuntime<
  TapTileConfig,
  TapTileRuntimeState,
  TapTileRuntimeAction,
  TapTileRuntimeResolution
> = {
  createInitialState(config, seed) {
    const normalized = structuredClone(config);
    const level = compileTapTileConfig(normalized);
    return {
      seed,
      config: normalized,
      level,
      game: createInitialTapTileGameState(level),
    };
  },
  hashState: hashTapTileRuntimeState,
  listLegalActions(state) {
    if (state.game.status !== 'playing') return [];
    return playableTapTileIds(state.level, state.game).map((tileId) => ({ tileId }));
  },
  resolve(state, action, context) {
    const transition = applyTapAction(state.level, state.game, {
      id: `runtime-${context.stepIndex}-${action.tileId}`,
      type: 'tap',
      actor: 'agent',
      tileId: action.tileId,
    });
    if (!transition.accepted) {
      throw new GameRuntimeError(
        'ILLEGAL_ACTION',
        `TapTile ${action.tileId} is not legal: ${transition.rejectReason ?? 'unknown'}.`,
        {
          details: {
            tileId: action.tileId,
            rejectReason: transition.rejectReason,
            blockerIds: transition.blockerIds ?? [],
            seed: context.seed,
          },
        },
      );
    }
    return {
      seed: state.seed,
      config: state.config,
      level: state.level,
      transition,
    };
  },
  stateAfter(resolution) {
    return {
      seed: resolution.seed,
      config: resolution.config,
      level: resolution.level,
      game: resolution.transition.after,
    };
  },
};
