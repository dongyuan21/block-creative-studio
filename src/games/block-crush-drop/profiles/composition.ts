import type { CompositionProfile } from '../../../rendering/composition';
import { BLOCK_CRUSH_DROP_GAME_ID, BLOCK_CRUSH_DROP_MODULE_VERSION } from '../manifest';

export const CRUSH_WOOD_COMPOSITION_PROFILE_ID = 'block-crush-drop.composition.reference.v1';

/**
 * 720×1280 design space maps exactly to the supplied 1080×1920 references.
 * The calibrated 21×34 tile grid maps to output pixels (24, 214.5)–(1056, 1900.5).
 * The renderer owns the recessed wood well around this grid, so the playfield
 * contract remains the semantic tile coordinate rectangle rather than the frame.
 */
export const crushWoodCompositionProfile = {
  id: CRUSH_WOOD_COMPOSITION_PROFILE_ID,
  version: BLOCK_CRUSH_DROP_MODULE_VERSION,
  gameId: BLOCK_CRUSH_DROP_GAME_ID,
  designResolution: { width: 720, height: 1280 },
  videoResolution: { width: 1080, height: 1920 },
  playfield: { x: 16, y: 143, width: 688, height: 1124 },
} as const satisfies CompositionProfile;
