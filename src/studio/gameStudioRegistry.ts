import type { ComponentType } from 'react';
import { BlockPlacementWorkspace } from '../games/block-placement/studio/BlockPlacementWorkspace';
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
    return this.modules.find((item) => item.status === 'available')?.gameId ?? 'block-placement';
  }
}

export function createDefaultStudioRegistry(): GameStudioRegistry {
  return new GameStudioRegistry([
    {
      gameId: 'block-placement',
      displayName: 'Block Placement',
      status: 'available',
      description: '固定视图方块创作',
      Workspace: BlockPlacementWorkspace,
    },
    {
      gameId: 'block-crush',
      displayName: 'Block Crush',
      status: 'coming-soon',
      description: 'Diagnostic Slice 完成后接入',
    },
    {
      gameId: 'vita-mahjong',
      displayName: 'Vita Mahjong',
      status: 'coming-soon',
      description: '语义 Slot 已预留，规则尚未接入',
    },
  ]);
}

export function isAvailableStudioModule(module: GameStudioModuleSummary): boolean {
  return module.status === 'available';
}
