import type { AssetKind, AssetManifest, AssetRef, HeadlessRendererId } from './contracts.js';

export const BCS_ASSET_URI_SCHEME = 'bcs-asset://sha256/' as const;
export const SHA256_PREFIX = 'sha256:' as const;

const SHA256_HEX = /^[0-9a-f]{64}$/u;
const SAFE_ID = /[^a-z0-9._-]+/gu;

const DECLARATIVE_MANIFEST_KINDS = new Set<AssetKind>([
  'material-pack',
  'effect-pack',
  'look-pack',
  'plugin-package',
  'camera-profile',
]);

export interface ContentAddressedAssetDescriptor {
  contentHash: string;
  uri: string;
}

export interface IngestedAssetMetadata {
  fileName: string;
  mimeType: string;
  byteLength: number;
  lastModified?: number;
}

export function normalizeSha256Hash(value: string): string {
  const candidate = value.startsWith(SHA256_PREFIX)
    ? value.slice(SHA256_PREFIX.length)
    : value;
  const normalized = candidate.toLowerCase();
  if (!SHA256_HEX.test(normalized)) {
    throw new Error('Expected a SHA-256 digest containing exactly 64 hexadecimal characters.');
  }
  return `${SHA256_PREFIX}${normalized}`;
}

export function assetUriFromContentHash(contentHash: string): string {
  const normalized = normalizeSha256Hash(contentHash);
  return `${BCS_ASSET_URI_SCHEME}${normalized.slice(SHA256_PREFIX.length)}`;
}

export function contentHashFromAssetUri(uri: string): string | null {
  if (!uri.startsWith(BCS_ASSET_URI_SCHEME)) return null;
  const digest = uri.slice(BCS_ASSET_URI_SCHEME.length).toLowerCase();
  return SHA256_HEX.test(digest) ? `${SHA256_PREFIX}${digest}` : null;
}

export function isContentAddressedAssetUri(uri: string | undefined): boolean {
  return typeof uri === 'string' && contentHashFromAssetUri(uri) !== null;
}

export function sanitizeAssetId(input: string, fallback = 'asset'): string {
  const withoutExtension = input.replace(/\.[^.]+$/u, '');
  const normalized = withoutExtension
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, '-')
    .replace(SAFE_ID, '-')
    .replace(/-+/gu, '-')
    .replace(/^[._-]+|[._-]+$/gu, '');
  return normalized || fallback;
}

export function inferAssetKind(fileName: string, mimeType = ''): AssetKind {
  const extension = fileName.toLowerCase().split('.').pop() ?? '';
  const mime = mimeType.toLowerCase();

  if (extension === 'svg' || mime === 'image/svg+xml') return 'vector';
  if (
    ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif'].includes(extension)
    || mime.startsWith('image/')
  ) return 'bitmap';
  if (
    ['glb', 'gltf', 'fbx', 'obj'].includes(extension)
    || mime.includes('gltf')
    || mime.includes('model/')
  ) return 'geometry-3d';
  if (
    ['mp4', 'webm', 'mov', 'm4v', 'apng'].includes(extension)
    || mime.startsWith('video/')
  ) return 'animation-asset';
  if (
    ['wav', 'mp3', 'flac', 'ogg', 'm4a', 'aac'].includes(extension)
    || mime.startsWith('audio/')
  ) return 'audio';
  if (
    ['ktx', 'ktx2', 'hdr', 'exr', 'dds'].includes(extension)
    || mime.includes('ktx')
  ) return 'texture-set';
  if (['woff', 'woff2', 'ttf', 'otf'].includes(extension) || mime.startsWith('font/')) {
    return 'font';
  }
  return 'bitmap';
}

export function expectedAssetKindForSlot(slot: string, fallback: AssetKind): AssetKind {
  switch (slot) {
    case 'background.base':
    case 'background.reaction':
      return 'background';
    case 'tile.face':
      return 'tile-face';
    case 'tile.geometry':
      return 'geometry-3d';
    case 'audio.pack':
      return 'audio';
    case 'board.skin':
      return 'board-skin';
    case 'hud.current-score':
    case 'feedback.praise':
    case 'feedback.combo':
    case 'endgame.presentation':
      return 'ui-theme';
    case 'clear.secondary':
    case 'interaction.preview':
    case 'placement.confirmation':
      return 'animation-asset';
    default:
      return fallback;
  }
}

export function rendererSupportForKind(kind: AssetKind): HeadlessRendererId[] {
  switch (kind) {
    case 'geometry-3d':
      return ['fixed-camera-cinematic', 'three-3d'];
    case 'texture-set':
      return ['fixed-camera-cinematic', 'three-3d'];
    default:
      return ['reference-2d', 'fixed-camera-cinematic', 'three-3d'];
  }
}

export function createIngestedAssetManifest(input: {
  id?: string;
  version?: string;
  kind: AssetKind;
  contentHash: string;
  uri?: string;
  origin?: AssetManifest['origin'];
  label?: string;
  metadata: IngestedAssetMetadata;
  renderers?: HeadlessRendererId[];
}): AssetManifest {
  if (DECLARATIVE_MANIFEST_KINDS.has(input.kind)) {
    throw new Error(
      `Raw binary ingest cannot create ${input.kind}; import a validated declarative Manifest instead.`,
    );
  }
  const contentHash = normalizeSha256Hash(input.contentHash);
  const uri = input.uri ?? assetUriFromContentHash(contentHash);
  const id = input.id?.trim()
    || `uploaded.${sanitizeAssetId(input.metadata.fileName)}.${contentHash.slice(-12)}`;
  const renderers = input.renderers ?? rendererSupportForKind(input.kind);

  return {
    contract: 'bcs.asset-manifest',
    contractVersion: '1.0.0',
    id,
    version: input.version?.trim() || '1.0.0',
    kind: input.kind,
    origin: input.origin ?? 'uploaded',
    ...(input.label?.trim() ? { label: input.label.trim() } : {}),
    contentHash,
    uri,
    runtime: {
      renderers,
      deterministic: true,
    },
    metadata: {
      browserAsset: {
        fileName: input.metadata.fileName,
        mimeType: input.metadata.mimeType,
        byteLength: input.metadata.byteLength,
        ...(input.metadata.lastModified !== undefined
          ? { lastModified: input.metadata.lastModified }
          : {}),
      },
    },
  } as AssetManifest;
}

export function assetRefFromManifest(manifest: AssetManifest): AssetRef {
  return {
    id: manifest.id,
    version: manifest.version,
    kind: manifest.kind,
    ...(manifest.contentHash ? { contentHash: manifest.contentHash } : {}),
  };
}
