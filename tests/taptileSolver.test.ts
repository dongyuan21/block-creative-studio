import { describe, expect, it } from 'vitest';
import {
  compileTapTileLevel,
  replayTapTileTake,
  solveTapTileLevel,
  solveTapTileTake,
  type TapTileScenarioProfileId,
} from '../src/taptile/gameplay';
import type { CompiledTapTileLevel } from '../src/taptile/project';
import { createDefaultTapTileProject } from '../src/taptile/project';

function flatLevel(groupCount: number, copies = 3): CompiledTapTileLevel {
  const ids: string[] = [];
  const tiles: CompiledTapTileLevel['tiles'] = {};
  for (let group = 0; group < groupCount; group += 1) {
    for (let copy = 0; copy < copies; copy += 1) {
      const id = `g${group + 1}-${copy + 1}`;
      ids.push(id);
      tiles[id] = {
        id,
        archetypeId: `face-${group + 1}`,
        matchKey: `match-${group + 1}`,
        geometry: {
          centerXPx: 100 + group * 20,
          centerYPx: 100 + copy * 20,
          widthPx: 96,
          heightPx: 120,
          rotationDeg: 0,
          layer: 0,
          order: ids.length,
        },
      };
    }
  }
  return {
    levelHash: `fixture-${groupCount}-${copies}`,
    ruleProfileId: 'taptile-tray-match3-v1',
    tiles,
    initialBoardIds: ids,
    blockersByTile: Object.fromEntries(ids.map((id) => [id, []])),
    dependentsByTile: Object.fromEntries(ids.map((id) => [id, []])),
    initialBlockerCount: Object.fromEntries(ids.map((id) => [id, 0])),
    initialPlayableIds: ids,
    blockerEdges: [],
    validation: {
      valid: true,
      issues: [],
      statistics: { tileCount: ids.length, archetypeCount: groupCount, edgeCount: 0, playableCount: ids.length },
    },
  };
}

describe('TapTile deterministic Beam Search', () => {
  it('solves the production hourglass template through the same engine API', () => {
    const level = compileTapTileLevel(createDefaultTapTileProject('hourglass'));
    const solved = solveTapTileTake(level, { profile: 'safe-win', seed: 20260902, beamWidth: 80 });
    expect(solved.status, solved.diagnostic).toBe('solved');
    expect(solved.take?.result).toBe('won');
    expect(solved.validation?.valid).toBe(true);
  });

  it('solves a small level and produces a formally replayable Take', () => {
    const level = flatLevel(3);
    const solved = solveTapTileTake(level, { profile: 'safe-win', seed: 27, beamWidth: 160 });
    expect(solved.status).toBe('solved');
    expect(solved.take?.result).toBe('won');
    expect(solved.validation?.valid).toBe(true);
    expect(solved.actions).toHaveLength(9);
    expect(solved.actions?.every((action) => action.actor === 'agent' && action.type === 'tap')).toBe(true);
  });

  it('returns exactly the same actions and Take for the same seed', () => {
    const level = flatLevel(4);
    const options = { profile: 'combo-heavy' as const, seed: 935, beamWidth: 240 };
    const first = solveTapTileTake(level, options);
    const second = solveTapTileTake(level, options);
    expect(second.actions).toEqual(first.actions);
    expect(second.take).toEqual(first.take);
    expect(second.finalStateHash).toBe(first.finalStateHash);
  });

  it('creates a danger-rescue Take that warns at 6/7 and later recovers', () => {
    const level = flatLevel(6);
    const solved = solveTapTileTake(level, {
      profile: 'danger-rescue',
      seed: 81,
      beamWidth: 800,
      maxDepth: 18,
    });
    expect(solved.status, solved.diagnostic).toBe('solved');
    expect(solved.take).toBeDefined();
    const replay = replayTapTileTake(level, solved.take!);
    const warningIndex = replay.transitions.findIndex((transition) => transition.events.some((event) => event.type === 'tray.warning'));
    expect(warningIndex).toBeGreaterThanOrEqual(0);
    expect(replay.transitions.slice(warningIndex + 1).some((transition) => transition.matchedTileIds.length === 3 && transition.after.trayIds.length < 6)).toBe(true);
    expect(replay.states.at(-1)?.status).toBe('won');
  });

  it('supports an intentional seventh-slot failure profile', () => {
    const level = flatLevel(7);
    const solved = solveTapTileTake(level, { profile: 'intentional-fail', seed: 5, beamWidth: 260 });
    expect(solved.status, solved.diagnostic).toBe('solved');
    expect(solved.take?.result).toBe('lost');
    expect(solved.actions).toHaveLength(7);
  });

  it('keeps the invalid/not-found evidence boundary explicit', () => {
    const invalid = flatLevel(1);
    invalid.validation.valid = false;
    invalid.validation.issues.push({ code: 'FIXTURE_INVALID', severity: 'error', message: 'invalid', objectIds: [] });
    expect(solveTapTileLevel(invalid).status).toBe('invalid-level');

    const profiles: TapTileScenarioProfileId[] = ['safe-win', 'danger-rescue', 'combo-heavy', 'fast-clear', 'intentional-fail'];
    for (const profile of profiles) {
      const result = solveTapTileLevel(flatLevel(3), { profile, maxDepth: 0 });
      expect(result.status).toBe('not-found');
      expect(result.diagnostic).toContain('不等于数学上无解');
    }
  });
});
