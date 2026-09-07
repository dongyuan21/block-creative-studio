import { describe, expect, it } from 'vitest';
import {
  TAPTILE_OVERLAY_FACE_INSET,
  TAPTILE_OVERLAY_FACE_MAX_SCALE,
  TAPTILE_OVERLAY_FACE_SCALE,
  fitOverlayFaceTransform,
} from '../src/taptile/faceFit';
import { createDefaultTapTileProject } from '../src/taptile/project';
import { renderFaceAssembly, TapTileAssetRegistry, validateSkinPack } from '../src/taptile/visual';

describe('TapTile overlay face fit', () => {
  it('keeps default overlay faces inside the porcelain rim', () => {
    expect(TAPTILE_OVERLAY_FACE_SCALE).toBeLessThan(TAPTILE_OVERLAY_FACE_MAX_SCALE);
    expect(TAPTILE_OVERLAY_FACE_INSET).toBeGreaterThan(0.1);
    const project = createDefaultTapTileProject('hourglass');
    for (const themeId of ['animals-v1', 'food-v1']) {
      const report = validateSkinPack(project, themeId);
      expect(report.valid, report.issues.map((issue) => issue.code).join(',')).toBe(true);
      expect(report.issues.some((issue) => issue.code === 'OVERLAY_OUTSIDE_SAFE_AREA')).toBe(false);
    }
    const assembly = Object.values(project.visuals.faceAssemblies)[0]!;
    const part = assembly.parts[0]!;
    expect(part.transform.scaleX).toBe(TAPTILE_OVERLAY_FACE_SCALE);
    expect(part.transform.scaleY).toBe(TAPTILE_OVERLAY_FACE_SCALE);
  });

  it('clamps oversized overlay parts at render time without rewriting authored data', () => {
    const oversized = {
      x: 0.5,
      y: 0.51,
      scaleX: 0.9,
      scaleY: 0.9,
      rotationDeg: 0,
      opacity: 1,
    };
    const fitted = fitOverlayFaceTransform(oversized);
    expect(Math.abs(fitted.scaleX)).toBe(TAPTILE_OVERLAY_FACE_MAX_SCALE);
    expect(Math.abs(fitted.scaleY)).toBe(TAPTILE_OVERLAY_FACE_MAX_SCALE);
    expect(fitted.x - Math.abs(fitted.scaleX) / 2).toBeGreaterThanOrEqual(TAPTILE_OVERLAY_FACE_INSET - 1e-9);
    expect(fitted.x + Math.abs(fitted.scaleX) / 2).toBeLessThanOrEqual(1 - TAPTILE_OVERLAY_FACE_INSET + 1e-9);

    const project = createDefaultTapTileProject('hourglass');
    const archetypeId = project.level.tileInstances[0]!.archetypeId;
    const binding = project.visuals.themes['animals-v1']!.bindings[archetypeId]!;
    const assembly = project.visuals.faceAssemblies[binding.faceAssemblyId]!;
    assembly.parts[0]!.transform = oversized;
    const rendered = renderFaceAssembly(assembly, new TapTileAssetRegistry(project.assets));
    expect(Math.abs(rendered.parts[0]!.transform.scaleX)).toBe(TAPTILE_OVERLAY_FACE_MAX_SCALE);
    expect(assembly.parts[0]!.transform.scaleX).toBe(0.9);
  });
});
