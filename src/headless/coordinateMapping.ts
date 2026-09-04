import {
  boardRectInSpace,
  containMapping,
  designToDisplayMappingForProfile,
  mapComposition,
  mapDesignPointThroughProfile,
  videoCompositionAspect,
  type CompositionProfile,
  type ContainMapping,
  type PixelSize,
} from '../rendering/composition';
import { getDefaultCompositionProfile } from '../rendering/compositionRegistry';

export type { CompositionProfile, ContainMapping };
export { containMapping, mapComposition };

/** Native Reference 2D design canvas for the default composition profile. */
export const DESIGN_RESOLUTION: PixelSize = {
  get width() {
    return getDefaultCompositionProfile().designResolution.width;
  },
  get height() {
    return getDefaultCompositionProfile().designResolution.height;
  },
};

export const DESIGN_BOARD_OUTER = {
  get x() {
    return getDefaultCompositionProfile().playfield.x;
  },
  get y() {
    return getDefaultCompositionProfile().playfield.y;
  },
  get size() {
    return getDefaultCompositionProfile().playfield.width;
  },
};

export const VIDEO_RESOLUTION: PixelSize = {
  get width() {
    return getDefaultCompositionProfile().videoResolution.width;
  },
  get height() {
    return getDefaultCompositionProfile().videoResolution.height;
  },
};

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
