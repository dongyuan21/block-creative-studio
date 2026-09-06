import { describe, expect, it } from 'vitest';
import { makeTemplateProject } from '../src/taptile/stackModel';
import {
  migrateTapTileStackProjectV1,
  parseTapTileProjectV2,
  stableHash,
} from '../src/taptile/project';
import { compileTapTileLevel } from '../src/taptile/gameplay/compiler';

describe('TapTile Project V2 migration', () => {
  it('migrates V1 geometry, match identity, editor locks, and round-trips', () => {
    const legacy = makeTemplateProject('free');
    legacy.tiles[0] = { ...legacy.tiles[0]!, locked: true };
    const project = migrateTapTileStackProjectV1(legacy);
    expect(project.format).toBe('taptile-director-project');
    expect(project.schemaVersion).toBe('2.0.0');
    expect(project.level.tileInstances).toHaveLength(legacy.tiles.length);
    expect(project.level.tileInstances[0]?.authoring.editorLocked).toBe(true);
    expect(project.level.tileInstances.every((tile) => Number.isInteger(tile.geometry.centerXPx))).toBe(true);
    const first = project.level.tileInstances[0]!;
    expect(project.visuals.archetypes[first.archetypeId]?.matchKey).toBe(legacy.tiles[0]?.faceId);
    expect(parseTapTileProjectV2(JSON.parse(JSON.stringify(project)))).toEqual(project);
  });

  it('defaults older V2 projects without a snap gap to edge contact', () => {
    const serialized = JSON.parse(JSON.stringify(migrateTapTileStackProjectV1(makeTemplateProject('free')))) as {
      authoring: { snapGapPx?: number; faceOffsetX?: number; faceOffsetY?: number };
    };
    delete serialized.authoring.snapGapPx;

    expect(parseTapTileProjectV2(serialized).authoring.snapGapPx).toBe(0);
  });

  it('defaults missing face offsets to the optical-center nudge', () => {
    const serialized = JSON.parse(JSON.stringify(migrateTapTileStackProjectV1(makeTemplateProject('free')))) as {
      authoring: { faceOffsetX?: number; faceOffsetY?: number };
    };
    expect(serialized.authoring.faceOffsetX).toBe(-0.02);
    expect(serialized.authoring.faceOffsetY).toBe(-0.04);
    delete serialized.authoring.faceOffsetX;
    delete serialized.authoring.faceOffsetY;

    const parsed = parseTapTileProjectV2(serialized);
    expect(parsed.authoring.faceOffsetX).toBe(-0.02);
    expect(parsed.authoring.faceOffsetY).toBe(-0.04);
  });

  it('keeps an explicit geometric-center face offset of zero', () => {
    const serialized = JSON.parse(JSON.stringify(migrateTapTileStackProjectV1(makeTemplateProject('free')))) as {
      authoring: { faceOffsetX: number; faceOffsetY: number };
    };
    serialized.authoring.faceOffsetX = 0;
    serialized.authoring.faceOffsetY = 0;
    const parsed = parseTapTileProjectV2(serialized);
    expect(parsed.authoring.faceOffsetX).toBe(0);
    expect(parsed.authoring.faceOffsetY).toBe(0);
  });

  it('keeps gameplay hash invariant across visual theme and body changes', () => {
    const project = migrateTapTileStackProjectV1(makeTemplateProject('free'));
    const firstHash = compileTapTileLevel(project).levelHash;
    project.visuals.selectedThemeId = 'food-v1';
    project.visuals.bodyStyles['body-warm']!.fill = '#123456';
    expect(compileTapTileLevel(project).levelHash).toBe(firstHash);
  });

  it('stable-serializes object keys instead of insertion order', () => {
    expect(stableHash({ a: 1, b: { c: 2, d: 3 } })).toBe(stableHash({ b: { d: 3, c: 2 }, a: 1 }));
  });
});
