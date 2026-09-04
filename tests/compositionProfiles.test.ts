import { describe, expect, it } from 'vitest';
import { createCalibrationCase, defaultCalibrationRois, expandGoldenSceneCases } from '../src/headless/calibration';
import {
  DESIGN_BOARD_OUTER,
  DESIGN_RESOLUTION,
  VIDEO_RESOLUTION,
  boardScreenRectInSpace,
  designToVideoMapping,
  mapDesignPointToVideo,
} from '../src/headless/coordinateMapping';
import { mapComposition, type CompositionProfile } from '../src/rendering/composition';
import {
  getDefaultCalibrationProfile,
  getDefaultCompositionProfile,
  registerCalibrationProfile,
  registerCompositionProfile,
} from '../src/rendering/compositionRegistry';
import { mapClientPointToComposition } from '../src/renderer/shotProfile';
import { BLOCK_PLACEMENT_CALIBRATION_PROFILE_ID } from '../src/games/block-placement/profiles/calibration';
import { BLOCK_PLACEMENT_COMPOSITION_PROFILE_ID } from '../src/games/block-placement/profiles/composition';
import { REFERENCE_LAYOUT } from '../src/reference2d/referenceProfile';

describe('composition profiles', () => {
  it('keeps the Block Placement 1064×1788 → 1080×1920 contain mapping', () => {
    const mapping = designToVideoMapping();
    expect(DESIGN_RESOLUTION).toEqual({ width: 1064, height: 1788 });
    expect(VIDEO_RESOLUTION).toEqual({ width: 1080, height: 1920 });
    expect(DESIGN_BOARD_OUTER).toEqual({ x: 80, y: 309, size: 912 });
    expect(mapping.scale).toBeCloseTo(1080 / 1064, 8);
    expect(mapping.drawWidth).toBeCloseTo(1080, 6);
    expect(mapping.drawHeight).toBeLessThan(1920);
    expect(mapping.offsetX).toBeCloseTo(0, 6);
    expect(mapping.offsetY).toBeGreaterThan(0);
    const board = boardScreenRectInSpace('video');
    const designBoard = boardScreenRectInSpace('design');
    expect(designBoard).toEqual({ x: 80, y: 309, width: 912, height: 912 });
    expect(board.width / designBoard.width).toBeCloseTo(mapping.scale, 8);
    expect(mapDesignPointToVideo(532, 213)).toEqual({
      x: mapping.offsetX + 532 * mapping.scale,
      y: mapping.offsetY + 213 * mapping.scale,
    });
    expect(REFERENCE_LAYOUT.board.outer).toMatchObject({ x: 80, y: 309, size: 912 });
  });

  it('keeps current calibration ROIs and records profile identities on cases', () => {
    expect(defaultCalibrationRois()).toEqual([
      { id: 'board', x: 80, y: 309, width: 912, height: 912 },
      { id: 'grid', x: 91, y: 321, width: 892, height: 892 },
      { id: 'hud-score', x: 372, y: 165, width: 320, height: 96 },
      { id: 'tray', x: 80, y: 1320, width: 904, height: 280 },
    ]);
    const cases = expandGoldenSceneCases(
      [{ id: 'profile-check', startFrame: 0, peakFrame: 10, endFrame: 20, purpose: 'identity' }],
      {
        correspondence: 'isolated-presentation',
        reviewStatus: 'BLOCKED',
        unresolvedReasons: ['public fixture only'],
      },
    );
    expect(cases).toHaveLength(3);
    expect(cases.every((item) => item.compositionProfileId === BLOCK_PLACEMENT_COMPOSITION_PROFILE_ID)).toBe(true);
    expect(cases.every((item) => item.calibrationProfileId === BLOCK_PLACEMENT_CALIBRATION_PROFILE_ID)).toBe(true);
    expect(getDefaultCompositionProfile().id).toBe(BLOCK_PLACEMENT_COMPOSITION_PROFILE_ID);
    expect(getDefaultCalibrationProfile().id).toBe(BLOCK_PLACEMENT_CALIBRATION_PROFILE_ID);
  });

  it('rejects letterbox picks outside the cinematic composition', () => {
    const miss = mapClientPointToComposition({
      clientX: 10,
      clientY: 540,
      rect: { left: 0, top: 0, width: 1920, height: 1080 },
      renderer: 'fixed-camera-cinematic',
      canvasWidth: 1920,
      canvasHeight: 1080,
    });
    expect(miss.inside).toBe(false);
  });

  it('maps a foreign composition profile without changing shared Block constants', () => {
    const crush: CompositionProfile = {
      id: 'block-crush.composition.diag',
      version: '0.0.1',
      gameId: 'block-crush-drop',
      designResolution: { width: 720, height: 1280 },
      videoResolution: { width: 1080, height: 1920 },
      playfield: { x: 40, y: 200, width: 640, height: 640 },
    };
    registerCompositionProfile(crush);
    const mapping = mapComposition(crush);
    expect(mapping.scale).toBeCloseTo(1080 / 720, 8);
    expect(mapping.drawWidth).toBeCloseTo(1080, 6);
    expect(DESIGN_RESOLUTION).toEqual({ width: 1064, height: 1788 });
    expect(VIDEO_RESOLUTION).toEqual({ width: 1080, height: 1920 });
    expect(getDefaultCompositionProfile().id).toBe(BLOCK_PLACEMENT_COMPOSITION_PROFILE_ID);
  });

  it('resolves calibration ROIs from the requested profile at call time', () => {
    const crushCalibration = {
      id: 'block-crush-drop.calibration.test',
      version: '0.0.1',
      gameId: 'block-crush-drop',
      compositionProfileId: 'block-crush.composition.diag',
      rois: [{ id: 'well', x: 10, y: 20, width: 30, height: 40 }],
    };
    registerCalibrationProfile(crushCalibration);
    const crushCase = createCalibrationCase({
      id: 'crush-only',
      eventId: 'impact',
      eventType: 'block-crush.impact',
      targetFrame: 0,
      correspondence: 'isolated-presentation',
      calibrationProfileId: crushCalibration.id,
    });
    expect(crushCase.roi).toEqual(crushCalibration.rois);
    expect(crushCase.compositionProfileId).toBe(crushCalibration.compositionProfileId);
    expect(getDefaultCalibrationProfile().id).toBe(BLOCK_PLACEMENT_CALIBRATION_PROFILE_ID);
    expect(() => createCalibrationCase({
      id: 'no-profile',
      eventId: 'impact',
      eventType: 'block-crush.impact',
      targetFrame: 0,
      correspondence: 'isolated-presentation',
    })).toThrow(/calibrationProfileId/);
  });
});
