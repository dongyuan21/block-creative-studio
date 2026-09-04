import type { ComponentType } from 'react';
import type { GameStudioModuleStatus, GameStudioModuleSummary } from './sessionTypes';

export interface GameStudioModule extends GameStudioModuleSummary {
  Workspace?: ComponentType;
}

export class GameStudioRegistry {
  constructor(private readonly modules: readonly GameStudioModule[]) {}

  list(): readonly GameStudioModule[] {
    return this.modules;
  }

  get(gameId: string): GameStudioModule | undefined {
    return this.modules.find((item) => item.gameId === gameId);
  }

  require(gameId: string): GameStudioModule {
    const found = this.get(gameId);
    if (!found) {
      throw new Error(`Unknown studio module ${gameId}`);
    }
    return found;
  }

  defaultGameId(): string {
    return this.modules.find((item) => item.status === 'available')?.gameId
      ?? this.modules[0]?.gameId
      ?? '';
  }
}

export function isAvailableStudioModule(module: GameStudioModuleSummary): boolean {
  return module.status === 'available';
}
