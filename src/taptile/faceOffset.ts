/** Normalized tile-face nudge. 0,0 is the geometric center of the tile box. */

export const DEFAULT_TAPTILE_FACE_OFFSET_X = -0.02;
export const DEFAULT_TAPTILE_FACE_OFFSET_Y = -0.04;
export const MIN_TAPTILE_FACE_OFFSET = -0.12;
export const MAX_TAPTILE_FACE_OFFSET = 0.12;
export const TAPTILE_FACE_OFFSET_STEP = 0.01;

export function normalizeTapTileFaceOffset(value: number, fallback = 0): number {
  if (!Number.isFinite(value)) return fallback;
  const stepped = Math.round(value / TAPTILE_FACE_OFFSET_STEP) * TAPTILE_FACE_OFFSET_STEP;
  return Math.max(
    MIN_TAPTILE_FACE_OFFSET,
    Math.min(MAX_TAPTILE_FACE_OFFSET, Number(stepped.toFixed(2))),
  );
}

export function formatTapTileFaceOffset(value: number): string {
  const percent = Math.round(normalizeTapTileFaceOffset(value) * 100);
  return `${percent > 0 ? '+' : ''}${percent}%`;
}

export function tapTileFacePartCenter(
  transform: { x: number; y: number },
  nudge: { x: number; y: number },
): { x: number; y: number } {
  return { x: transform.x + nudge.x, y: transform.y + nudge.y };
}
