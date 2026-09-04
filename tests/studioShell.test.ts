import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BlockPlacementWorkspace } from '../src/games/block-placement/studio/BlockPlacementWorkspace';
import { createDefaultStudioRegistry } from '../src/bootstrap/platformBootstrap';
import { StudioShell } from '../src/studio/StudioShell';

function source(relative: string): string {
  return readFileSync(resolve(process.cwd(), relative), 'utf8');
}

describe('studio shell modularization', () => {
  it('keeps App and public session free of Block Placement types', () => {
    const forbidden = /GridCell|onPlace|clearSignal|domain\/types|ThreeViewport|Reference2DViewport|8×8/;
    expect(source('src/App.tsx')).not.toMatch(forbidden);
    expect(source('src/studio/StudioShell.tsx')).not.toMatch(forbidden);
    expect(source('src/studio/useProjectSession.ts')).not.toMatch(forbidden);
    expect(source('src/studio/GameWorkspaceHost.tsx')).not.toMatch(forbidden);
    expect(source('src/studio/sessionTypes.ts')).not.toMatch(/domain\/types|GridCell/);
  });

  it('registers Block Placement as the only available workspace and keeps Coming Soon cards', () => {
    const registry = createDefaultStudioRegistry();
    expect(registry.list().map((item) => [item.gameId, item.status])).toEqual([
      ['block-placement', 'available'],
      ['block-crush-drop', 'coming-soon'],
      ['vita-mahjong-solitaire', 'coming-soon'],
    ]);
    expect(registry.require('block-placement').Workspace).toBe(BlockPlacementWorkspace);
    expect(typeof BlockPlacementWorkspace).toBe('function');
    expect(typeof StudioShell).toBe('function');
    expect(registry.get('block-crush-drop')?.Workspace).toBeUndefined();
  });
});
