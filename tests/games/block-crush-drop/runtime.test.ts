import { describe, expect, it } from 'vitest';
import { CRUSH_WOOD_REFERENCE_ACTIONS, createCrushWoodReferenceConfig } from '../../../src/games/block-crush-drop/levels';
import { crushWoodRuntime, hashCrushWoodState } from '../../../src/games/block-crush-drop/runtime';

const EXPECTED_CLEARS = [2, 1, 1, 1, 1, 0, 1, 1, 1];

describe('Crush Wood runtime', () => {
  it('replays the calibrated 21x34 reference level through drop, clear, and collapse', () => {
    const config = createCrushWoodReferenceConfig();
    let state = crushWoodRuntime.createInitialState(config, 29_980);
    expect(state.board).toHaveLength(34);
    expect(state.board[0]).toHaveLength(21);
    expect(crushWoodRuntime.listLegalActions?.(state)).toContainEqual(CRUSH_WOOD_REFERENCE_ACTIONS[0]);

    const clears: number[] = [];
    for (const [index, action] of CRUSH_WOOD_REFERENCE_ACTIONS.entries()) {
      const resolution = crushWoodRuntime.resolve(state, action, { seed: 29_980, stepIndex: index });
      clears.push(resolution.clearedRows.length);
      expect(resolution.after.board).toHaveLength(34);
      expect(resolution.after.board.every((row) => row.length === 21)).toBe(true);
      if (resolution.clearedRows.length > 0) {
        expect(resolution.clearedCells).toHaveLength(resolution.clearedRows.length * 21);
      }
      state = crushWoodRuntime.stateAfter(resolution);
    }

    expect(clears).toEqual(EXPECTED_CLEARS);
    expect(state.linesCleared).toBe(9);
    expect(state.score).toBe(900);
    expect(state.status).toBe('won');
  });

  it('is deterministic for the same config, seed, and semantic action stream', () => {
    const config = createCrushWoodReferenceConfig('deep-mahogany');
    const play = (): string => {
      let state = crushWoodRuntime.createInitialState(config, 12_604);
      for (const [index, action] of CRUSH_WOOD_REFERENCE_ACTIONS.entries()) {
        state = crushWoodRuntime.stateAfter(crushWoodRuntime.resolve(state, action, { seed: 12_604, stepIndex: index }));
      }
      return hashCrushWoodState(state);
    };
    expect(play()).toBe(play());
  });

  it('rejects a piece that does not match the authored queue', () => {
    const state = crushWoodRuntime.createInitialState(createCrushWoodReferenceConfig(), 1);
    expect(() => crushWoodRuntime.resolve(
      state,
      { pieceId: 'I4', column: 0, rotation: 0 },
      { seed: 1, stepIndex: 0 },
    )).toThrow(/Expected queue piece J4/u);
  });
});
