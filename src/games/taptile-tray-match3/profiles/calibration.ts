import type { CalibrationProfile } from '../../../game-runtime/calibrationProfile';
import { TAPTILE_TRAY_MATCH3_GAME_ID, TAPTILE_TRAY_MATCH3_MODULE_VERSION } from '../manifest';
import {
  TAPTILE_COMPOSITION_PROFILE_ID,
  tapTileCompositionProfile,
  tapTilePlayfield,
  tapTileTrayRoi,
} from './composition';

export const TAPTILE_CALIBRATION_PROFILE_ID = 'taptile-tray-match3.calibration.reference.v1';

const board = tapTilePlayfield;
const tray = tapTileTrayRoi;

export const tapTileCalibrationProfile = {
  id: TAPTILE_CALIBRATION_PROFILE_ID,
  version: TAPTILE_TRAY_MATCH3_MODULE_VERSION,
  gameId: TAPTILE_TRAY_MATCH3_GAME_ID,
  compositionProfileId: TAPTILE_COMPOSITION_PROFILE_ID,
  rois: [
    { id: 'tray', ...tray },
    { id: 'board', ...board },
    { id: 'hud', x: 12, y: 8, width: tapTileCompositionProfile.designResolution.width - 24, height: 48 },
    { id: 'match-burst', x: tray.x, y: tray.y - 8, width: tray.width, height: tray.height + 24 },
    { id: 'pointer-envelope', x: 0, y: 0, width: tapTileCompositionProfile.designResolution.width, height: tapTileCompositionProfile.designResolution.height },
  ],
} as const satisfies CalibrationProfile;
