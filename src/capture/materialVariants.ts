import type { MaterialPackManifest, MaterialRuntimeDescriptor } from '../headless/contracts';
import { compileMaterialRuntime } from '../headless/materialRuntime';

export const VARIANT_PACK_PATHS = {
  'material.stainless-steel': 'examples/headless/materials/material.stainless-steel.json',
  'material.oak-wood': 'examples/headless/materials/material.oak-wood.json',
  'material.aurora-shell': 'examples/headless/materials/material.aurora-shell.json',
} as const;

export type VariantMaterialId = keyof typeof VARIANT_PACK_PATHS;

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

export function compileVariantRuntime(
  pack: MaterialPackManifest,
  mapBaseUrl = '/materials/maps',
): MaterialRuntimeDescriptor {
  return compileMaterialRuntime({
    pack,
    rewriteUri: (uri) => rewriteMaterialMapUriForBrowser(uri, mapBaseUrl),
  });
}
