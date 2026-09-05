import type { GamePackageRegistration } from '../../bootstrap/gamePackage';
import { crushWoodCaptureSuite } from './capture/suite';
import { blockCrushDropDefinition } from './definition';
import { BLOCK_CRUSH_DROP_GAME_ID } from './manifest';
import { crushWoodPresentationAdapter } from './presentation';
import { crushWoodCalibrationProfile } from './profiles/calibration';
import { crushWoodCompositionProfile } from './profiles/composition';
import { crushWoodCinematicBackend } from './render/cinematicBackendAdapter';
import { crushWoodRenderContract } from './render/renderContract';

export const blockCrushDropPackage: GamePackageRegistration = {
  definition: blockCrushDropDefinition,
  presentation: crushWoodPresentationAdapter,
  renderContract: crushWoodRenderContract,
  compositions: [crushWoodCompositionProfile],
  calibrations: [crushWoodCalibrationProfile],
  backends: [crushWoodCinematicBackend],
  captureSuite: crushWoodCaptureSuite,
  studioGameId: BLOCK_CRUSH_DROP_GAME_ID,
};
