import { blockPlacementPackage } from '../games/block-placement/package';
import { blockPlacementDefinition } from '../games/block-placement/definition';
import { tapTileTrayMatch3Package } from '../games/taptile-tray-match3/package';
import { tapTileTrayMatch3Definition } from '../games/taptile-tray-match3/definition';
import { GameRegistry } from '../game-runtime/gameRegistry';
import { createHeadlessPlatform, type HeadlessPlatform } from './gamePackage';

let defaultPlatform: HeadlessPlatform | undefined;

export function ensureDefaultHeadlessPlatform(): HeadlessPlatform {
  if (!defaultPlatform) {
    defaultPlatform = createHeadlessPlatform([
      blockPlacementPackage,
      tapTileTrayMatch3Package,
    ]);
  }
  return defaultPlatform;
}

export function createDefaultGameRegistry(): GameRegistry {
  const registry = new GameRegistry();
  registry.register(blockPlacementDefinition);
  registry.register(tapTileTrayMatch3Definition);
  return registry;
}

export function createHeadlessRuntimeRegistry(): GameRegistry {
  return createDefaultGameRegistry();
}
