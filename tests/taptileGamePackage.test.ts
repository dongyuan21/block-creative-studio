import { describe, expect, it } from 'vitest';
import { createHeadlessPlatform } from '../src/bootstrap/gamePackage';
import { ensureDefaultHeadlessPlatform } from '../src/bootstrap/headlessBootstrap';
import {
  TAPTILE_TRAY_MATCH3_GAME_ID,
  tapTileTrayMatch3Package,
  type TapTileRuntimeAction,
  type TapTileRuntimeResolution,
  type TapTileRuntimeState,
} from '../src/games/taptile-tray-match3';
import { createDefaultTapTileProject, type TapTileProjectV2 } from '../src/taptile/project';

describe('TapTile game package integration', () => {
  it('registers without changing the platform contracts and resolves a legal tap', () => {
    const platform = createHeadlessPlatform([tapTileTrayMatch3Package]);
    const definition = platform.games.require<
      TapTileProjectV2,
      TapTileRuntimeState,
      TapTileRuntimeAction,
      TapTileRuntimeResolution
    >(TAPTILE_TRAY_MATCH3_GAME_ID);
    const project = createDefaultTapTileProject('hourglass');
    const state = definition.runtime.createInitialState(project, 73);
    const action = definition.runtime.listLegalActions?.(state)[0];
    expect(action).toBeDefined();
    const resolution = definition.runtime.resolve(state, action!, { seed: 73, stepIndex: 0 });
    expect(resolution.transition.accepted).toBe(true);
    const next = definition.runtime.stateAfter(resolution);
    expect(next.level.levelHash).toBe(state.level.levelHash);
    expect(next.game.turn).toBe(1);
    expect(next.game.boardIds).not.toContain(action!.tileId);
    expect(definition.runtime.hashState(next)).not.toBe(definition.runtime.hashState(state));
    expect(platform.presentations.require(TAPTILE_TRAY_MATCH3_GAME_ID).gameId).toBe(TAPTILE_TRAY_MATCH3_GAME_ID);
    expect(platform.renderContracts.list().some((item) => item.gameId === TAPTILE_TRAY_MATCH3_GAME_ID)).toBe(true);
  });

  it('reuses one default headless platform so HMR does not re-register backends', () => {
    const first = ensureDefaultHeadlessPlatform();
    const second = ensureDefaultHeadlessPlatform();
    expect(first).toBe(second);
    expect(first.games.require(TAPTILE_TRAY_MATCH3_GAME_ID).manifest.gameId).toBe(TAPTILE_TRAY_MATCH3_GAME_ID);
    expect(first.presentations.require(TAPTILE_TRAY_MATCH3_GAME_ID).gameId).toBe(TAPTILE_TRAY_MATCH3_GAME_ID);
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
