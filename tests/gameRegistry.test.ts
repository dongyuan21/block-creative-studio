import { describe, expect, it } from 'vitest';
import { createDefaultGameRegistry } from '../src/bootstrap/gameRegistry';
import { GameRegistryError } from '../src/game-runtime/errors';
import { GameRegistry } from '../src/game-runtime/gameRegistry';
import { eraseGameDefinition } from '../src/game-runtime/registry';
import { blockPlacementDefinition } from '../src/games/block-placement/definition';
import {
  BLOCK_PLACEMENT_GAME_ID,
  BLOCK_PLACEMENT_MODULE_VERSION,
  BLOCK_PLACEMENT_STATE_SCHEMA_ID,
} from '../src/games/block-placement/manifest';

describe('game registry', () => {
  it('registers Block Placement as the first GameDefinition', () => {
    const registry = createDefaultGameRegistry();
    const definition = registry.require(BLOCK_PLACEMENT_GAME_ID, BLOCK_PLACEMENT_MODULE_VERSION);
    expect(definition.manifest.gameId).toBe(BLOCK_PLACEMENT_GAME_ID);
    expect(definition.manifest.moduleVersion).toBe(BLOCK_PLACEMENT_MODULE_VERSION);
    expect(definition.manifest.topology).toBe('grid-2d');
    expect(registry.list()).toEqual([definition.manifest]);
    expect(registry.schemas.has(BLOCK_PLACEMENT_STATE_SCHEMA_ID, '1.0.0')).toBe(true);
  });

  it('erases the Block Placement definition without changing hashes', () => {
    const registry = createDefaultGameRegistry();
    const definition = registry.require(BLOCK_PLACEMENT_GAME_ID, BLOCK_PLACEMENT_MODULE_VERSION);
    const erased = eraseGameDefinition(definition);
    const parsed = erased.parseState(structuredClone(definition.runtime.createInitialState({}, 41782)));
    expect(erased.hashState(parsed)).toBe(definition.runtime.hashState(definition.runtime.createInitialState({}, 41782)));
  });

  it('fails on an unknown game id', () => {
    const registry = createDefaultGameRegistry();
    expect(() => registry.get('vita-mahjong')).toThrowError(GameRegistryError);
    try {
      registry.get('block-crush-drop');
    } catch (error) {
      expect(error).toBeInstanceOf(GameRegistryError);
      expect((error as GameRegistryError).code).toBe('UNKNOWN_GAME');
    }
  });

  it('fails when the same game id and module version are registered twice', () => {
    const registry = new GameRegistry();
    registry.register(blockPlacementDefinition);
    expect(() => registry.register(blockPlacementDefinition)).toThrowError(/already registered/);
    try {
      registry.register(blockPlacementDefinition);
    } catch (error) {
      expect(error).toBeInstanceOf(GameRegistryError);
      expect((error as GameRegistryError).code).toBe('DUPLICATE_GAME');
    }
  });
});
