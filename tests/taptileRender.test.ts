import { describe, expect, it } from 'vitest';
import { validateFrameRenderJob, type FrameRenderJob } from '../src/exporter/fixedFrameExporter';
import { compileTapTileTake } from '../src/taptile/director';
import {
  applyTapAction,
  compileTapTileLevel,
  createInitialTapTileGameState,
} from '../src/taptile/gameplay';
import { createTapTileTake } from '../src/taptile/gameplay/take';
import {
  createDefaultTapTileProject,
  type TapTileTakeAction,
} from '../src/taptile/project';
import {
  createTapTileRenderJob,
  hashPixelBytes,
  renderTapTilePresentationFrame,
  selectTapTileRegressionFrames,
  TapTileAssetCache,
  TAPTILE_Z_BANDS,
} from '../src/taptile/render';

const ACTION_IDS = ['hourglass-43', 'hourglass-44', 'hourglass-45', 'hourglass-46', 'hourglass-47', 'hourglass-48'];

function renderFixture() {
  const project = createDefaultTapTileProject('hourglass');
  const level = compileTapTileLevel(project);
  let state = createInitialTapTileGameState(level);
  const actions: TapTileTakeAction[] = [];
  for (const [index, tileId] of ACTION_IDS.entries()) {
    const action = { id: `render-${index}`, type: 'tap' as const, actor: 'script' as const, tileId };
    const transition = applyTapAction(level, state, action);
    state = transition.after;
    actions.push({ ...action, startedAtFrame: index * 2, durationFrames: 1 });
  }
  const take = createTapTileTake(level, actions, state, { id: 'render-take', name: 'Render fixture', createdAt: '1970-01-01T00:00:00.000Z' });
  const compiled = compileTapTileTake(level, take, project.director.profiles['combo-rush']!, { seed: 44 });
  return { project, level, take, compiled };
}

function fakeCanvas(): HTMLCanvasElement {
  const gradient = { addColorStop: () => undefined };
  const context = new Proxy({
    globalAlpha: 1,
    createLinearGradient: () => gradient,
    getImageData: () => ({ data: new Uint8ClampedArray(1080 * 4) }),
    measureText: () => ({ width: 0 }),
  } as unknown as CanvasRenderingContext2D, {
    get(target, property) {
      const value = Reflect.get(target as unknown as object, property);
      return value ?? (() => undefined);
    },
    set(target, property, value) {
      Reflect.set(target as unknown as object, property, value);
      return true;
    },
  });
  return { width: 1080, height: 1920, getContext: () => context } as unknown as HTMLCanvasElement;
}

describe('generic fixed-frame render jobs', () => {
  it('validates dimensions, frame count and every evaluator result before encoding', () => {
    let evaluations = 0;
    const job: FrameRenderJob<{ index: number }> = {
      width: 1080,
      height: 1920,
      fps: 30,
      totalFrames: 9,
      evaluate: (index) => { evaluations += 1; return { index }; },
      render: () => undefined,
    };
    expect(validateFrameRenderJob(job)).toEqual({ valid: true, errors: [] });
    expect(evaluations).toBe(9);
    expect(validateFrameRenderJob({ ...job, width: 1079 }).errors).toContain('H.264 输出宽高必须是偶数。');
    expect(validateFrameRenderJob({ ...job, totalFrames: 0 }).valid).toBe(false);
  });
});

describe('TapTile Canvas render pipeline', () => {
  it('deduplicates asset decoding and freezes asset versions', async () => {
    const project = createDefaultTapTileProject('hourglass');
    let decodes = 0;
    const cache = new TapTileAssetCache(project, {
      image: async () => { decodes += 1; return {} as CanvasImageSource; },
    });
    await Promise.all([
      cache.load('classic-tile-surface-v1'),
      cache.load('classic-tile-surface-v1'),
      cache.preload(['classic-tile-surface-v1', 'classic-tile-surface-v1']),
    ]);
    expect(decodes).toBe(1);
    expect(cache.has('classic-tile-surface-v1')).toBe(true);
    const same = new TapTileAssetCache(structuredClone(project), { image: async () => ({} as CanvasImageSource) });
    expect(same.versionHash).toBe(cache.versionHash);
    project.assets.entries['classic-tile-surface-v1']!.version = '2';
    expect(new TapTileAssetCache(project).versionHash).not.toBe(cache.versionHash);
    cache.dispose();
    expect(cache.has('classic-tile-surface-v1')).toBe(false);
  });

  it('freezes project/level/take/skin/director identity for one job', () => {
    const { project, level, compiled } = renderFixture();
    const first = createTapTileRenderJob(project, level, compiled, { image: async () => ({} as CanvasImageSource) });
    const second = createTapTileRenderJob(project, level, compiled, { image: async () => ({} as CanvasImageSource) });
    expect(second.identity).toEqual(first.identity);
    expect(Object.isFrozen(first.project)).toBe(true);
    expect(Object.isFrozen(first.project.visuals)).toBe(true);
    project.visuals.selectedThemeId = 'food-v1';
    expect(first.project.visuals.selectedThemeId).toBe('animals-v1');
    const foodJob = createTapTileRenderJob(project, level, compiled, { image: async () => ({} as CanvasImageSource) });
    expect(foodJob.identity.levelHash).toBe(first.identity.levelHash);
    expect(foodJob.identity.finalStateHash).toBe(first.identity.finalStateHash);
    expect(foodJob.identity.skinHash).not.toBe(first.identity.skinHash);
  });

  it('uses exact 1080×1920 geometry and monotonically ordered zBands', () => {
    const { project, level, compiled } = renderFixture();
    const cache = new TapTileAssetCache(project, { image: async () => ({} as CanvasImageSource) });
    const frame = compiled.actions[0]!.timing.flightStartFrame;
    const presentation = createTapTileRenderJob(project, level, compiled, { image: async () => ({} as CanvasImageSource) }).evaluate(frame);
    const trace = renderTapTilePresentationFrame(fakeCanvas(), presentation, { project, level, assets: cache });
    expect(trace.width).toBe(1080);
    expect(trace.height).toBe(1920);
    expect(trace.items.map((item) => item.band)).toEqual([...trace.items.map((item) => item.band)].sort((left, right) => left - right));
    expect(trace.items.some((item) => item.band === TAPTILE_Z_BANDS.board)).toBe(true);
    expect(trace.items.some((item) => item.band === TAPTILE_Z_BANDS.moving)).toBe(true);
    const tray = project.stage.safeAreas.tray!;
    expect(trace.items.find((item) => item.id === 'tray')?.bounds).toEqual({ x: tray.left, y: tray.top, width: tray.width, height: tray.height });
  });

  it('selects deterministic visual regression checkpoints from the compiled timeline', () => {
    const { compiled } = renderFixture();
    const checkpoints = selectTapTileRegressionFrames(compiled);
    expect(checkpoints.map((checkpoint) => checkpoint.label)).toEqual([
      'initial',
      'first-click',
      'first-flight-midpoint',
      'first-tray-reorder',
      'first-match',
      'ending',
    ]);
    expect(checkpoints.every((checkpoint) => checkpoint.frameNumber >= 0 && checkpoint.frameNumber < compiled.totalFrames)).toBe(true);
  });

  it('hashes identical pixels identically and catches one-byte drift', () => {
    const first = new Uint8ClampedArray([0, 1, 2, 3, 4, 5]);
    const second = new Uint8ClampedArray(first);
    expect(hashPixelBytes(second)).toBe(hashPixelBytes(first));
    second[5] = 6;
    expect(hashPixelBytes(second)).not.toBe(hashPixelBytes(first));
  });
});
