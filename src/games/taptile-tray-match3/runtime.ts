import type { GameRuntime } from '../../game-runtime/contracts';
import { GameRuntimeError } from '../../game-runtime/errors';
import {
  applyTapAction,
  compileTapTileLevel,
  createInitialTapTileGameState,
  playableTapTileIds,
  tapTileStateHash,
} from '../../taptile/gameplay';
import type {
  TapTileRuntimeAction,
  TapTileRuntimeResolution,
  TapTileRuntimeState,
} from './types';
import type { TapTileProjectV2 } from '../../taptile/project';

function compileProject(project: TapTileProjectV2) {
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

export const tapTileTrayMatch3Runtime: GameRuntime<
  TapTileProjectV2,
  TapTileRuntimeState,
  TapTileRuntimeAction,
  TapTileRuntimeResolution
> = {
  createInitialState(config) {
    const project = structuredClone(config);
    const level = compileProject(project);
    return {
      project,
      level,
      game: createInitialTapTileGameState(level),
    };
  },
  hashState(state) {
    return `${state.level.levelHash}:${tapTileStateHash(state.game)}`;
  },
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
          },
        },
      );
    }
    return {
      project: state.project,
      level: state.level,
      transition,
    };
  },
  stateAfter(resolution) {
    return {
      project: resolution.project,
      level: resolution.level,
      game: resolution.transition.after,
    };
  },
};
