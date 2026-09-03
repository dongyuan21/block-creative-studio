import { describe, expect, it } from 'vitest';
import {
  assetRefFromManifest,
  assetUriFromContentHash,
  contentHashFromAssetUri,
  createIngestedAssetManifest,
  expectedAssetKindForSlot,
  inferAssetKind,
  sanitizeAssetId,
} from '../src/headless/contentAddressedAsset';

const hash = `sha256:${'a'.repeat(64)}`;

describe('content-addressed assets', () => {
  it('round-trips the BCS asset URI without losing the immutable digest', () => {
    const uri = assetUriFromContentHash(hash);
    expect(uri).toBe(`bcs-asset://sha256/${'a'.repeat(64)}`);
    expect(contentHashFromAssetUri(uri)).toBe(hash);
    expect(contentHashFromAssetUri('https://example.com/a.png')).toBeNull();
  });

  it('infers common upstream asset formats and preserves semantic slot kinds', () => {
    expect(inferAssetKind('tile.glb', 'model/gltf-binary')).toBe('geometry-3d');
    expect(inferAssetKind('burst.webm', 'video/webm')).toBe('animation-asset');
    expect(inferAssetKind('face.svg', 'image/svg+xml')).toBe('vector');
    expect(expectedAssetKindForSlot('background.base', 'bitmap')).toBe('background');
    expect(expectedAssetKindForSlot('tile.face', 'vector')).toBe('tile-face');
    expect(expectedAssetKindForSlot('clear.secondary', 'bitmap')).toBe('animation-asset');
  });

  it('creates a versioned Manifest that binds metadata to content, not a prompt', () => {
    const manifest = createIngestedAssetManifest({
      kind: 'background',
      contentHash: hash,
      label: 'Copper backdrop',
      metadata: {
        fileName: 'Copper Backdrop.PNG',
        mimeType: 'image/png',
        byteLength: 2048,
      },
    });
    expect(manifest.contentHash).toBe(hash);
    expect(manifest.uri).toBe(assetUriFromContentHash(hash));
    expect(manifest.runtime.deterministic).toBe(true);
    expect(assetRefFromManifest(manifest)).toEqual({
      id: manifest.id,
      version: '1.0.0',
      kind: 'background',
      contentHash: hash,
    });
    expect(sanitizeAssetId(' Copper Backdrop.PNG ')).toBe('copper-backdrop');
  });
});
