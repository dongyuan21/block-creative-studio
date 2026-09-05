import type { GamePackageRegistration } from '../../bootstrap/gamePackage';
import { tapTileCaptureSuite } from './capture/suite';
import { tapTileTrayMatch3Definition } from './definition';
import { TAPTILE_TRAY_MATCH3_GAME_ID } from './manifest';
import { tapTilePresentationAdapter } from './presentation';
import { tapTileCalibrationProfile } from './profiles/calibration';
import { tapTileCompositionProfile } from './profiles/composition';
import { tapTileCinematicBackend } from './render/cinematicBackendAdapter';
import { tapTileRenderContract } from './render/renderContract';

export const tapTileTrayMatch3Package: GamePackageRegistration = {
  definition: tapTileTrayMatch3Definition,
  presentation: tapTilePresentationAdapter,
  renderContract: tapTileRenderContract,
  compositions: [tapTileCompositionProfile],
  calibrations: [tapTileCalibrationProfile],
  backends: [tapTileCinematicBackend],
  captureSuite: tapTileCaptureSuite,
  studioGameId: TAPTILE_TRAY_MATCH3_GAME_ID,
};
