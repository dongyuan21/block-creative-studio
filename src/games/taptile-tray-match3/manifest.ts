import type { GameManifest } from '../../game-runtime/contracts';

export const TAPTILE_TRAY_MATCH3_GAME_ID = 'taptile-tray-match3' as const;
export const TAPTILE_TRAY_MATCH3_MODULE_VERSION = '1.0.0' as const;
export const TAPTILE_TRAY_MATCH3_RULESET_ID = 'taptile-tray-match3-v1' as const;
export const TAPTILE_TRAY_MATCH3_RULESET_VERSION = '1.0.0' as const;
export const TAPTILE_TRAY_MATCH3_SCHEMA_VERSION = '1.0.0' as const;

export const TAPTILE_CONFIG_SCHEMA_ID = 'bcs.runtime.taptile-tray-match3.config';
export const TAPTILE_STATE_SCHEMA_ID = 'bcs.runtime.taptile-tray-match3.state';
export const TAPTILE_ACTION_SCHEMA_ID = 'bcs.runtime.taptile-tray-match3.action';

export const tapTileTrayMatch3Manifest: GameManifest = {
  gameId: TAPTILE_TRAY_MATCH3_GAME_ID,
  moduleVersion: TAPTILE_TRAY_MATCH3_MODULE_VERSION,
  displayName: 'TapTile 7-Slot Match-3',
  topology: 'layered-planar',
  rulesetId: TAPTILE_TRAY_MATCH3_RULESET_ID,
  rulesetVersion: TAPTILE_TRAY_MATCH3_RULESET_VERSION,
};
