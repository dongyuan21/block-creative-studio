import type { GamePackageRegistration } from '../../bootstrap/gamePackage';
import { blockPlacementCaptureSuite } from './capture/suite';
import { blockPlacementDefinition } from './definition';
import { blockPlacementPresentationAdapter } from './presentation/legacyPresentationAdapter';
import { blockPlacementCalibrationProfile } from './profiles/calibration';
import { blockPlacementCompositionProfile } from './profiles/composition';
import { blockPlacementRenderContract } from './render/renderContract';

export const blockPlacementPackage: GamePackageRegistration = {
  definition: blockPlacementDefinition,
  presentation: blockPlacementPresentationAdapter,
  renderContract: blockPlacementRenderContract,
  compositions: [blockPlacementCompositionProfile],
  calibrations: [blockPlacementCalibrationProfile],
  captureSuite: blockPlacementCaptureSuite,
};
