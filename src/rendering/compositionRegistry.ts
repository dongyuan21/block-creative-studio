import type { CalibrationProfile } from '../game-runtime/calibrationProfile';
import { blockPlacementCalibrationProfile } from '../games/block-placement/profiles/calibration';
import { blockPlacementCompositionProfile } from '../games/block-placement/profiles/composition';
import type { CompositionProfile } from './composition';

const compositions = new Map<string, CompositionProfile>();
const calibrations = new Map<string, CalibrationProfile>();
let defaultCompositionId: string = blockPlacementCompositionProfile.id;
let defaultCalibrationId: string = blockPlacementCalibrationProfile.id;

compositions.set(blockPlacementCompositionProfile.id, blockPlacementCompositionProfile);
calibrations.set(blockPlacementCalibrationProfile.id, blockPlacementCalibrationProfile);

export function registerCompositionProfile(profile: CompositionProfile): void {
  compositions.set(profile.id, profile);
}

export function registerCalibrationProfile(profile: CalibrationProfile): void {
  calibrations.set(profile.id, profile);
}

export function setDefaultCompositionProfile(id: string): void {
  if (!compositions.has(id)) {
    throw new Error(`Unknown composition profile ${id}`);
  }
  defaultCompositionId = id;
}

export function setDefaultCalibrationProfile(id: string): void {
  if (!calibrations.has(id)) {
    throw new Error(`Unknown calibration profile ${id}`);
  }
  defaultCalibrationId = id;
}

export function getCompositionProfile(id: string): CompositionProfile | undefined {
  return compositions.get(id);
}

export function getCalibrationProfile(id: string): CalibrationProfile | undefined {
  return calibrations.get(id);
}

export function getDefaultCompositionProfile(): CompositionProfile {
  const profile = compositions.get(defaultCompositionId);
  if (!profile) throw new Error(`Missing default composition profile ${defaultCompositionId}`);
  return profile;
}

export function getDefaultCalibrationProfile(): CalibrationProfile {
  const profile = calibrations.get(defaultCalibrationId);
  if (!profile) throw new Error(`Missing default calibration profile ${defaultCalibrationId}`);
  return profile;
}
