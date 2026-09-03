import type { ResolvedAsset, ResolvedRenderPlan } from '../headless/contracts';
import { isContentAddressedAssetUri } from '../headless/contentAddressedAsset';
import type { BinaryAssetStore } from '../assets/browserAssetStore';

export interface Reference2DRuntimeAssets {
  backgroundImageUrl?: string;
  tileFaceImageUrl?: string;
}

export interface BrowserRuntimeAssetBindings {
  reference2d: Reference2DRuntimeAssets;
  objectUrls: string[];
  missing: Array<{
    slot: string;
    assetId: string;
    uri: string;
  }>;
}

function uriForAsset(asset: ResolvedAsset | undefined): string | null {
  const uri = asset?.manifest.uri;
  return isContentAddressedAssetUri(uri) ? uri! : null;
}

async function resolveObjectUrl(
  store: BinaryAssetStore,
  slot: string,
  asset: ResolvedAsset | undefined,
  missing: BrowserRuntimeAssetBindings['missing'],
  objectUrls: string[],
): Promise<string | undefined> {
  const uri = uriForAsset(asset);
  if (!uri || !asset) return undefined;
  const blob = await store.get(uri);
  if (!blob) {
    missing.push({
      slot,
      assetId: `${asset.manifest.id}@${asset.manifest.version}`,
      uri,
    });
    return undefined;
  }
  const objectUrl = URL.createObjectURL(blob);
  objectUrls.push(objectUrl);
  return objectUrl;
}

export async function resolveBrowserRuntimeAssetBindings(
  plan: ResolvedRenderPlan | null,
  store: BinaryAssetStore,
): Promise<BrowserRuntimeAssetBindings> {
  const objectUrls: string[] = [];
  const missing: BrowserRuntimeAssetBindings['missing'] = [];
  if (!plan) return { reference2d: {}, objectUrls, missing };

  const [backgroundImageUrl, tileFaceImageUrl] = await Promise.all([
    resolveObjectUrl(store, 'background.base', plan.slots['background.base'], missing, objectUrls),
    resolveObjectUrl(store, 'tile.face', plan.slots['tile.face'], missing, objectUrls),
  ]);

  return {
    reference2d: {
      ...(backgroundImageUrl ? { backgroundImageUrl } : {}),
      ...(tileFaceImageUrl ? { tileFaceImageUrl } : {}),
    },
    objectUrls,
    missing,
  };
}

export function disposeBrowserRuntimeAssetBindings(
  bindings: BrowserRuntimeAssetBindings | null,
): void {
  for (const objectUrl of bindings?.objectUrls ?? []) URL.revokeObjectURL(objectUrl);
}
