import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  analyzeArchitecture,
  LEGACY_ALLOWLIST,
} from '../scripts/check-architecture.mjs';

const scratchRoots: string[] = [];

function scratchRepo(): string {
  const root = mkdtempSync(resolve(tmpdir(), 'bcs-architecture-'));
  scratchRoots.push(root);
  return root;
}

function writeSource(root: string, relative: string, source: string): void {
  const file = resolve(root, relative);
  mkdirSync(resolve(file, '..'), { recursive: true });
  writeFileSync(file, source);
}

function importLine(names: string, specifier: string): string {
  return `import { ${names} } from ${JSON.stringify(specifier)};`;
}

afterEach(() => {
  while (scratchRoots.length > 0) {
    const root = scratchRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('architecture import guards', () => {
  it('accepts the current repository and records the decreasing legacy allowlist', () => {
    const result = analyzeArchitecture();
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
    expect(result.allowlist).toEqual(LEGACY_ALLOWLIST);
    expect(result.debt.map((item) => item.id).sort()).toEqual(
      LEGACY_ALLOWLIST.map((item) => item.id).sort(),
    );
    expect(LEGACY_ALLOWLIST.map((item) => item.retireIn).every((item) => item === 'R7' || item === 'R9')).toBe(true);
  });

  it('rejects headless imports of games, UI runtimes, and scenes', () => {
    const root = scratchRepo();
    writeSource(root, 'src/games/block-placement/index.ts', 'export const gameId = "block-placement";\n');
    writeSource(root, 'src/renderer/StudioScene.ts', 'export class StudioScene {}\n');
    writeSource(
      root,
      'src/headless/bad.ts',
      [
        importLine('gameId', '../games/block-placement/index'),
        'import { WebGLRenderer } from "three";',
        importLine('StudioScene', '../renderer/StudioScene'),
        'void gameId;',
        'void WebGLRenderer;',
        'void StudioScene;',
        '',
      ].join('\n'),
    );
    const result = analyzeArchitecture(root, { checkStale: false });
    expect(result.violations.map((item) => item.code).sort()).toEqual([
      'HEADLESS_IMPORTS_GAME',
      'HEADLESS_IMPORTS_SCENE',
      'HEADLESS_IMPORTS_UI_RUNTIME',
    ]);
  });

  it('rejects game-runtime imports of games, React, and renderer modules', () => {
    const root = scratchRepo();
    writeSource(root, 'src/games/block-placement/index.ts', 'export const gameId = "block-placement";\n');
    writeSource(root, 'src/renderer/pbrMaterialFactory.ts', 'export const factory = true;\n');
    writeSource(
      root,
      'src/game-runtime/bad.ts',
      [
        'import { createElement } from "react";',
        importLine('gameId', '../games/block-placement/index'),
        importLine('factory', '../renderer/pbrMaterialFactory'),
        'void createElement;',
        'void gameId;',
        'void factory;',
        '',
      ].join('\n'),
    );
    const result = analyzeArchitecture(root, { checkStale: false });
    expect(result.violations.map((item) => item.code).sort()).toEqual([
      'GAME_RUNTIME_IMPORTS_GAME',
      'GAME_RUNTIME_IMPORTS_RENDERER',
      'GAME_RUNTIME_IMPORTS_UI',
    ]);
  });

  it('rejects one game importing another', () => {
    const root = scratchRepo();
    writeSource(root, 'src/games/block-crush/index.ts', 'export const crush = true;\n');
    writeSource(
      root,
      'src/games/block-placement/index.ts',
      `${importLine('crush', '../block-crush/index')}\nvoid crush;\n`,
    );
    const result = analyzeArchitecture(root, { checkStale: false });
    expect(result.violations).toEqual([
      {
        code: 'GAME_IMPORTS_OTHER_GAME',
        importer: 'src/games/block-placement/index.ts',
        target: 'src/games/block-crush/index.ts',
      },
    ]);
  });

  it('rejects new exporter-to-scene debt that is not on the allowlist', () => {
    const root = scratchRepo();
    writeSource(root, 'src/domain/gameEngine.ts', 'export const applyPlacement = () => null;\n');
    writeSource(
      root,
      'src/exporter/offlineVideoExporter.ts',
      `${importLine('applyPlacement', '../domain/gameEngine')}\nvoid applyPlacement;\n`,
    );
    const result = analyzeArchitecture(root, { allowlist: [], checkStale: false });
    expect(result.violations).toEqual([
      {
        code: 'UNLISTED_LEGACY_DEBT',
        importer: 'src/exporter/offlineVideoExporter.ts',
        target: 'src/domain/gameEngine.ts',
        pattern: 'exporter-block-runtime',
      },
    ]);
  });
});
