import { BlockPlacementWorkspace } from '../games/block-placement/studio/BlockPlacementWorkspace';
import { BLOCK_PLACEMENT_GAME_ID } from '../games/block-placement/manifest';
import { GameStudioRegistry, type GameStudioModule } from '../studio/gameStudioRegistry';
import { ensureDefaultHeadlessPlatform } from './headlessBootstrap';
import type { HeadlessPlatform } from './gamePackage';

export const BLOCK_CRUSH_DROP_GAME_ID = 'block-crush-drop';
export const VITA_MAHJONG_SOLITAIRE_GAME_ID = 'vita-mahjong-solitaire';

const comingSoon: GameStudioModule[] = [
  {
    gameId: BLOCK_CRUSH_DROP_GAME_ID,
    displayName: 'crash wooooood!',
    status: 'coming-soon',
    description: 'Diagnostic Slice 完成后接入',
  },
  {
    gameId: VITA_MAHJONG_SOLITAIRE_GAME_ID,
    displayName: 'Vita Mahjong',
    status: 'coming-soon',
    description: '语义 Slot 已预留，规则尚未接入',
  },
];

export interface StudioPlatform extends HeadlessPlatform {
  studio: GameStudioRegistry;
}

export function createDefaultPlatform(): StudioPlatform {
  const headless = ensureDefaultHeadlessPlatform();
  const studio = new GameStudioRegistry([
    {
      gameId: BLOCK_PLACEMENT_GAME_ID,
      displayName: 'Block Placement',
      status: 'available',
      description: '固定视图方块创作',
      Workspace: BlockPlacementWorkspace,
    },
    ...comingSoon,
  ]);
  return { ...headless, studio };
}

export function createDefaultStudioRegistry(): GameStudioRegistry {
  return createDefaultPlatform().studio;
}
