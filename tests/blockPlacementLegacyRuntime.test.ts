import { describe, expect, it } from 'vitest';
import { createDefaultGameRegistry } from '../src/bootstrap/gameRegistry';
import { createEmptyBoard } from '../src/domain/boardPresets';
import {
  applyPlacement,
  chooseGreedyMove,
  createGame,
  createPieceSet,
  listLegalMoves,
} from '../src/domain/gameEngine';
import {
  consecutiveTake,
  crossClearTake,
  idleSnapshot,
  singleClearTake,
} from '../src/domain/publicFixtures';
import type { GameSnapshot, GameTransition, PlacementAction } from '../src/domain/types';
import { GameRuntimeError, GameSchemaError } from '../src/game-runtime/errors';
import { hashBlockPlacementState } from '../src/games/block-placement/legacyRuntime';
import {
  BLOCK_PLACEMENT_ACTION_SCHEMA_ID,
  BLOCK_PLACEMENT_GAME_ID,
  BLOCK_PLACEMENT_MODULE_VERSION,
  BLOCK_PLACEMENT_SEMANTIC_ACTION_SCHEMA_ID,
} from '../src/games/block-placement/manifest';
import {
  parseBlockPlacementAction,
  parseBlockPlacementState,
  type BlockPlacementConfig,
  type BlockPlacementSemanticAction,
} from '../src/games/block-placement/schemas';

function placement(pieceId: string, row: number, col: number): PlacementAction {
  return {
    id: `place-${pieceId}-${row}-${col}`,
    actor: 'human',
    pieceId,
    anchor: { row, col },
    durationFrames: 16,
    pointerPath: [],
  };
}

function semantic(pieceId: string, row: number, col: number): BlockPlacementSemanticAction {
  return { pieceId, anchor: { row, col } };
}

describe('block placement legacy runtime', () => {
  const registry = createDefaultGameRegistry();
  const definition = registry.get<
    BlockPlacementConfig,
    GameSnapshot,
    BlockPlacementSemanticAction,
    GameTransition
  >(BLOCK_PLACEMENT_GAME_ID, BLOCK_PLACEMENT_MODULE_VERSION);
  const runtime = definition.runtime;

  it('registers the semantic action schema as GameDefinition.schemas.action', () => {
    expect(definition.schemas.action.id).toBe(BLOCK_PLACEMENT_SEMANTIC_ACTION_SCHEMA_ID);
    expect(definition.schemas.replayAction?.id).toBe(BLOCK_PLACEMENT_ACTION_SCHEMA_ID);
    expect(registry.schemas.has(BLOCK_PLACEMENT_SEMANTIC_ACTION_SCHEMA_ID, '1.0.0')).toBe(true);
    expect(registry.schemas.has(BLOCK_PLACEMENT_ACTION_SCHEMA_ID, '1.0.0')).toBe(true);
  });

  it('rejects illegal state and action payloads instead of filling defaults', () => {
    const snapshot = idleSnapshot();
    expect(() => definition.schemas.state.parse({ ...snapshot, seed: undefined })).toThrowError(GameSchemaError);
    expect(() => definition.schemas.state.parse({ ...snapshot, combo: undefined })).toThrowError(GameSchemaError);
    expect(() => parseBlockPlacementState({ ...snapshot, board: { rows: 6, cols: 6, cells: [] } })).toThrowError(
      /must be a finite number between 8 and 8/,
    );
    const action = singleClearTake().actions[0];
    expect(action).toBeDefined();
    if (!action) throw new Error('missing fixture action');
    const { pointerPath, durationFrames, pieceId, ...actionWithoutPiece } = action;
    void pointerPath;
    void durationFrames;
    void pieceId;
    expect(() => definition.schemas.action.parse(actionWithoutPiece)).toThrowError(/is required/);
    const { durationFrames: _duration, ...withoutDuration } = action;
    const { pointerPath: _path, ...withoutPath } = action;
    void _duration;
    void _path;
    expect(() => parseBlockPlacementAction(withoutDuration)).toThrowError(/durationFrames/);
    expect(() => parseBlockPlacementAction(withoutPath)).toThrowError(/pointerPath/);
  });

  it('matches applyPlacement on public fixture takes', () => {
    for (const take of [singleClearTake(), crossClearTake(), consecutiveTake()]) {
      let cursor = definition.schemas.state.parse(take.initial);
      expect(runtime.hashState(cursor)).toBe(hashBlockPlacementState(take.initial));
      for (const [stepIndex, rawAction] of take.actions.entries()) {
        const action = definition.schemas.action.parse({ pieceId: rawAction.pieceId, anchor: rawAction.anchor });
        const adapted = runtime.resolve(cursor, action, { seed: cursor.seed, stepIndex });
        const direct = applyPlacement(cursor, rawAction);
        expect(direct).not.toBeNull();
        expect(adapted.after).toEqual(direct!.after);
        expect(adapted.clear).toEqual(direct!.clear);
        cursor = runtime.stateAfter(adapted);
        expect(cursor).toEqual(direct!.after);
      }
    }
  });

  it('lists the same legal placements as listLegalMoves', () => {
    const snapshot = idleSnapshot();
    const adapted = runtime.listLegalActions?.(snapshot) ?? [];
    const direct = listLegalMoves(snapshot);
    expect(adapted.map((item) => `${item.pieceId}:${item.anchor.row},${item.anchor.col}`)).toEqual(
      direct.map((item) => `${item.pieceId}:${item.anchor.row},${item.anchor.col}`),
    );
    expect(adapted.every((item) => !('durationFrames' in item) && !('pointerPath' in item))).toBe(true);
  });

  it('throws on an illegal placement instead of returning null', () => {
    const pieces = createPieceSet(1, 0, ['square-2', 'single', 'tri-h']);
    const game = runtime.createInitialState({ board: createEmptyBoard(), pieces }, 1);
    const first = applyPlacement(game, placement(pieces[0]!.id, 0, 0));
    expect(first).not.toBeNull();
    expect(() => runtime.resolve(first!.after, semantic(pieces[1]!.id, 0, 0), { seed: 1, stepIndex: 1 }))
      .toThrowError(GameRuntimeError);
    expect(applyPlacement(first!.after, placement(pieces[1]!.id, 0, 0))).toBeNull();
  });

  it('keeps a complete state hash over board, pieces, seed, setIndex, turn, score, combo, and status', () => {
    const base = createGame(createEmptyBoard(), 21, createPieceSet(21, 0, ['single', 'domino-h', 'tri-v']));
    const hash = runtime.hashState(base);
    const variants: GameSnapshot[] = [
      { ...base, seed: base.seed + 1 },
      { ...base, setIndex: base.setIndex + 1 },
      { ...base, turn: base.turn + 1 },
      { ...base, score: base.score + 1 },
      { ...base, combo: base.combo + 1 },
      { ...base, status: 'game-over' },
      { ...base, pieces: base.pieces.map((piece, index) => (index === 0 ? { ...piece, used: true } : piece)) },
    ];
    expect(new Set([hash, ...variants.map((item) => runtime.hashState(item))]).size).toBe(variants.length + 1);
    const occupied = createEmptyBoard();
    occupied.cells[0]![0] = 'coral';
    expect(runtime.hashState({ ...base, board: occupied })).not.toBe(hash);
  });

  it('stays in lockstep with the existing 12-seed greedy replay', () => {
    for (let seed = 0; seed < 12; seed += 1) {
      const initial = runtime.createInitialState({ pieces: createPieceSet(seed, 0) }, seed);
      expect(initial).toEqual(createGame(createEmptyBoard(), seed, createPieceSet(seed, 0)));
      let adapted = initial;
      let direct = initial;
      for (let step = 0; step < 18 && adapted.status === 'playing'; step += 1) {
        const move = chooseGreedyMove(adapted);
        if (!move) break;
        const action = placement(move.pieceId, move.anchor.row, move.anchor.col);
        action.id = `fuzz-${seed}-${step}`;
        const resolved = runtime.resolve(adapted, semantic(move.pieceId, move.anchor.row, move.anchor.col), {
          seed,
          stepIndex: step,
        });
        const applied = applyPlacement(direct, action);
        expect(applied).not.toBeNull();
        expect(resolved.after).toEqual(applied!.after);
        adapted = runtime.stateAfter(resolved);
        direct = applied!.after;
        expect(runtime.hashState(adapted)).toBe(hashBlockPlacementState(direct));
      }
    }
  });
});
