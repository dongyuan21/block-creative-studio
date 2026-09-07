import type { FacePartTransform } from './project/types';

/** Keep a porcelain / body rim around overlay-on-body faces. */
export const TAPTILE_OVERLAY_FACE_INSET = 0.22;
export const TAPTILE_OVERLAY_FACE_MAX_SCALE = 1 - 2 * TAPTILE_OVERLAY_FACE_INSET;
export const TAPTILE_OVERLAY_FACE_SCALE = 0.52;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function clampSignedScale(value: number, maxAbs: number): number {
  const sign = value < 0 ? -1 : 1;
  return sign * Math.min(Math.abs(value), maxAbs);
}

export function fitOverlayFaceTransform(transform: FacePartTransform): FacePartTransform {
  const scaleX = clampSignedScale(transform.scaleX, TAPTILE_OVERLAY_FACE_MAX_SCALE);
  const scaleY = clampSignedScale(transform.scaleY, TAPTILE_OVERLAY_FACE_MAX_SCALE);
  const halfX = Math.abs(scaleX) / 2;
  const halfY = Math.abs(scaleY) / 2;
  const minX = TAPTILE_OVERLAY_FACE_INSET + halfX;
  const maxX = 1 - TAPTILE_OVERLAY_FACE_INSET - halfX;
  const minY = TAPTILE_OVERLAY_FACE_INSET + halfY;
  const maxY = 1 - TAPTILE_OVERLAY_FACE_INSET - halfY;
  return {
    ...transform,
    x: clamp(transform.x, Math.min(minX, maxX), Math.max(minX, maxX)),
    y: clamp(transform.y, Math.min(minY, maxY), Math.max(minY, maxY)),
    scaleX,
    scaleY,
  };
}
