import type { CalibrationProfile } from '../../../game-runtime/calibrationProfile';
import { TAPTILE_TRAY_MATCH3_GAME_ID } from '../manifest';
import { TAPTILE_COMPOSITION_PROFILE_ID, tapTileCompositionProfile } from './composition';

export const TAPTILE_CALIBRATION_PROFILE_ID = 'taptile-tray-match3.calibration.v1';

const playfield = tapTileCompositionProfile.playfield;
const tray = tapTileCompositionProfile.tray;

export const tapTileCalibrationProfile = {
  id: TAPTILE_CALIBRATION_PROFILE_ID,
  version: '1.0.0',
  gameId: TAPTILE_TRAY_MATCH3_GAME_ID,
  compositionProfileId: TAPTILE_COMPOSITION_PROFILE_ID,
  rois: [
    { id: 'tray', x: tray.x, y: tray.y, width: tray.width, height: tray.height },
    { id: 'board', x: playfield.x, y: playfield.y, width: playfield.width, height: playfield.height },
    { id: 'hud-preview', x: 372, y: 48, width: 336, height: 96 },
  ],
} as const satisfies CalibrationProfile;
