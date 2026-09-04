import type { FixedCameraProfile } from './semanticAssetTypes';
import { blockPlacementFixedCameraDraft } from '../games/block-placement/profiles/fixedCamera';

/**
 * Screen-space truth for the first reference profile.
 *
 * Physical lens selection is intentionally left pending. The supplied
 * reference recording proves the final screen layout, but not whether its
 * source was orthographic, long-lens perspective, or a fully 2D composition.
 */
export const BLOCK_GARDEN_FIXED_CAMERA_DRAFT: FixedCameraProfile = blockPlacementFixedCameraDraft;
