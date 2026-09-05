import type { GameRuntime } from '../../game-runtime/contracts';
import { GameRuntimeError } from '../../game-runtime/errors';
import { stableHash } from '../../headless/stableHash';
import { crushWoodShape, crushWoodShapeSize, uniqueCrushWoodRotations } from './shapes';
import type {
  CrushWoodAction,
  CrushWoodBoard,
  CrushWoodConfig,
  CrushWoodPoint,
  CrushWoodResolution,
  CrushWoodState,
} from './types';

export function cloneCrushWoodBoard(board: CrushWoodBoard): CrushWoodBoard {
  return board.map((row) => [...row]);
}

function boardFromRows(config: CrushWoodConfig): CrushWoodBoard {
  return config.initialRows.map((row, rowIndex) => [...row].map((cell, colIndex) => (
    cell === '#' ? `level-${rowIndex}-${colIndex}` : null
  )));
}

export function hashCrushWoodState(state: CrushWoodState): string {
  return stableHash(state);
}

function fits(
  board: CrushWoodBoard,
  shape: readonly CrushWoodPoint[],
  row: number,
  column: number,
): boolean {
  const rows = board.length;
  const columns = board[0]?.length ?? 0;
  for (const offset of shape) {
    const targetRow = row + offset.row;
    const targetColumn = column + offset.col;
    if (targetColumn < 0 || targetColumn >= columns || targetRow >= rows) return false;
    if (targetRow >= 0 && board[targetRow]?.[targetColumn] !== null) return false;
  }
  return true;
}

export function findCrushWoodLandingRow(
  board: CrushWoodBoard,
  shape: readonly CrushWoodPoint[],
  column: number,
): number | null {
  const { height, width } = crushWoodShapeSize(shape);
  const columns = board[0]?.length ?? 0;
  if (column < 0 || column + width > columns) return null;
  let row = -height;
  if (!fits(board, shape, row, column)) return null;
  while (fits(board, shape, row + 1, column)) row += 1;
  return shape.some((offset) => row + offset.row < 0) ? null : row;
}

function fullRows(board: CrushWoodBoard): number[] {
  return board.flatMap((row, rowIndex) => row.every((cell) => cell !== null) ? [rowIndex] : []);
}

function collapseBoard(
  placedBoard: CrushWoodBoard,
  clearedRows: readonly number[],
): { board: CrushWoodBoard; moves: CrushWoodResolution['collapseMoves'] } {
  if (clearedRows.length === 0) return { board: cloneCrushWoodBoard(placedBoard), moves: [] };
  const cleared = new Set(clearedRows);
  const columns = placedBoard[0]?.length ?? 0;
  const kept = placedBoard.filter((_, rowIndex) => !cleared.has(rowIndex)).map((row) => [...row]);
  const board = Array.from({ length: clearedRows.length }, () => Array.from({ length: columns }, () => null as string | null));
  board.push(...kept);

  const moves: CrushWoodResolution['collapseMoves'] = [];
  for (const [fromRow, row] of placedBoard.entries()) {
    if (cleared.has(fromRow)) continue;
    const shift = clearedRows.filter((clearedRow) => clearedRow > fromRow).length;
    if (shift === 0) continue;
    for (const [col, cellId] of row.entries()) {
      if (cellId !== null) {
        moves.push({
          cellId,
          from: { row: fromRow, col },
          to: { row: fromRow + shift, col },
        });
      }
    }
  }
  return { board, moves };
}

export function currentCrushWoodPiece(state: CrushWoodState): CrushWoodState['queue'][number] {
  if (state.queue.length === 0) throw new GameRuntimeError('EMPTY_QUEUE', 'Crush Wood queue must contain at least one piece.');
  const piece = state.queue[state.queueIndex % state.queue.length];
  if (!piece) throw new GameRuntimeError('EMPTY_QUEUE', 'Crush Wood queue must contain at least one piece.');
  return piece;
}

export function legalCrushWoodActions(state: CrushWoodState): CrushWoodAction[] {
  if (state.status !== 'playing') return [];
  const pieceId = currentCrushWoodPiece(state);
  const actions: CrushWoodAction[] = [];
  for (const rotation of uniqueCrushWoodRotations(pieceId)) {
    const shape = crushWoodShape(pieceId, rotation);
    const { width } = crushWoodShapeSize(shape);
    for (let column = 0; column <= state.columns - width; column += 1) {
      if (findCrushWoodLandingRow(state.board, shape, column) !== null) {
        actions.push({ pieceId, column, rotation });
      }
    }
  }
  return actions;
}

function assertActionMatchesQueue(state: CrushWoodState, action: CrushWoodAction): void {
  const expected = currentCrushWoodPiece(state);
  if (action.pieceId !== expected) {
    throw new GameRuntimeError(
      'PIECE_QUEUE_MISMATCH',
      `Expected queue piece ${expected}, received ${action.pieceId}.`,
      { path: '$.pieceId', details: action },
    );
  }
}

export const crushWoodRuntime: GameRuntime<
  CrushWoodConfig,
  CrushWoodState,
  CrushWoodAction,
  CrushWoodResolution
> = {
  createInitialState(config, seed) {
    void seed;
    return {
      levelId: config.levelId,
      columns: config.columns,
      rows: config.rows,
      board: boardFromRows(config),
      queue: [...config.queue],
      queueIndex: 0,
      score: config.startingScore,
      targetScore: config.targetScore,
      scorePerLine: config.scorePerLine,
      linesCleared: 0,
      combo: 0,
      turn: 0,
      remainingTimeMs: config.startingTimeMs,
      moveTimeMs: config.moveTimeMs,
      skinId: config.skinId,
      status: 'playing',
    };
  },
  hashState: hashCrushWoodState,
  listLegalActions: legalCrushWoodActions,
  resolve(state, action) {
    if (state.status !== 'playing') {
      throw new GameRuntimeError('ILLEGAL_ACTION', `Cannot drop a piece while game status is ${state.status}.`, {
        details: action,
      });
    }
    assertActionMatchesQueue(state, action);
    const shape = crushWoodShape(action.pieceId, action.rotation);
    const landingRow = findCrushWoodLandingRow(state.board, shape, action.column);
    if (landingRow === null) {
      throw new GameRuntimeError('ILLEGAL_ACTION', 'Piece cannot land at the requested column and rotation.', {
        path: '$.column',
        details: action,
      });
    }

    const placedBoard = cloneCrushWoodBoard(state.board);
    const placedCells = shape.map((offset) => ({
      row: landingRow + offset.row,
      col: action.column + offset.col,
    }));
    placedCells.forEach((cell, index) => {
      const row = placedBoard[cell.row];
      if (!row) throw new GameRuntimeError('BOARD_BOUNDS', `Missing board row ${cell.row}.`);
      row[cell.col] = `turn-${state.turn}-${action.pieceId}-${index}`;
    });

    const clearedRows = fullRows(placedBoard);
    const clearedCells = clearedRows.flatMap((rowIndex) => (
      placedBoard[rowIndex]?.flatMap((cellId, col) => cellId === null ? [] : [{ row: rowIndex, col, cellId }]) ?? []
    ));
    const collapsed = collapseBoard(placedBoard, clearedRows);
    const scoreDelta = clearedRows.length * state.scorePerLine;
    const score = state.score + scoreDelta;
    const remainingTimeMs = Math.max(0, state.remainingTimeMs - state.moveTimeMs);
    const queueIndex = state.queueIndex + 1;
    const provisional: CrushWoodState = {
      ...state,
      board: collapsed.board,
      queueIndex,
      score,
      linesCleared: state.linesCleared + clearedRows.length,
      combo: clearedRows.length > 0 ? state.combo + 1 : 0,
      turn: state.turn + 1,
      remainingTimeMs,
      status: score >= state.targetScore ? 'won' : remainingTimeMs === 0 ? 'game-over' : 'playing',
    };
    const after = provisional.status === 'playing' && legalCrushWoodActions(provisional).length === 0
      ? { ...provisional, status: 'game-over' as const }
      : provisional;

    return {
      before: state,
      after,
      action,
      shape,
      spawnRow: -crushWoodShapeSize(shape).height,
      landingRow,
      placedCells,
      placedBoard,
      clearedRows,
      clearedCells,
      collapseMoves: collapsed.moves,
      scoreDelta,
    };
  },
  stateAfter(resolution) {
    return resolution.after;
  },
};
