import {
  boardRectInSpace,
  containMapping,
  designToDisplayMappingForProfile,
  mapComposition,
  mapDesignPointThroughProfile,
  videoCompositionAspect,
  type CompositionProfile,
  type ContainMapping,
} from '../rendering/composition';
import { getDefaultCompositionProfile } from '../rendering/compositionRegistry';

export type { CompositionProfile, ContainMapping };
export { containMapping, mapComposition };

const defaultComposition = getDefaultCompositionProfile();

/** Native Reference 2D design canvas for the default (Block Placement) composition. */
export const DESIGN_RESOLUTION = defaultComposition.designResolution;

export const DESIGN_BOARD_OUTER = {
  x: defaultComposition.playfield.x,
  y: defaultComposition.playfield.y,
  size: defaultComposition.playfield.width,
} as const;

export const VIDEO_RESOLUTION = defaultComposition.videoResolution;

export function designToVideoMapping(profile: CompositionProfile = getDefaultCompositionProfile()): ContainMapping {
  return mapComposition(profile);
}

export function designToDisplayMapping(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
  profile: CompositionProfile = getDefaultCompositionProfile(),
): ContainMapping {
  return designToDisplayMappingForProfile(profile, cssWidth, cssHeight, devicePixelRatio);
}

export function mapDesignPointToVideo(
  x: number,
  y: number,
  profile: CompositionProfile = getDefaultCompositionProfile(),
): { x: number; y: number } {
  return mapDesignPointThroughProfile(profile, x, y);
}

export function boardScreenRectInSpace(
  space: 'design' | 'video',
  profile: CompositionProfile = getDefaultCompositionProfile(),
): { x: number; y: number; width: number; height: number } {
  return boardRectInSpace(profile, space);
}

export function lockedCompositionAspect(
  profile: CompositionProfile = getDefaultCompositionProfile(),
): number {
  return videoCompositionAspect(profile);
}
