import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BlockPlacementWorkspace } from '../src/games/block-placement/studio/BlockPlacementWorkspace';
import { TapTileWorkspace } from '../src/games/taptile-tray-match3/studio/TapTileWorkspace';
import { createDefaultStudioRegistry } from '../src/bootstrap/platformBootstrap';
import { StudioShell } from '../src/studio/StudioShell';

function source(relative: string): string {
  return readFileSync(resolve(process.cwd(), relative), 'utf8');
}

describe('studio shell modularization', () => {
  it('keeps App and public session free of game-specific types', () => {
    const forbidden = /GridCell|onPlace|clearSignal|domain\/types|ThreeViewport|Reference2DViewport|8×8|TapTileGameState|CompiledTapTileLevel/;
    expect(source('src/App.tsx')).not.toMatch(forbidden);
    expect(source('src/studio/StudioShell.tsx')).not.toMatch(forbidden);
    expect(source('src/studio/useProjectSession.ts')).not.toMatch(forbidden);
    expect(source('src/studio/GameWorkspaceHost.tsx')).not.toMatch(forbidden);
    expect(source('src/studio/sessionTypes.ts')).not.toMatch(/domain\/types|GridCell|TapTileGameState/);
  });

  it('registers Block Placement and TapTile as available workspaces and keeps Coming Soon cards', () => {
    const registry = createDefaultStudioRegistry();
    expect(registry.list().map((item) => [item.gameId, item.status])).toEqual([
      ['block-placement', 'available'],
      ['taptile-tray-match3', 'available'],
      ['block-crush-drop', 'coming-soon'],
      ['vita-mahjong-solitaire', 'coming-soon'],
    ]);
    expect(registry.require('block-placement').Workspace).toBe(BlockPlacementWorkspace);
    expect(registry.require('taptile-tray-match3').Workspace).toBe(TapTileWorkspace);
    expect(typeof BlockPlacementWorkspace).toBe('function');
    expect(typeof TapTileWorkspace).toBe('function');
    expect(typeof StudioShell).toBe('function');
    expect(registry.get('block-crush-drop')?.Workspace).toBeUndefined();
  });

  it('keeps TapTile workspace free of DOM market hacks and other-game imports', () => {
    expect(source('src/games/taptile-tray-match3/studio/TapTileWorkspace.tsx')).not.toMatch(/game-market-card|Block Placement|onOpenBlockStudio/);
    expect(source('src/games/taptile-tray-match3/studio/TapTileStackStudio.tsx')).not.toMatch(/onOpenBlockStudio|game-market-card/);
    expect(source('src/games/taptile-tray-match3/package.ts')).toMatch(/presentation: tapTilePresentationAdapter/);
    expect(source('src/games/taptile-tray-match3/package.ts')).toMatch(/renderContract: tapTileRenderContract/);
  });
});
