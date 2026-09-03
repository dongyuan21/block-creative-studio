import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import {
  assetUriFromContentHash,
  createIngestedAssetManifest,
  inferAssetKind,
  sanitizeAssetId,
} from '../headless/contentAddressedAsset.js';
import type { AssetKind, AssetManifest } from '../headless/contracts.js';

function mimeFromExtension(fileName: string): string {
  const extension = extname(fileName).toLowerCase();
  const byExtension: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.ktx2': 'image/ktx2',
    '.hdr': 'image/vnd.radiance',
    '.exr': 'image/x-exr',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.flac': 'audio/flac',
    '.ogg': 'audio/ogg',
    '.woff2': 'font/woff2',
  };
  return byExtension[extension] ?? 'application/octet-stream';
}

export interface IngestAssetFileOptions {
  input: string;
  outputDirectory: string;
  id?: string;
  version?: string;
  kind?: AssetKind;
  label?: string;
}

export interface IngestAssetFileResult {
  manifest: AssetManifest;
  manifestPath: string;
  blobPath: string;
}

export async function ingestAssetFile(
  options: IngestAssetFileOptions,
): Promise<IngestAssetFileResult> {
  const inputPath = resolve(options.input);
  const outputDirectory = resolve(options.outputDirectory);
  const bytes = await readFile(inputPath);
  const digest = createHash('sha256').update(bytes).digest('hex');
  const contentHash = `sha256:${digest}`;
  const originalName = basename(inputPath);
  const mimeType = mimeFromExtension(originalName);
  const kind = options.kind ?? inferAssetKind(originalName, mimeType);
  const manifest = createIngestedAssetManifest({
    id: options.id?.trim()
      || `uploaded.${sanitizeAssetId(originalName)}.${digest.slice(0, 12)}`,
    version: options.version,
    kind,
    contentHash,
    uri: assetUriFromContentHash(contentHash),
    label: options.label ?? originalName,
    metadata: {
      fileName: originalName,
      mimeType,
      byteLength: bytes.byteLength,
    },
  });

  const blobDirectory = join(outputDirectory, 'blobs', 'sha256');
  const manifestDirectory = join(outputDirectory, 'manifests');
  await Promise.all([
    mkdir(blobDirectory, { recursive: true }),
    mkdir(manifestDirectory, { recursive: true }),
  ]);

  const extension = extname(originalName).toLowerCase();
  const blobPath = join(blobDirectory, `${digest}${extension}`);
  const manifestPath = join(
    manifestDirectory,
    `${sanitizeAssetId(manifest.id)}@${sanitizeAssetId(manifest.version)}.json`,
  );
  await copyFile(inputPath, blobPath);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return { manifest, manifestPath, blobPath };
}
