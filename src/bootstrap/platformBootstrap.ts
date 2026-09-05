import { CrushWoodWorkspace } from '../games/block-crush-drop/studio/CrushWoodWorkspace';
import { BLOCK_CRUSH_DROP_GAME_ID } from '../games/block-crush-drop/manifest';
import { BlockPlacementWorkspace } from '../games/block-placement/studio/BlockPlacementWorkspace';
import { BLOCK_PLACEMENT_GAME_ID } from '../games/block-placement/manifest';
import { TAPTILE_TRAY_MATCH3_GAME_ID } from '../games/taptile-tray-match3/manifest';
import { TapTileWorkspace } from '../games/taptile-tray-match3/studio/TapTileWorkspace';
import { GameStudioRegistry, type GameStudioModule } from '../studio/gameStudioRegistry';
import { ensureDefaultHeadlessPlatform } from './headlessBootstrap';
import type { HeadlessPlatform } from './gamePackage';

export { BLOCK_CRUSH_DROP_GAME_ID } from '../games/block-crush-drop/manifest';
export const VITA_MAHJONG_SOLITAIRE_GAME_ID = 'vita-mahjong-solitaire';

const comingSoon: GameStudioModule[] = [
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
    {
      gameId: TAPTILE_TRAY_MATCH3_GAME_ID,
      displayName: 'TapTile Match-3',
      status: 'available',
      description: '分层牌堆、7 槽三消、Take 与固定帧导演',
      Workspace: TapTileWorkspace,
    },
    {
      gameId: BLOCK_CRUSH_DROP_GAME_ID,
      displayName: 'Crush Wooood!',
      status: 'available',
      description: '21×34 预制木块、纵向落块、满行粉碎与坍落视频导演',
      Workspace: CrushWoodWorkspace,
    },
    ...comingSoon,
  ]);
  return { ...headless, studio };
}

export function createDefaultStudioRegistry(): GameStudioRegistry {
  return createDefaultPlatform().studio;
}
