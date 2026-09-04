import { describe, expect, it } from 'vitest';
import { createHeadlessPlatform } from '../src/bootstrap/gamePackage';
import {
  TAPTILE_TRAY_MATCH3_GAME_ID,
  tapTileConfigFromProject,
  tapTileTrayMatch3Package,
  type TapTileRuntimeAction,
  type TapTileRuntimeResolution,
  type TapTileRuntimeState,
} from '../src/games/taptile-tray-match3';
import { createDefaultTapTileProject } from '../src/games/taptile-tray-match3/project';
import type { TapTileConfig } from '../src/games/taptile-tray-match3/project/config';

describe('TapTile game package integration', () => {
  it('registers without changing the platform contracts and resolves a legal tap', () => {
    const platform = createHeadlessPlatform([tapTileTrayMatch3Package]);
    const definition = platform.games.require<
      TapTileConfig,
      TapTileRuntimeState,
      TapTileRuntimeAction,
      TapTileRuntimeResolution
    >(TAPTILE_TRAY_MATCH3_GAME_ID);
    const config = tapTileConfigFromProject(createDefaultTapTileProject('hourglass'));
    const state = definition.runtime.createInitialState(config, 73);
    expect(state.seed).toBe(73);
    const action = definition.runtime.listLegalActions?.(state)[0];
    expect(action).toBeDefined();
    const resolution = definition.runtime.resolve(state, action!, { seed: 73, stepIndex: 0 });
    expect(resolution.transition.accepted).toBe(true);
    const next = definition.runtime.stateAfter(resolution);
    expect(next.seed).toBe(73);
    expect(next.level.levelHash).toBe(state.level.levelHash);
    expect(next.game.turn).toBe(1);
    expect(next.game.boardIds).not.toContain(action!.tileId);
    expect(definition.runtime.hashState(next)).not.toBe(definition.runtime.hashState(state));
  });

  it('exposes the formal layered-planar 7-slot ruleset identity', () => {
    const platform = createHeadlessPlatform([tapTileTrayMatch3Package]);
    expect(platform.games.list()).toEqual([
      expect.objectContaining({
        gameId: 'taptile-tray-match3',
        topology: 'layered-planar',
        rulesetId: 'taptile-tray-match3-v1',
      }),
    ]);
  });
});
