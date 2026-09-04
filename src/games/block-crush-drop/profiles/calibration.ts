import type { CalibrationProfile } from '../../../game-runtime/calibrationProfile';
import { BLOCK_CRUSH_DROP_GAME_ID, BLOCK_CRUSH_DROP_MODULE_VERSION } from '../manifest';
import { CRUSH_WOOD_COMPOSITION_PROFILE_ID, crushWoodCompositionProfile } from './composition';

export const CRUSH_WOOD_CALIBRATION_PROFILE_ID = 'block-crush-drop.calibration.reference.v1';

const board = crushWoodCompositionProfile.playfield;

export const crushWoodCalibrationProfile = {
  id: CRUSH_WOOD_CALIBRATION_PROFILE_ID,
  version: BLOCK_CRUSH_DROP_MODULE_VERSION,
  gameId: BLOCK_CRUSH_DROP_GAME_ID,
  compositionProfileId: CRUSH_WOOD_COMPOSITION_PROFILE_ID,
  rois: [
    { id: 'well', x: board.x, y: board.y, width: board.width, height: board.height },
    { id: 'preview-queue', x: 195, y: 22, width: 330, height: 102 },
    { id: 'impact-band', x: board.x, y: board.y + 145, width: board.width, height: 170 },
    { id: 'score', x: 540, y: 30, width: 155, height: 76 },
    { id: 'debris-envelope', x: 0, y: 80, width: 720, height: 1180 },
  ],
} as const satisfies CalibrationProfile;
