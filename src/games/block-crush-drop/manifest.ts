import type { GameManifest } from '../../game-runtime/contracts';

export const BLOCK_CRUSH_DROP_GAME_ID = 'block-crush-drop' as const;
export const BLOCK_CRUSH_DROP_MODULE_VERSION = '1.0.0' as const;
export const BLOCK_CRUSH_DROP_RULESET_ID = 'crush-wood-line-collapse-v1' as const;

export const blockCrushDropManifest = {
  gameId: BLOCK_CRUSH_DROP_GAME_ID,
  moduleVersion: BLOCK_CRUSH_DROP_MODULE_VERSION,
  displayName: 'Crush Wooood!',
  topology: 'grid-2d',
  rulesetId: BLOCK_CRUSH_DROP_RULESET_ID,
  rulesetVersion: BLOCK_CRUSH_DROP_MODULE_VERSION,
} as const satisfies GameManifest;
