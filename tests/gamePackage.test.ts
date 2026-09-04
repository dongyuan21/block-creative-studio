import { describe, expect, it } from 'vitest';
import { createHeadlessPlatform, registerGamePackage } from '../src/bootstrap/gamePackage';
import { GameRegistry } from '../src/game-runtime/gameRegistry';
import { PresentationRegistry } from '../src/game-runtime/presentationRegistry';
import { RenderContractRegistry } from '../src/game-runtime/renderContractRegistry';
import { GameRegistryError } from '../src/game-runtime/errors';
import { getCompositionProfile } from '../src/rendering/compositionRegistry';
import { getCaptureSuite } from '../src/capture/captureSuiteRegistry';
import { blockPlacementPackage } from '../src/games/block-placement/package';
import {
  CRUSH_GAME_ID,
  crushPresentationAdapter,
  fakeCrushPackage,
} from './games/block-crush-drop/fakeCrushPackage';

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
      ...fakeCrushPackage,
      presentation: { ...crushPresentationAdapter, gameId: 'vita-mahjong-solitaire' },
    };
    expect(() => registerGamePackage(mismatched, platform)).toThrowError(GameRegistryError);
    expect(platform.games.has(CRUSH_GAME_ID)).toBe(false);
    expect(platform.presentations.has(CRUSH_GAME_ID)).toBe(false);
    expect(platform.presentations.has('vita-mahjong-solitaire')).toBe(false);
  });

  it('rejects a colliding composition id without registering the second game', () => {
    const platform = createHeadlessPlatform([blockPlacementPackage]);
    const colliding = {
      ...fakeCrushPackage,
      compositions: [
        ...fakeCrushPackage.compositions ?? [],
        {
          id: 'block-placement.composition.v1',
          version: '9.9.9',
          gameId: CRUSH_GAME_ID,
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
    expect(platform.games.has(CRUSH_GAME_ID)).toBe(false);
    expect(getCompositionProfile('block-placement.composition.v1')?.gameId).toBe('block-placement');
    expect(getCaptureSuite(CRUSH_GAME_ID)?.id === 'block-crush-drop.diag' || getCaptureSuite(CRUSH_GAME_ID) === undefined).toBe(true);
  });
});
