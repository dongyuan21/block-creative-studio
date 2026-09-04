import { GameRegistry } from '../game-runtime/gameRegistry';
import { blockPlacementDefinition } from '../games/block-placement/definition';

export function createDefaultGameRegistry(): GameRegistry {
  const registry = new GameRegistry();
  registry.register(blockPlacementDefinition);
  return registry;
}
