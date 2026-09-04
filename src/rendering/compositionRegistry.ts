import type { CalibrationProfile } from '../game-runtime/calibrationProfile';
import type { CompositionProfile } from './composition';

const compositions = new Map<string, CompositionProfile>();
const calibrations = new Map<string, CalibrationProfile>();
let defaultCompositionId: string | undefined;
let defaultCalibrationId: string | undefined;

export function registerCompositionProfile(profile: CompositionProfile): void {
  compositions.set(profile.id, profile);
  if (defaultCompositionId === undefined) defaultCompositionId = profile.id;
}

export function registerCalibrationProfile(profile: CalibrationProfile): void {
  calibrations.set(profile.id, profile);
  if (defaultCalibrationId === undefined) defaultCalibrationId = profile.id;
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

export function requireCompositionProfile(id: string): CompositionProfile {
  const profile = compositions.get(id);
  if (!profile) throw new Error(`Unknown composition profile ${id}`);
  return profile;
}

export function requireCalibrationProfile(id: string): CalibrationProfile {
  const profile = calibrations.get(id);
  if (!profile) throw new Error(`Unknown calibration profile ${id}`);
  return profile;
}

export function getDefaultCompositionProfile(): CompositionProfile {
  if (defaultCompositionId === undefined) {
    throw new Error('No default composition profile is registered. Call platform bootstrap first.');
  }
  return requireCompositionProfile(defaultCompositionId);
}

export function getDefaultCalibrationProfile(): CalibrationProfile {
  if (defaultCalibrationId === undefined) {
    throw new Error('No default calibration profile is registered. Call platform bootstrap first.');
  }
  return requireCalibrationProfile(defaultCalibrationId);
}
