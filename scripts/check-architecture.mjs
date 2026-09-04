import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const IMPORT_PATTERNS = [
  /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/gu,
  /import\s*\(\s*['"]([^'"]+)['"]\s*\)/gu,
];

/**
 * Decreasing legacy debt. New edges that match a debt pattern must be added
 * here on purpose. Remove a row when the corresponding PR deletes the import.
 */
export const LEGACY_ALLOWLIST = [
  {
    id: 'exporter-block-compiler',
    importer: 'src/exporter/offlineVideoExporter.ts',
    target: 'src/director/presentationCompiler.ts',
    retireIn: 'R6',
  },
  {
    id: 'exporter-cinematic-scene',
    importer: 'src/exporter/offlineVideoExporter.ts',
    target: 'src/renderer/StudioScene.ts',
    retireIn: 'R6',
  },
  {
    id: 'exporter-reference-scene',
    importer: 'src/exporter/offlineVideoExporter.ts',
    target: 'src/reference2d/Reference2DScene.ts',
    retireIn: 'R6',
  },
  {
    id: 'app-block-types',
    importer: 'src/App.tsx',
    target: 'src/domain/types.ts',
    retireIn: 'R8',
  },
  {
    id: 'app-three-viewport',
    importer: 'src/App.tsx',
    target: 'src/renderer/ThreeViewport.tsx',
    retireIn: 'R8',
  },
  {
    id: 'app-reference-viewport',
    importer: 'src/App.tsx',
    target: 'src/reference2d/Reference2DViewport.tsx',
    retireIn: 'R8',
  },
  {
    id: 'integration-project-types',
    importer: 'src/integration/studioAssetCatalog.ts',
    target: 'src/domain/types.ts',
    retireIn: 'R8',
  },
  {
    id: 'integration-bridge-project-types',
    importer: 'src/integration/studioVariantBridge.ts',
    target: 'src/domain/types.ts',
    retireIn: 'R8',
  },
  {
    id: 'integration-bridge-compiler',
    importer: 'src/integration/studioVariantBridge.ts',
    target: 'src/director/presentationCompiler.ts',
    retireIn: 'R6',
  },
];

const PACKAGE_BANS = new Set(['react', 'react-dom', 'three', 'canvas']);

const IGNORED_DIRECTORIES = new Set(['node_modules', 'dist', '.git']);

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (IGNORED_DIRECTORIES.has(entry.name)) return [];
    const next = resolve(directory, entry.name);
    if (entry.isDirectory()) return walk(next);
    return ['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(extname(entry.name)) ? [next] : [];
  });
}

function toPosix(path) {
  return path.split('\\').join('/');
}

function srcPath(absolute, repositoryRoot = root) {
  return toPosix(relative(repositoryRoot, absolute));
}

function resolveSpecifier(importer, specifier) {
  if (!specifier.startsWith('.')) return specifier;
  const base = resolve(dirname(importer), specifier);
  const candidates = extname(base)
    ? [
        base,
        base.replace(/\.js$/u, '.ts'),
        base.replace(/\.js$/u, '.tsx'),
      ]
    : [
        `${base}.ts`,
        `${base}.tsx`,
        `${base}.js`,
        resolve(base, 'index.ts'),
        resolve(base, 'index.tsx'),
      ];
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? null;
}

function gameIdFromPath(path) {
  const match = /^src\/games\/([^/]+)\//u.exec(path);
  return match?.[1] ?? null;
}

function isSceneModule(path) {
  return /src\/(renderer\/(StudioScene\.ts|ThreeViewport\.tsx)|reference2d\/(Reference2DScene\.ts|Reference2DViewport\.tsx))$/u.test(path);
}

function isPlatformModule(path) {
  return /^(src\/game-runtime\/|src\/rendering\/|src\/studio\/)/u.test(path);
}

function isFirstGameEngineModule(path) {
  return (
    path === 'src/domain/gameEngine.ts'
    || path === 'src/domain/boardPresets.ts'
    || path === 'src/domain/shapes.ts'
    || path === 'src/director/presentationCompiler.ts'
  );
}

function collectImports(file) {
  const source = readFileSync(file, 'utf8');
  const specifiers = new Set();
  for (const pattern of IMPORT_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      if (match[1]) specifiers.add(match[1]);
    }
  }
  return [...specifiers];
}

function debtPattern(importer, target) {
  if (importer.startsWith('src/exporter/') && (
    target === 'src/director/presentationCompiler.ts'
    || target === 'src/renderer/StudioScene.ts'
    || target === 'src/reference2d/Reference2DScene.ts'
    || target === 'src/domain/gameEngine.ts'
  )) {
    return 'exporter-block-runtime';
  }
  if (importer === 'src/App.tsx' && (
    target === 'src/domain/types.ts'
    || target.startsWith('src/renderer/')
    || target.startsWith('src/reference2d/')
  )) {
    return 'app-block-ui';
  }
  if (importer.startsWith('src/integration/') && (
    target === 'src/domain/types.ts'
    || target === 'src/director/presentationCompiler.ts'
  )) {
    return 'integration-project';
  }
  return null;
}

export function analyzeArchitecture(repositoryRoot = root, options = {}) {
  const sourceRoot = resolve(repositoryRoot, 'src');
  const files = existsSync(sourceRoot) ? walk(sourceRoot) : [];
  const violations = [];
  const debt = [];
  const allowlisted = new Set();
  const allowlist = options.allowlist ?? LEGACY_ALLOWLIST;
  const checkStale = options.checkStale ?? repositoryRoot === root;

  for (const file of files) {
    const importer = srcPath(file, repositoryRoot);
    for (const specifier of collectImports(file)) {
      const packageName = specifier.startsWith('.') ? null : specifier.split('/')[0];
      const resolved = specifier.startsWith('.')
        ? resolveSpecifier(file, specifier)
        : null;
      const target = resolved ? srcPath(resolved, repositoryRoot) : specifier;

      if (importer.startsWith('src/headless/')) {
        if (target.startsWith('src/games/')) {
          violations.push({ code: 'HEADLESS_IMPORTS_GAME', importer, target });
        }
        if (packageName && PACKAGE_BANS.has(packageName)) {
          violations.push({ code: 'HEADLESS_IMPORTS_UI_RUNTIME', importer, target: packageName });
        }
        if (isSceneModule(target) || target.startsWith('src/reference2d/')) {
          violations.push({ code: 'HEADLESS_IMPORTS_SCENE', importer, target });
        }
      }

      if (importer.startsWith('src/game-runtime/')) {
        if (packageName && PACKAGE_BANS.has(packageName)) {
          violations.push({ code: 'GAME_RUNTIME_IMPORTS_UI', importer, target: packageName });
        }
        if (target.startsWith('src/games/') || isFirstGameEngineModule(target)) {
          violations.push({ code: 'GAME_RUNTIME_IMPORTS_GAME', importer, target });
        }
        if (isSceneModule(target) || target.startsWith('src/reference2d/') || target.startsWith('src/renderer/')) {
          violations.push({ code: 'GAME_RUNTIME_IMPORTS_RENDERER', importer, target });
        }
      }

      if (isPlatformModule(importer) && target === 'src/domain/types.ts') {
        violations.push({ code: 'PLATFORM_IMPORTS_BLOCK_TYPES', importer, target });
      }

      const fromGame = gameIdFromPath(importer);
      const toGame = gameIdFromPath(target);
      if (fromGame && toGame && fromGame !== toGame) {
        violations.push({ code: 'GAME_IMPORTS_OTHER_GAME', importer, target });
      }

      const pattern = resolved ? debtPattern(importer, target) : null;
      if (pattern) {
        const allowed = allowlist.find((item) => item.importer === importer && item.target === target);
        if (allowed) {
          allowlisted.add(allowed.id);
          debt.push({ ...allowed, pattern });
        } else {
          violations.push({ code: 'UNLISTED_LEGACY_DEBT', importer, target, pattern });
        }
      }
    }
  }

  if (checkStale) {
    const staleAllowlist = allowlist.filter((item) => !allowlisted.has(item.id));
    for (const item of staleAllowlist) {
      violations.push({
        code: 'STALE_LEGACY_ALLOWLIST',
        importer: item.importer,
        target: item.target,
        id: item.id,
      });
    }
  }

  return {
    ok: violations.length === 0,
    violations,
    debt,
    allowlist,
  };
}

export function formatArchitectureReport(result) {
  const lines = [];
  if (result.violations.length > 0) {
    lines.push('Architecture boundary violations:');
    for (const item of result.violations) {
      lines.push(`- ${item.code}: ${item.importer} -> ${item.target}`);
    }
  } else {
    lines.push('✓ architecture import guards passed');
  }
  lines.push(`✓ legacy debt allowlist: ${result.debt.length} recorded edges`);
  return lines.join('\n');
}

function parseCli(argv) {
  const args = argv.slice(2);
  const rootIndex = args.indexOf('--root');
  return {
    json: args.includes('--json'),
    checkStale: !args.includes('--no-stale'),
    repositoryRoot: rootIndex >= 0 && args[rootIndex + 1] ? resolve(args[rootIndex + 1]) : root,
  };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('check-architecture.mjs')) {
  const cli = parseCli(process.argv);
  const result = analyzeArchitecture(cli.repositoryRoot, { checkStale: cli.checkStale });
  if (cli.json) process.stdout.write(`${JSON.stringify(result)}\n`);
  else process.stdout.write(`${formatArchitectureReport(result)}\n`);
  if (!result.ok) process.exit(1);
}
