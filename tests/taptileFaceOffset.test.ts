import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TAPTILE_FACE_OFFSET_X,
  DEFAULT_TAPTILE_FACE_OFFSET_Y,
  formatTapTileFaceOffset,
  normalizeTapTileFaceOffset,
  tapTileFacePartCenter,
} from '../src/taptile/faceOffset';

describe('TapTile face offset', () => {
  it('clamps and steps authoring offsets used by DOM and canvas', () => {
    expect(normalizeTapTileFaceOffset(Number.NaN, DEFAULT_TAPTILE_FACE_OFFSET_X)).toBe(DEFAULT_TAPTILE_FACE_OFFSET_X);
    expect(normalizeTapTileFaceOffset(0.014)).toBe(0.01);
    expect(normalizeTapTileFaceOffset(0.016)).toBe(0.02);
    expect(normalizeTapTileFaceOffset(-0.4)).toBe(-0.12);
    expect(normalizeTapTileFaceOffset(0.4)).toBe(0.12);
  });

  it('keeps geometric center at 0,0 and optical defaults off-center', () => {
    expect(DEFAULT_TAPTILE_FACE_OFFSET_X).toBeLessThan(0);
    expect(DEFAULT_TAPTILE_FACE_OFFSET_Y).toBeLessThan(0);
    expect(tapTileFacePartCenter({ x: 0.5, y: 0.5 }, { x: 0, y: 0 })).toEqual({ x: 0.5, y: 0.5 });
    expect(tapTileFacePartCenter(
      { x: 0.5, y: 0.5 },
      { x: DEFAULT_TAPTILE_FACE_OFFSET_X, y: DEFAULT_TAPTILE_FACE_OFFSET_Y },
    )).toEqual({ x: 0.48, y: 0.46 });
    expect(formatTapTileFaceOffset(DEFAULT_TAPTILE_FACE_OFFSET_Y)).toBe('-4%');
  });
});
