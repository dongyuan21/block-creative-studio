import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createDefaultStudioRegistry } from '../src/bootstrap/platformBootstrap';
import { CrushWoodWorkspace } from '../src/games/block-crush-drop/studio/CrushWoodWorkspace';
import { BlockPlacementWorkspace } from '../src/games/block-placement/studio/BlockPlacementWorkspace';
import { TapTileWorkspace } from '../src/games/taptile-tray-match3/studio/TapTileWorkspace';
import { StudioShell } from '../src/studio/StudioShell';

function source(relative: string): string {
  return readFileSync(resolve(process.cwd(), relative), 'utf8');
}

describe('studio shell modularization', () => {
  it('keeps App and public session free of game-specific types', () => {
    const forbidden = /GridCell|onPlace|clearSignal|domain\/types|ThreeViewport|Reference2DViewport|8×8|TapTileGameState|CompiledTapTileLevel|CrushWoodState/;
    expect(source('src/App.tsx')).not.toMatch(forbidden);
    expect(source('src/studio/StudioShell.tsx')).not.toMatch(forbidden);
    expect(source('src/studio/useProjectSession.ts')).not.toMatch(forbidden);
    expect(source('src/studio/GameWorkspaceHost.tsx')).not.toMatch(forbidden);
    expect(source('src/studio/sessionTypes.ts')).not.toMatch(/domain\/types|GridCell|TapTileGameState|CrushWoodState/);
  });

  it('registers all implemented games as available and keeps Vita Mahjong as Coming Soon', () => {
    const registry = createDefaultStudioRegistry();
    expect(registry.list().map((item) => [item.gameId, item.status])).toEqual([
      ['block-placement', 'available'],
      ['taptile-tray-match3', 'available'],
      ['block-crush-drop', 'available'],
      ['vita-mahjong-solitaire', 'coming-soon'],
    ]);
    expect(registry.require('block-placement').Workspace).toBe(BlockPlacementWorkspace);
    expect(registry.require('taptile-tray-match3').Workspace).toBe(TapTileWorkspace);
    expect(registry.require('block-crush-drop').Workspace).toBe(CrushWoodWorkspace);
    expect(typeof BlockPlacementWorkspace).toBe('function');
    expect(typeof TapTileWorkspace).toBe('function');
    expect(typeof CrushWoodWorkspace).toBe('function');
    expect(typeof StudioShell).toBe('function');
    expect(registry.get('vita-mahjong-solitaire')?.Workspace).toBeUndefined();
  });

  it('keeps the shared Toolbar on the platform session mode instead of first-game domain types', () => {
    expect(source('src/components/Toolbar.tsx')).not.toMatch(/domain\/types/);
    expect(source('src/components/Toolbar.tsx')).toMatch(/StudioSessionMode/);
  });

  it('hosts Crush Wood in the same studio-app chrome as Block Placement', () => {
    const crushWorkspace = source('src/games/block-crush-drop/studio/CrushWoodWorkspace.tsx');
    const crushAssets = source('src/games/block-crush-drop/studio/CrushWoodAssetPanel.tsx');
    const crushInspector = source('src/games/block-crush-drop/studio/CrushWoodInspector.tsx');
    const crushCss = source('src/games/block-crush-drop/studio/crushWoodWorkspace.css');
    const blockWorkspace = source('src/games/block-placement/studio/BlockPlacementWorkspace.tsx');

    expect(blockWorkspace).toMatch(/studio-app/);
    expect(crushWorkspace).toMatch(/studio-app crush-studio/);
    expect(crushWorkspace).toMatch(/onEdit=\{studio.enterEdit\}/);
    expect(crushWorkspace).toMatch(/onPlay=\{studio.beginHumanPlay\}/);
    expect(crushWorkspace).toMatch(/onAgent=\{studio.runAgent\}/);
    expect(crushWorkspace).toMatch(/className="timeline"/);
    expect(crushWorkspace).toMatch(/className="status-bar"/);
    expect(crushWorkspace).toMatch(/phone-frame/);
    expect(crushAssets).toMatch(/panel asset-panel/);
    expect(crushInspector).toMatch(/panel inspector-panel/);
    expect(crushCss).not.toMatch(/\.crush-workspace\s*\{/);
    expect(crushCss).not.toMatch(/#160b07/);
  });
});
