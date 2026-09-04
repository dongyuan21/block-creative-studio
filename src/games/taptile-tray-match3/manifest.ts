import type { GameManifest } from '../../game-runtime/contracts';

export const TAPTILE_TRAY_MATCH3_GAME_ID = 'taptile-tray-match3' as const;
export const TAPTILE_TRAY_MATCH3_MODULE_VERSION = '1.0.0' as const;

export const tapTileTrayMatch3Manifest: GameManifest = {
  gameId: TAPTILE_TRAY_MATCH3_GAME_ID,
  moduleVersion: TAPTILE_TRAY_MATCH3_MODULE_VERSION,
  displayName: 'TapTile 7-Slot Match-3',
  topology: 'layered-planar',
  rulesetId: 'taptile-tray-match3-v1',
  rulesetVersion: '1.0.0',
};
