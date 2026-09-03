import { BLOCK_GARDEN_FIXED_CAMERA_DRAFT } from '../assets/fixedCameraProfile';
import {
  DESIGN_RESOLUTION,
  VIDEO_RESOLUTION,
  lockedCompositionAspect,
} from '../headless/coordinateMapping';
import { perspectiveDistanceToFitFrame } from './cameraFraming';

export const FIXED_SHOT_PROFILE = {
  id: 'block-garden-fixed-shot-v1',
  cameraProfileId: BLOCK_GARDEN_FIXED_CAMERA_DRAFT.id,
  designResolution: DESIGN_RESOLUTION,
  videoResolution: VIDEO_RESOLUTION,
  compositionAspect: lockedCompositionAspect(),
  verticalFovDegrees: 42,
  contentWidth: 9.05,
  contentHeight: 13.8,
  widthFill: 0.89,
  heightFill: 0.9,
  baseDistance: 17.6,
  lookAt: [0, -0.05, 0.15] as const,
  cameraOffset: { x: 0.12, y: -1.1 },
  maximumScreenZoom: BLOCK_GARDEN_FIXED_CAMERA_DRAFT.motionPolicy.maximumScreenZoom,
  boardScreenRect: BLOCK_GARDEN_FIXED_CAMERA_DRAFT.boardScreenRect,
} as const;

export interface ContainedViewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function containedCompositionViewport(
  canvasWidth: number,
  canvasHeight: number,
  aspect = FIXED_SHOT_PROFILE.compositionAspect,
): ContainedViewport {
  const targetAspect = aspect;
  const canvasAspect = canvasWidth / Math.max(1, canvasHeight);
  if (canvasAspect > targetAspect) {
    const width = canvasHeight * targetAspect;
    return { x: (canvasWidth - width) / 2, y: 0, width, height: canvasHeight };
  }
  const height = canvasWidth / targetAspect;
  return { x: 0, y: (canvasHeight - height) / 2, width: canvasWidth, height };
}

export function lockedCameraDistance(punch = 0): number {
  const fitted = perspectiveDistanceToFitFrame({
    verticalFovDegrees: FIXED_SHOT_PROFILE.verticalFovDegrees,
    aspect: FIXED_SHOT_PROFILE.compositionAspect,
    contentWidth: FIXED_SHOT_PROFILE.contentWidth,
    contentHeight: FIXED_SHOT_PROFILE.contentHeight,
    widthFill: FIXED_SHOT_PROFILE.widthFill,
    heightFill: FIXED_SHOT_PROFILE.heightFill,
    minimumDistance: FIXED_SHOT_PROFILE.baseDistance,
  });
  const zoom = Math.min(FIXED_SHOT_PROFILE.maximumScreenZoom, 1 + punch * 0.02);
  return fitted / zoom;
}

export function boardWorldBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
  const half = FIXED_SHOT_PROFILE.contentWidth / 2;
  return { minX: -half, maxX: half, minY: -half - 1.2, maxY: half + 0.4 };
}

export function viewportPolicyForRenderer(
  renderer: 'reference-2d' | 'three-3d' | 'fixed-camera-cinematic',
  width: number,
  height: number,
): {
  aspect: number;
  viewport: ContainedViewport;
  scissorTest: boolean;
} {
  if (renderer === 'fixed-camera-cinematic') {
    return {
      aspect: FIXED_SHOT_PROFILE.compositionAspect,
      viewport: containedCompositionViewport(width, height),
      scissorTest: true,
    };
  }
  return {
    aspect: width / Math.max(1, height),
    viewport: { x: 0, y: 0, width, height },
    scissorTest: false,
  };
}
