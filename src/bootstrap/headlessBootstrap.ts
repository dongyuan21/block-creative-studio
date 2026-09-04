import { blockPlacementPackage } from '../games/block-placement/package';
import { blockPlacementDefinition } from '../games/block-placement/definition';
import { GameRegistry } from '../game-runtime/gameRegistry';
import { createHeadlessPlatform, type HeadlessPlatform } from './gamePackage';

let defaultPlatform: HeadlessPlatform | undefined;

export function ensureDefaultHeadlessPlatform(): HeadlessPlatform {
  if (!defaultPlatform) {
    defaultPlatform = createHeadlessPlatform([blockPlacementPackage]);
  }
  return defaultPlatform;
}

export function createDefaultGameRegistry(): GameRegistry {
  const registry = new GameRegistry();
  registry.register(blockPlacementDefinition);
  return registry;
}

export function createHeadlessRuntimeRegistry(): GameRegistry {
  return createDefaultGameRegistry();
}
