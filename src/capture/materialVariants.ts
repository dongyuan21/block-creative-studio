import type {
  AssetManifest,
  CreativeMaster,
  EffectPackManifest,
  MaterialPackManifest,
  MaterialRuntimeDescriptor,
  VariantRecipe,
} from '../headless/contracts';
import { AssetRegistry } from '../headless/assetRegistry';
import { compileVariant } from '../headless/variantCompiler';
import {
  bitmapManifestFromTextureRef,
  materialRuntimeFromPlan,
} from '../headless/materialRuntime';

export const VARIANT_PACK_PATHS = {
  'material.stainless-steel': 'examples/headless/materials/material.stainless-steel.json',
  'material.oak-wood': 'examples/headless/materials/material.oak-wood.json',
  'material.aurora-shell': 'examples/headless/materials/material.aurora-shell.json',
} as const;

export type VariantMaterialId = keyof typeof VARIANT_PACK_PATHS;

const CAPTURE_ASSET_PATHS = [
  'examples/headless/assets/layout.vertical.json',
  'examples/headless/assets/camera.fixed.json',
  'examples/headless/assets/background.dark.json',
  'examples/headless/assets/board.dark.json',
  'examples/headless/assets/material.copper.json',
  'examples/headless/assets/preview.default.json',
  'examples/headless/assets/placement.default.json',
  'examples/headless/assets/effect.copper-clear.json',
  'examples/headless/assets/clear.exit.json',
  'examples/headless/assets/hud.score.json',
  'examples/headless/assets/endgame.default.json',
  'examples/headless/assets/look.copper.json',
] as const;

/** Rewrite pack/source map URIs onto the Vite-served public materials directory. */
export function rewriteMaterialMapUriForBrowser(
  uri: string,
  mapBaseUrl = '/materials/maps',
): string {
  const file = uri.split(/[/\\]/).pop();
  if (file && (uri.includes('materials/maps/') || uri.startsWith('/materials/maps/'))) {
    return `${mapBaseUrl.replace(/\/$/, '')}/${file}`;
  }
  return uri;
}

export function registerPackTextures(registry: AssetRegistry, pack: MaterialPackManifest): void {
  for (const ref of Object.values(pack.appearance.textureRefs ?? {})) {
    if (!ref) continue;
    registry.register(bitmapManifestFromTextureRef(ref), { replace: true });
  }
}

export function compileRuntimeFromRegisteredPlan(
  pack: MaterialPackManifest,
  context: {
    master: CreativeMaster;
    recipe: VariantRecipe;
    assets: AssetManifest[];
    rewriteUri?: (uri: string) => string;
  },
): MaterialRuntimeDescriptor {
  const registry = new AssetRegistry();
  for (const asset of context.assets) {
    if (asset.kind === 'effect-pack') {
      const effect = structuredClone(asset) as EffectPackManifest;
      effect.compatibleMaterialClasses = ['*'];
      registry.register(effect, { replace: true });
      continue;
    }
    registry.register(asset, { replace: true });
  }
  registry.register(pack, { replace: true });
  registerPackTextures(registry, pack);

  const recipe: VariantRecipe = {
    ...context.recipe,
    lockMode: 'semantic',
    slotOverrides: {
      ...(context.recipe.slotOverrides ?? {}),
      'tile.material': {
        id: pack.id,
        version: pack.version,
        kind: 'material-pack',
        ...(pack.contentHash ? { contentHash: pack.contentHash } : {}),
      },
    },
  };

  const plan = compileVariant(context.master, recipe, registry, {
    renderer: 'fixed-camera-cinematic',
    requireHashes: true,
  });
  return materialRuntimeFromPlan(plan, {
    ...(context.rewriteUri ? { rewriteUri: context.rewriteUri } : {}),
  });
}

interface CapturePlanContext {
  master: CreativeMaster;
  recipe: VariantRecipe;
  assets: AssetManifest[];
}

const runtimeCache = new Map<string, MaterialRuntimeDescriptor>();
let captureContext: Promise<CapturePlanContext> | null = null;

async function loadCaptureJson<T>(path: string): Promise<T> {
  const response = await fetch(`/__capture/workspace/${path}`);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return await response.json() as T;
}

async function loadCaptureContext(): Promise<CapturePlanContext> {
  captureContext ??= Promise.all([
    loadCaptureJson<CreativeMaster>('examples/headless/master.demo.json'),
    loadCaptureJson<VariantRecipe>('examples/headless/variant.copper.demo.json'),
    Promise.all(CAPTURE_ASSET_PATHS.map((path) => loadCaptureJson<AssetManifest>(path))),
  ]).then(([master, recipe, assets]) => ({ master, recipe, assets }));
  return captureContext;
}

export async function compileVariantRuntime(
  pack: MaterialPackManifest,
  mapBaseUrl = '/materials/maps',
): Promise<MaterialRuntimeDescriptor> {
  const cacheKey = `${pack.id}@${pack.version}:${pack.contentHash ?? ''}:${mapBaseUrl}`;
  const cached = runtimeCache.get(cacheKey);
  if (cached) return cached;
  const context = await loadCaptureContext();
  const runtime = compileRuntimeFromRegisteredPlan(pack, {
    ...context,
    rewriteUri: (uri) => rewriteMaterialMapUriForBrowser(uri, mapBaseUrl),
  });
  runtimeCache.set(cacheKey, runtime);
  return runtime;
}
