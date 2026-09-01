import { describe, expect, it } from 'vitest';
import { compileTake, evaluateCompiledTake } from '../src/director/presentationCompiler';
import { RHYTHM_PRESETS } from '../src/director/rhythmPresets';
import { createEmptyBoard } from '../src/domain/boardPresets';
import { createGame, createPieceSet } from '../src/domain/gameEngine';
import type { Take } from '../src/domain/types';

describe('presentation compiler', () => {
  it('compiles a semantic take into deterministic frames', () => {
    const pieces = createPieceSet(2, 0, ['single', 'single', 'single']);
    const initial = createGame(createEmptyBoard(), 2, pieces);
    const take: Take = {
      id: 'take-test',
      name: 'test',
      createdAt: '2026-09-01T00:00:00.000Z',
      initial,
      actions: [{
        id: 'a1', actor: 'human', pieceId: pieces[0]!.id,
        anchor: { row: 2, col: 3 }, durationFrames: 18, pointerPath: [],
      }],
    };
    const compiled = compileTake(take, RHYTHM_PRESETS['tight-fast'], 30);
    expect(compiled.totalFrames).toBeGreaterThan(60);
    const during = evaluateCompiledTake(compiled, compiled.actions[0]!.startFrame + 2, RHYTHM_PRESETS['tight-fast']);
    expect(during.draggedPiece?.piece.id).toBe(pieces[0]!.id);
    const final = evaluateCompiledTake(compiled, compiled.totalFrames - 1, RHYTHM_PRESETS['tight-fast']);
    expect(final.snapshot.turn).toBe(1);
    expect(final.totalFrames).toBe(compiled.totalFrames);
  });

  it('advances to later actions after a placement that clears no line', () => {
    const pieces = createPieceSet(11, 0, ['single', 'single', 'single']);
    const initial = createGame(createEmptyBoard(), 11, pieces);
    const take: Take = {
      id: 'take-sequential',
      name: 'sequential',
      createdAt: '2026-09-01T00:00:00.000Z',
      initial,
      actions: [
        {
          id: 'a1', actor: 'human', pieceId: pieces[0]!.id,
          anchor: { row: 0, col: 0 }, durationFrames: 18, pointerPath: [],
        },
        {
          id: 'a2', actor: 'human', pieceId: pieces[1]!.id,
          anchor: { row: 0, col: 1 }, durationFrames: 18, pointerPath: [],
        },
      ],
    };
    const rhythm = RHYTHM_PRESETS['human-natural'];
    const compiled = compileTake(take, rhythm, 30);
    const second = compiled.actions[1]!;
    const duringSecond = evaluateCompiledTake(compiled, second.startFrame + 2, rhythm);
    expect(duringSecond.draggedPiece?.piece.id).toBe(pieces[1]!.id);
    expect(evaluateCompiledTake(compiled, compiled.totalFrames - 1, rhythm).snapshot.turn).toBe(2);
  });

  it('reserves the configured camera recovery interval after a clear', () => {
    const pieces = createPieceSet(8, 0, ['single', 'tri-h', 'square-2']);
    const initial = createGame(
      // This fixture becomes one full row and one full column after the single placement.
      // It exercises the cinematic hold rather than only the no-clear path.
      (() => {
        const board = createEmptyBoard();
        for (let col = 0; col < 8; col += 1) if (col !== 4) board.cells[5]![col] = 'blue';
        for (let row = 0; row < 8; row += 1) if (row !== 5) board.cells[row]![4] = 'cyan';
        return board;
      })(),
      8,
      pieces,
    );
    const take: Take = {
      id: 'take-clear-recovery',
      name: 'clear recovery',
      createdAt: '2026-09-01T00:00:00.000Z',
      initial,
      actions: [{
        id: 'a1', actor: 'human', pieceId: pieces[0]!.id,
        anchor: { row: 5, col: 4 }, durationFrames: 16, pointerPath: [],
      }],
    };
    const rhythm = RHYTHM_PRESETS['tight-fast'];
    const compiled = compileTake(take, rhythm, 30);
    const action = compiled.actions[0]!;
    expect(action.endFrame).toBeGreaterThan(action.clearEndFrame);
    expect(action.endFrame - action.clearEndFrame).toBe(
      Math.max(1, Math.round(rhythm.cameraRecoveryFrames / rhythm.globalSpeed)),
    );
  });
});
