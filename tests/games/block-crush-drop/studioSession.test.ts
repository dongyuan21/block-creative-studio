import { describe, expect, it } from 'vitest';
import { createCrushWoodAgentReplay, createCrushWoodReplay } from '../../../src/games/block-crush-drop/agent';
import {
  createCrushWoodReferenceConfig,
  crushWoodRowsForPreset,
  matchCrushWoodBoardPreset,
  setCrushWoodCell,
  toggleCrushWoodCell,
} from '../../../src/games/block-crush-drop/levels';
import { liveCrushWoodPacket } from '../../../src/games/block-crush-drop/presentation';
import { compileCrushWoodTake, createCrushWoodDocument } from '../../../src/games/block-crush-drop/project';
import { crushWoodRuntime, hashCrushWoodState } from '../../../src/games/block-crush-drop/runtime';

describe('Crush Wood studio session helpers', () => {
  it('toggles occupancy cells and recognizes board presets', () => {
    const empty = crushWoodRowsForPreset('empty');
    expect(matchCrushWoodBoardPreset(empty)).toBe('empty');
    const painted = toggleCrushWoodCell(empty, 10, 4);
    expect(painted[10]?.[4]).toBe('#');
    expect(matchCrushWoodBoardPreset(painted)).toBeNull();
    expect(matchCrushWoodBoardPreset(crushWoodRowsForPreset('reference'))).toBe('reference');
    expect(matchCrushWoodBoardPreset(crushWoodRowsForPreset('corridor'))).toBe('corridor');
    const filled = setCrushWoodCell(empty, 8, 3, '#');
    expect(filled[8]?.[3]).toBe('#');
    expect(setCrushWoodCell(filled, 8, 3, '#')).toBe(filled);
    expect(setCrushWoodCell(filled, 8, 3, '.')[8]?.[3]).toBe('.');
  });

  it('keeps an empty take list empty instead of injecting the reference replay', () => {
    const config = createCrushWoodReferenceConfig();
    const document = createCrushWoodDocument(config, { takes: [] });
    expect(document.takes).toEqual([]);
    expect(() => compileCrushWoodTake(document, undefined)).toThrow(/no take/u);
  });

  it('preserves authored take seeds and assigns unique agent take ids', () => {
    const config = createCrushWoodReferenceConfig('classic-maple');
    const first = createCrushWoodAgentReplay(config, 12, 8);
    const second = createCrushWoodAgentReplay(config, 12, 8);
    expect(first.takeId).not.toBe(second.takeId);
    expect(first.actions.every((action) => action.actor === 'agent')).toBe(true);
    const document = createCrushWoodDocument(config, { seed: 99, takes: [first] });
    expect(document.takes[0]?.seed).toBe(12);
    expect(document.takes[0]?.initialStateHash).toBe(
      hashCrushWoodState(crushWoodRuntime.createInitialState(config, 99)),
    );
  });

  it('builds a live edit packet without compiling a director take', () => {
    const state = crushWoodRuntime.createInitialState(createCrushWoodReferenceConfig(), 29_980);
    const packet = liveCrushWoodPacket(state, { phase: 'idle' });
    expect(packet.identity.takeId).toBe('live');
    expect(packet.payload).toMatchObject({
      phase: 'idle',
      score: 0,
      activePiece: null,
      status: 'playing',
    });
  });

  it('records a human replay envelope and compiles it through the Crush director', () => {
    const config = createCrushWoodReferenceConfig();
    const initial = crushWoodRuntime.createInitialState(config, 29_980);
    const replay = createCrushWoodReplay(
      hashCrushWoodState(initial),
      29_980,
      [{ pieceId: 'J4', column: 7, rotation: 3 }],
      'human',
      'human-test',
    );
    expect(replay.actions[0]?.actor).toBe('human');
    const compiled = compileCrushWoodTake(createCrushWoodDocument(config, { takes: [replay] }), replay.takeId);
    expect(compiled.tracks).toHaveLength(1);
    expect(compiled.tracks[0]?.pieceId).toBe('J4');
  });

  it('runs a deterministic agent take that compiles through the Crush director', () => {
    const config = createCrushWoodReferenceConfig('classic-maple');
    const replay = createCrushWoodAgentReplay(config, 29_980, 12);
    expect(replay.actions.length).toBeGreaterThan(0);
    const document = createCrushWoodDocument(config, { seed: 29_980, takes: [replay] });
    const compiled = compileCrushWoodTake(document, replay.takeId);
    expect(compiled.tracks).toHaveLength(replay.actions.length);
    const last = crushWoodRuntime.createInitialState(config, 29_980);
    expect(compiled.frameSource.totalFrames).toBeGreaterThan(compiled.tracks[0]!.endFrame);
    expect(last.queue[0]).toBe('J4');
  });
});

