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
});
