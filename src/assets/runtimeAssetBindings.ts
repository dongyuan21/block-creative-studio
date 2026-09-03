import type { AssetManifest, ResolvedRenderPlan } from '../headless/contracts';
import { assetUriToContentHash } from './browserAssetStore';

export type BrowserAssetBindingRole =
  | 'background-image'
  | 'tile-face-image'
  | 'particle-sprite'
  | 'flipbook'
  | 'audio'
  | 'geometry-3d'
  | 'texture-map';

export type RuntimeImageFit = 'cover' | 'contain' | 'stretch';
export type RuntimeImageBlendMode =
  | 'source-over'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'soft-light';

export interface BrowserAssetManifestMetadata extends Record<string, unknown> {
  browserAsset: {
    role: BrowserAssetBindingRole;
    uri: string;
    fileName: string;
    mimeType: string;
    byteLength: number;
    width?: number;
    height?: number;
    fit?: RuntimeImageFit;
    opacity?: number;
    blendMode?: RuntimeImageBlendMode;
    inset?: number;
  };
}

export interface RuntimeImageAssetBinding {
  slotId: string;
  role: 'background-image' | 'tile-face-image' | 'particle-sprite' | 'texture-map';
  contentHash: string;
  sourceUri: string;
  objectUrl: string;
  fileName: string;
  mimeType: string;
  width?: number;
  height?: number;
  fit: RuntimeImageFit;
  opacity: number;
  blendMode: RuntimeImageBlendMode;
  inset: number;
}

export interface RuntimeBinaryAssetBinding {
  slotId: string;
  role: Exclude<BrowserAssetBindingRole, RuntimeImageAssetBinding['role']>;
  contentHash: string;
  sourceUri: string;
  objectUrl: string;
  fileName: string;
  mimeType: string;
}

export interface RuntimeAssetMissing {
  slotId: string;
  uri: string;
  reason:
    | 'invalid-metadata'
    | 'invalid-uri'
    | 'hash-mismatch'
    | 'blob-missing'
    | 'unsupported-binding';
}

export interface RuntimeAssetBindings {
  revision: string;
  background: RuntimeImageAssetBinding | null;
  tileFace: RuntimeImageAssetBinding | null;
  particleSprites: RuntimeImageAssetBinding[];
  textureMaps: RuntimeImageAssetBinding[];
  binary: RuntimeBinaryAssetBinding[];
  missing: RuntimeAssetMissing[];
}

export const EMPTY_RUNTIME_ASSET_BINDINGS: RuntimeAssetBindings = {
  revision: 'none',
  background: null,
  tileFace: null,
  particleSprites: [],
  textureMaps: [],
  binary: [],
  missing: [],
};

export interface RuntimeAssetRequest {
  slotId: string;
  role: BrowserAssetBindingRole;
  contentHash: string;
  uri: string;
  manifest: AssetManifest;
  metadata: BrowserAssetManifestMetadata['browserAsset'];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isBindingRole(value: unknown): value is BrowserAssetBindingRole {
  return [
    'background-image',
    'tile-face-image',
    'particle-sprite',
    'flipbook',
    'audio',
    'geometry-3d',
    'texture-map',
  ].includes(String(value));
}

export function readBrowserAssetMetadata(
  manifest: AssetManifest,
): BrowserAssetManifestMetadata['browserAsset'] | null {
  if (!isRecord(manifest.metadata) || !isRecord(manifest.metadata.browserAsset)) return null;
  const source = manifest.metadata.browserAsset;
  if (
    !isBindingRole(source.role)
    || typeof source.uri !== 'string'
    || typeof source.fileName !== 'string'
    || typeof source.mimeType !== 'string'
    || typeof source.byteLength !== 'number'
  ) {
    return null;
  }
  const metadata: BrowserAssetManifestMetadata['browserAsset'] = {
    role: source.role,
    uri: source.uri,
    fileName: source.fileName,
    mimeType: source.mimeType,
    byteLength: source.byteLength,
  };
  if (typeof source.width === 'number') metadata.width = source.width;
  if (typeof source.height === 'number') metadata.height = source.height;
  if (source.fit === 'cover' || source.fit === 'contain' || source.fit === 'stretch') metadata.fit = source.fit;
  if (typeof source.opacity === 'number') metadata.opacity = source.opacity;
  if (
    source.blendMode === 'source-over'
    || source.blendMode === 'multiply'
    || source.blendMode === 'screen'
    || source.blendMode === 'overlay'
    || source.blendMode === 'soft-light'
  ) metadata.blendMode = source.blendMode;
  if (typeof source.inset === 'number') metadata.inset = source.inset;
  return metadata;
}

interface RuntimeAssetCandidate {
  slotId: string;
  manifest: AssetManifest;
}

function runtimeAssetCandidates(plan: ResolvedRenderPlan): RuntimeAssetCandidate[] {
  const candidates: RuntimeAssetCandidate[] = [];
  const directlySlotted = new Set<string>();
  for (const [slotId, resolved] of Object.entries(plan.slots)) {
    candidates.push({ slotId, manifest: resolved.manifest });
    directlySlotted.add(`${resolved.manifest.id}@${resolved.manifest.version}`);
  }
  for (const [key, resolved] of Object.entries(plan.assets ?? {})) {
    if (directlySlotted.has(key)) continue;
    candidates.push({ slotId: `asset:${key}`, manifest: resolved.manifest });
  }
  return candidates.sort((left, right) => left.slotId.localeCompare(right.slotId));
}

export function collectRuntimeAssetReferenceIssues(
  plan: ResolvedRenderPlan | null,
): RuntimeAssetMissing[] {
  if (!plan) return [];
  const issues: RuntimeAssetMissing[] = [];
  for (const { slotId, manifest } of runtimeAssetCandidates(plan)) {
    const raw = isRecord(manifest.metadata)
      ? manifest.metadata.browserAsset
      : undefined;
    if (raw === undefined) continue;
    const metadata = readBrowserAssetMetadata(manifest);
    if (!metadata) {
      issues.push({
        slotId,
        uri: manifest.uri ?? '',
        reason: 'invalid-metadata',
      });
      continue;
    }
    const uri = manifest.uri ?? metadata.uri;
    const contentHash = assetUriToContentHash(uri);
    if (!contentHash) {
      issues.push({ slotId, uri, reason: 'invalid-uri' });
      continue;
    }
    if (manifest.contentHash && manifest.contentHash !== contentHash) {
      issues.push({ slotId, uri, reason: 'hash-mismatch' });
    }
  }
  return issues.sort((left, right) => left.slotId.localeCompare(right.slotId));
}

export function collectRuntimeAssetRequests(plan: ResolvedRenderPlan | null): RuntimeAssetRequest[] {
  if (!plan) return [];
  const requests: RuntimeAssetRequest[] = [];
  for (const { slotId, manifest } of runtimeAssetCandidates(plan)) {
    const metadata = readBrowserAssetMetadata(manifest);
    if (!metadata) continue;
    const uri = manifest.uri ?? metadata.uri;
    const contentHash = assetUriToContentHash(uri);
    if (!contentHash) continue;
    if (manifest.contentHash && manifest.contentHash !== contentHash) continue;
    requests.push({
      slotId,
      role: metadata.role,
      contentHash,
      uri,
      manifest,
      metadata,
    });
  }
  return requests.sort((left, right) => left.slotId.localeCompare(right.slotId));
}

export function runtimeBindingRevision(plan: ResolvedRenderPlan | null): string {
  if (!plan) return 'none';
  const identities = collectRuntimeAssetRequests(plan).map((request) => ({
    slotId: request.slotId,
    role: request.role,
    contentHash: request.contentHash,
    opacity: request.metadata.opacity,
    blendMode: request.metadata.blendMode,
    fit: request.metadata.fit,
    inset: request.metadata.inset,
  }));
  return `${plan.planHash}:${JSON.stringify(identities)}`;
}

export function imageBindingDefaults(
  request: RuntimeAssetRequest,
  objectUrl: string,
): RuntimeImageAssetBinding {
  const metadata = request.metadata;
  const role = request.role as RuntimeImageAssetBinding['role'];
  return {
    slotId: request.slotId,
    role,
    contentHash: request.contentHash,
    sourceUri: request.uri,
    objectUrl,
    fileName: metadata.fileName,
    mimeType: metadata.mimeType,
    ...(metadata.width !== undefined ? { width: metadata.width } : {}),
    ...(metadata.height !== undefined ? { height: metadata.height } : {}),
    fit: metadata.fit ?? (role === 'background-image' ? 'cover' : 'contain'),
    opacity: Math.max(0, Math.min(1, metadata.opacity ?? (role === 'tile-face-image' ? 0.55 : 1))),
    blendMode: metadata.blendMode ?? (role === 'tile-face-image' ? 'multiply' : 'source-over'),
    inset: Math.max(0, Math.min(0.45, metadata.inset ?? (role === 'tile-face-image' ? 0.18 : 0))),
  };
}
