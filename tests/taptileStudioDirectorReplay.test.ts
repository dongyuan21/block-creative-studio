import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  tapTileShowsPlayOverlay,
  tapTileUsesDirectorCanvas,
} from '../src/taptile/workspace/WorkspaceMode';

function source(relative: string): string {
  return readFileSync(resolve(process.cwd(), relative), 'utf8');
}

describe('TapTile director replay surface', () => {
  it('keeps the win overlay on live play and the canvas on director frames', () => {
    expect(tapTileShowsPlayOverlay('play')).toBe(true);
    expect(tapTileShowsPlayOverlay('replay')).toBe(false);
    expect(tapTileShowsPlayOverlay('direct')).toBe(false);
    expect(tapTileShowsPlayOverlay('export')).toBe(false);
    expect(tapTileUsesDirectorCanvas('direct')).toBe(true);
    expect(tapTileUsesDirectorCanvas('export')).toBe(true);
    expect(tapTileUsesDirectorCanvas('replay')).toBe(false);
    expect(tapTileUsesDirectorCanvas('play')).toBe(false);
  });

  it('lands saved and Agent takes on director frames instead of step-replay WON', () => {
    const studio = source('src/taptile/TapTileStackStudio.tsx');
    expect(studio).not.toMatch(/setWorkspaceMode\('replay'\)/);
    expect(studio).toMatch(/const showDirectorTake = /);
    expect(studio).toMatch(/saveCurrentTake[\s\S]*showDirectorTake\(take/);
    expect(studio).toMatch(/showDirectorTake\(result\.take,\s*\{\s*play:\s*true/);
    expect(studio).toMatch(/tapTileShowsPlayOverlay\(workspaceMode\) && displayState/);
    expect(studio).toMatch(/if \(!tapTileUsesDirectorCanvas\(workspaceMode\)\) \{\s*setWorkspaceMode\('direct'\);\s*[\s\S]*setDirectorPlaying\(true\)/);
  });

  it('keeps the export button in a footer so Seed and rhythm stay readable', () => {
    const inspector = source('src/games/taptile-tray-match3/studio/TapTileInspector.tsx');
    const css = source('src/games/taptile-tray-match3/studio/tapTileWorkspace.css');
    expect(inspector).toMatch(/className="inspector-scroll"/);
    expect(inspector).toMatch(/<\/div>\s*<section\s+className="export-section"/);
    expect(inspector).toMatch(/导出成片/);
    expect(css).toMatch(/\.taptile-studio \.inspector-panel[\s\S]*overflow:\s*hidden/);
    expect(css).toMatch(/\.taptile-studio \.inspector-scroll[\s\S]*overflow-y:\s*auto/);
    expect(css).toMatch(/\.taptile-studio \.export-section[\s\S]*position:\s*sticky/);
    expect(css).toMatch(/\.taptile-studio \.export-section[\s\S]*flex:\s*0 0 auto/);
  });
});
