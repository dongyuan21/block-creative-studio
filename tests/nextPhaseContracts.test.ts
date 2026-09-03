import { describe, expect, it } from 'vitest';
import { designToVideoMapping, mapDesignPointToVideo, boardScreenRectInSpace, DESIGN_RESOLUTION, VIDEO_RESOLUTION } from '../src/headless/coordinateMapping';
import { createFrameRenderRequest, validateFrameRenderRequest, presentationSeconds } from '../src/headless/frameRequest';
import { compileMaterialRuntime, sampleOrmChannel, combineFactorAndSample } from '../src/headless/materialRuntime';
import { expandGoldenSceneCases, summarizeCalibrationCases } from '../src/headless/calibration';
import { compareCalibrationFrames, calibrationScore } from '../src/reference2d/calibrationMetrics';
import { makeFixture } from './headlessFixtures';
import {
  consecutiveTake,
  crossClearTake,
  endgameSnapshot,
  idleSnapshot,
  illegalPreviewSnapshot,
  legalPreviewCells,
  publicSceneCatalog,
  singleClearTake,
  takeStateIdentity,
} from '../src/domain/publicFixtures';
import { applyPlacement, canPlace } from '../src/domain/gameEngine';
import { compileTake, evaluateCompiledTake } from '../src/director/presentationCompiler';
import { RHYTHM_PRESETS } from '../src/director/rhythmPresets';
import { containedCompositionViewport, lockedCameraDistance, FIXED_SHOT_PROFILE } from '../src/renderer/shotProfile';
import { REFERENCE_PASS_ORDER } from '../src/headless/contracts';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const goldenIndex = JSON.parse(
  readFileSync(resolve(process.cwd(), 'docs/reference/v2/GOLDEN_SCENE_INDEX_V1.json'), 'utf8'),
) as {
  sourceVideoSha256: string;
  scenes: Array<{ id: string; startFrame: number; peakFrame: number; endFrame: number; purpose: string }>;
};

describe('coordinate mapping', () => {
  it('letterboxes 1064×1788 into 1080×1920 without stretch', () => {
    const mapping = designToVideoMapping();
    expect(mapping.scale).toBeCloseTo(1080 / 1064, 8);
    expect(mapping.drawWidth).toBeCloseTo(1080, 6);
    expect(mapping.drawHeight).toBeLessThan(1920);
    expect(mapping.offsetX).toBeCloseTo(0, 6);
    expect(mapping.offsetY).toBeGreaterThan(0);
    const board = boardScreenRectInSpace('video');
    const designBoard = boardScreenRectInSpace('design');
    expect(board.width / designBoard.width).toBeCloseTo(mapping.scale, 8);
  });

  it('maps the score center through the same contain transform', () => {
    const mapped = mapDesignPointToVideo(532, 213);
    const mapping = designToVideoMapping();
    expect(mapped.x).toBeCloseTo(mapping.offsetX + 532 * mapping.scale, 8);
  });
});

describe('frame render request', () => {
  it('defaults to native design pixels and presentation-frame time', () => {
    const request = createFrameRenderRequest({
      planId: 'plan',
      planHash: 'fnv1a32:1',
      takeId: 'take',
      takeHash: 'fnv1a32:2',
      frameIndex: 12,
      fps: 30,
      renderer: 'reference-2d',
    });
    expect(request.targetPixels).toEqual(DESIGN_RESOLUTION);
    expect(request.timeBase).toBe('presentation-frame');
    expect(validateFrameRenderRequest(request)).toEqual([]);
    expect(presentationSeconds(30, 30)).toBe(1);
  });

  it('rejects a video-space request that still uses design pixels', () => {
    const request = createFrameRenderRequest({
      planId: 'plan',
      planHash: 'h',
      takeId: 't',
      takeHash: 'h',
      frameIndex: 0,
      fps: 30,
      renderer: 'reference-2d',
      coordinateSpace: 'video',
    });
    request.targetPixels = { ...DESIGN_RESOLUTION };
    expect(validateFrameRenderRequest(request).some((issue) => issue.code === 'FRAME_PIXEL_SIZE_MISMATCH')).toBe(true);
  });
});

describe('public fixtures', () => {
  it('covers the required baseline scenes', () => {
    expect(publicSceneCatalog().map((scene) => scene.id)).toEqual([
      'idle',
      'pickup',
      'legal-preview',
      'illegal-preview',
      'single-clear',
      'cross-clear',
      'consecutive',
      'endgame',
    ]);
    expect(idleSnapshot().status).toBe('playing');
    expect(endgameSnapshot().status).toBe('game-over');
    expect(illegalPreviewSnapshot().pieces.some((piece) => piece.shapeId === 'square-3')).toBe(true);
    expect(legalPreviewCells().rows).toEqual([6]);
  });

  it('keeps take identities stable and gameplay-valid', () => {
    const take = singleClearTake();
    const first = JSON.stringify(takeStateIdentity(take));
    const second = JSON.stringify(takeStateIdentity(singleClearTake()));
    expect(first).toBe(second);
    const move = take.actions[0];
    expect(move).toBeDefined();
    if (!move) throw new Error('missing action');
    expect(canPlace(take.initial.board, take.initial.pieces[0]!, move.anchor)).toBe(true);
    expect(applyPlacement(take.initial, move)?.clear.rows).toEqual([6]);
    expect(crossClearTake().actions).toHaveLength(1);
    expect(consecutiveTake().actions).toHaveLength(2);
  });

  it('compiles the slice take deterministically', () => {
    const take = singleClearTake();
    const compiled = compileTake(take, RHYTHM_PRESETS['human-natural'], 30);
    const a = evaluateCompiledTake(compiled, 40, RHYTHM_PRESETS['human-natural']);
    const b = evaluateCompiledTake(compiled, 40, RHYTHM_PRESETS['human-natural']);
    expect(a.snapshot.score).toBe(b.snapshot.score);
    expect(a.board.cells).toEqual(b.board.cells);
    const shuffled = evaluateCompiledTake(compiled, 90, RHYTHM_PRESETS['human-natural']);
    const back = evaluateCompiledTake(compiled, 40, RHYTHM_PRESETS['human-natural']);
    expect(back.snapshot.score).toBe(a.snapshot.score);
    expect(shuffled.frame).toBe(90);
  });
});

describe('material runtime', () => {
  it('compiles packs without requiring preset names', () => {
    const { material } = makeFixture();
    material.id = 'material.aurora-shell';
    material.behavior.materialClass = 'custom';
    const runtime = compileMaterialRuntime({
      pack: material,
      maps: [
        { slot: 'baseColor', uri: 'bcs-asset://sha256/aa', contentHash: 'sha256:aa', colorSpace: 'srgb' },
        { slot: 'orm', uri: 'bcs-asset://sha256/bb', contentHash: 'sha256:bb', channels: 'rgb', colorSpace: 'linear' },
        { slot: 'normal', uri: 'bcs-asset://sha256/cc', contentHash: 'sha256:cc', colorSpace: 'linear', normalY: 'opengl' },
      ],
    });
    expect(runtime.id).toBe('material.aurora-shell');
    expect(runtime.behaviorPending).toBe(true);
    expect(runtime.capabilities.materialAwareFracture).toBe('pending');
    expect(sampleOrmChannel({ r: 0.2, g: 0.4, b: 0.8 }, 'roughness')).toBe(0.4);
    expect(sampleOrmChannel({ r: 0.2, g: 0.4, b: 0.8 }, 'metallic')).toBe(0.8);
    expect(combineFactorAndSample(0.5, 0.4, 'multiply-factor')).toBeCloseTo(0.2);
    expect(combineFactorAndSample(0.5, 0.4, 'replace')).toBeCloseTo(0.4);
  });

  it('rejects unspecified normal Y instead of flipping silently', () => {
    const { material } = makeFixture();
    try {
      compileMaterialRuntime({
        pack: material,
        maps: [{ slot: 'normal', uri: 'x', contentHash: 'sha256:n', colorSpace: 'linear' }],
      });
      throw new Error('expected compile to fail');
    } catch (error) {
      expect(String(error)).toMatch(/Material runtime compile failed/);
      expect(JSON.stringify((error as { details?: unknown }).details ?? error)).toMatch(/NORMAL_Y/i);
    }
  });
});

describe('golden batch', () => {
  it('lists all 13 golden scenes as BLOCKED without source video', () => {
    const cases = expandGoldenSceneCases(goldenIndex.scenes, {
      correspondence: 'exact-replay',
      reviewStatus: 'BLOCKED',
      unresolvedReasons: ['Reference source video is not in the public repository.'],
      referenceMediaHash: `sha256:${goldenIndex.sourceVideoSha256}`,
      sourceFps: 60,
      targetFps: 30,
    });
    expect(goldenIndex.scenes).toHaveLength(13);
    expect(cases).toHaveLength(39);
    expect(summarizeCalibrationCases(cases).BLOCKED).toBe(39);
    expect(cases[0]?.targetFps).toBe(30);
    expect(cases[0]?.sourcePtsSeconds).toBeTypeOf('number');
    expect(cases.every((item) => item.reviewStatus === 'BLOCKED')).toBe(true);
  });

  it('fails a deliberately shifted board comparison', () => {
    const width = 32;
    const height = 32;
    const reference = { width, height, data: new Uint8ClampedArray(width * height * 4) };
    const candidate = { width, height, data: new Uint8ClampedArray(width * height * 4) };
    for (let i = 0; i < reference.data.length; i += 4) {
      reference.data[i] = 10;
      reference.data[i + 1] = 80;
      reference.data[i + 2] = 20;
      reference.data[i + 3] = 255;
    }
    for (let i = 0; i < candidate.data.length; i += 4) {
      candidate.data[i] = 200;
      candidate.data[i + 1] = 10;
      candidate.data[i + 2] = 10;
      candidate.data[i + 3] = 255;
    }
    const comparison = compareCalibrationFrames(reference, candidate);
    expect(calibrationScore(comparison.metrics)).toBeLessThan(80);
    expect(comparison.metrics.changedPixelRatio).toBeGreaterThan(0.9);
  });
});

describe('shot profile', () => {
  it('keeps 9:16 composition when the DOM canvas changes', () => {
    const a = containedCompositionViewport(540, 960);
    const b = containedCompositionViewport(1080, 1920);
    const c = containedCompositionViewport(800, 800);
    expect(a.width / a.height).toBeCloseTo(FIXED_SHOT_PROFILE.compositionAspect, 8);
    expect(b.width / b.height).toBeCloseTo(FIXED_SHOT_PROFILE.compositionAspect, 8);
    expect(c.width / c.height).toBeCloseTo(FIXED_SHOT_PROFILE.compositionAspect, 8);
    expect(lockedCameraDistance(0)).toBeGreaterThan(17);
    expect(REFERENCE_PASS_ORDER).toHaveLength(9);
    expect(VIDEO_RESOLUTION).toEqual({ width: 1080, height: 1920 });
  });
});
