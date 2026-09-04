import { createEmptyBoard } from '../../domain/boardPresets';
import { applyPlacement, createGame, createPieceSet, listLegalMoves } from '../../domain/gameEngine';
import type { GameSnapshot, GameTransition, PlacementAction } from '../../domain/types';
import type { GameRuntime } from '../../game-runtime/contracts';
import { GameRuntimeError } from '../../game-runtime/errors';
import { stableHash } from '../../headless/stableHash';
import type { BlockPlacementConfig } from './schemas';

export function hashBlockPlacementState(state: GameSnapshot): string {
  return stableHash({
    board: state.board,
    pieces: state.pieces,
    seed: state.seed,
    setIndex: state.setIndex,
    turn: state.turn,
    score: state.score,
    combo: state.combo,
    status: state.status,
  });
}

function legalActionFromMove(pieceId: string, row: number, col: number): PlacementAction {
  return {
    id: `probe-${pieceId}-${row}-${col}`,
    actor: 'agent',
    pieceId,
    anchor: { row, col },
    durationFrames: 16,
    pointerPath: [],
  };
}

export const blockPlacementLegacyRuntime: GameRuntime<
  BlockPlacementConfig,
  GameSnapshot,
  PlacementAction,
  GameTransition
> = {
  createInitialState(config, seed) {
    const board = config.board ?? createEmptyBoard();
    const pieces = config.pieces ?? createPieceSet(seed, 0);
    return createGame(board, seed, pieces);
  },
  hashState: hashBlockPlacementState,
  listLegalActions(state) {
    return listLegalMoves(state).map((move) => legalActionFromMove(move.pieceId, move.anchor.row, move.anchor.col));
  },
  resolve(state, action) {
    const transition = applyPlacement(state, action);
    if (!transition) {
      throw new GameRuntimeError(
        'ILLEGAL_ACTION',
        `Placement ${action.id} is not legal in the current state.`,
        { details: { actionId: action.id, pieceId: action.pieceId, anchor: action.anchor } },
      );
    }
    return transition;
  },
  stateAfter(resolution) {
    return resolution.after;
  },
};
