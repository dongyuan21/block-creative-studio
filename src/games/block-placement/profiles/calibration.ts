import type { CalibrationProfile } from '../../../game-runtime/calibrationProfile';
import { BLOCK_PLACEMENT_GAME_ID } from '../manifest';
import { BLOCK_PLACEMENT_COMPOSITION_PROFILE_ID, blockPlacementCompositionProfile } from './composition';

export const BLOCK_PLACEMENT_CALIBRATION_PROFILE_ID = 'block-placement.calibration.v1';

const playfield = blockPlacementCompositionProfile.playfield;

export const blockPlacementCalibrationProfile = {
  id: BLOCK_PLACEMENT_CALIBRATION_PROFILE_ID,
  version: '1.0.0',
  gameId: BLOCK_PLACEMENT_GAME_ID,
  compositionProfileId: BLOCK_PLACEMENT_COMPOSITION_PROFILE_ID,
  rois: [
    { id: 'board', x: playfield.x, y: playfield.y, width: playfield.width, height: playfield.height },
    { id: 'grid', x: 91, y: 321, width: 892, height: 892 },
    { id: 'hud-score', x: 372, y: 165, width: 320, height: 96 },
    { id: 'tray', x: 80, y: 1320, width: 904, height: 280 },
  ],
} as const satisfies CalibrationProfile;
