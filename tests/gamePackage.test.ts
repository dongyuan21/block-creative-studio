import { describe, expect, it } from 'vitest';
import { createHeadlessPlatform, registerGamePackage } from '../src/bootstrap/gamePackage';
import { GameRegistryError } from '../src/game-runtime/errors';
import { GameRegistry } from '../src/game-runtime/gameRegistry';
import { PresentationRegistry } from '../src/game-runtime/presentationRegistry';
import { RenderContractRegistry } from '../src/game-runtime/renderContractRegistry';
import { getCaptureSuite } from '../src/capture/captureSuiteRegistry';
import { getCompositionProfile } from '../src/rendering/compositionRegistry';
import { blockCrushDropPackage } from '../src/games/block-crush-drop/package';
import { BLOCK_CRUSH_DROP_GAME_ID } from '../src/games/block-crush-drop/manifest';
import { crushWoodCaptureSuite } from '../src/games/block-crush-drop/capture/suite';
import { crushWoodPresentationAdapter } from '../src/games/block-crush-drop/presentation';
import { blockPlacementPackage } from '../src/games/block-placement/package';

function emptyPlatform() {
  return {
    games: new GameRegistry(),
    presentations: new PresentationRegistry(),
    renderContracts: new RenderContractRegistry(),
  };
}

describe('atomic game package registration', () => {
  it('preflights mismatched component gameIds before mutating the target registry', () => {
    const platform = emptyPlatform();
    const mismatched = {
      ...blockCrushDropPackage,
      presentation: { ...crushWoodPresentationAdapter, gameId: 'vita-mahjong-solitaire' },
    };
    expect(() => registerGamePackage(mismatched, platform)).toThrowError(GameRegistryError);
    expect(platform.games.has(BLOCK_CRUSH_DROP_GAME_ID)).toBe(false);
    expect(platform.presentations.has(BLOCK_CRUSH_DROP_GAME_ID)).toBe(false);
    expect(platform.presentations.has('vita-mahjong-solitaire')).toBe(false);
  });

  it('rejects a colliding composition id without registering the real Crush package', () => {
    const platform = createHeadlessPlatform([blockPlacementPackage]);
    const colliding = {
      ...blockCrushDropPackage,
      compositions: [
        ...blockCrushDropPackage.compositions,
        {
          id: 'block-placement.composition.v1',
          version: '9.9.9',
          gameId: BLOCK_CRUSH_DROP_GAME_ID,
          designResolution: { width: 1, height: 1 },
          videoResolution: { width: 2, height: 2 },
          playfield: { x: 0, y: 0, width: 1, height: 1 },
        },
      ],
    };
    expect(() => registerGamePackage(colliding, platform)).toThrowError(GameRegistryError);
    try {
      registerGamePackage(colliding, platform);
    } catch (error) {
      expect(error).toBeInstanceOf(GameRegistryError);
      expect((error as GameRegistryError).code).toBe('DUPLICATE_COMPOSITION');
    }
    expect(platform.games.has(BLOCK_CRUSH_DROP_GAME_ID)).toBe(false);
    expect(getCompositionProfile('block-placement.composition.v1')?.gameId).toBe('block-placement');
    const suite = getCaptureSuite(BLOCK_CRUSH_DROP_GAME_ID);
    expect(suite === undefined || suite.id === crushWoodCaptureSuite.id).toBe(true);
  });
});
