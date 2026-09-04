import type { CompositionProfile } from '../../../rendering/composition';
import { BLOCK_CRUSH_DROP_GAME_ID, BLOCK_CRUSH_DROP_MODULE_VERSION } from '../manifest';

export const CRUSH_WOOD_COMPOSITION_PROFILE_ID = 'block-crush-drop.composition.reference.v1';

/**
 * 720×1280 design space maps exactly to the 1080×1920 supplied references.
 * The 21×34 playfield starts at output pixel ≈(24, 210) and ends at ≈(1056, 1898).
 */
export const crushWoodCompositionProfile = {
  id: CRUSH_WOOD_COMPOSITION_PROFILE_ID,
  version: BLOCK_CRUSH_DROP_MODULE_VERSION,
  gameId: BLOCK_CRUSH_DROP_GAME_ID,
  designResolution: { width: 720, height: 1280 },
  videoResolution: { width: 1080, height: 1920 },
  playfield: { x: 16, y: 140, width: 688, height: 1125 },
} as const satisfies CompositionProfile;
