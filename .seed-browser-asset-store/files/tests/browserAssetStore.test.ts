import { describe, expect, it } from 'vitest';
import {
  MemoryBinaryAssetStore,
  sha256Blob,
} from '../src/assets/browserAssetStore';

describe('MemoryBinaryAssetStore', () => {
  it('deduplicates identical binary content by SHA-256', async () => {
    const store = new MemoryBinaryAssetStore();
    const blob = new Blob(['same-content'], { type: 'text/plain' });
    const first = await store.put(blob, { fileName: 'a.txt' });
    const second = await store.put(blob, { fileName: 'b.txt' });

    expect(first.contentHash).toBe(await sha256Blob(blob));
    expect(second.contentHash).toBe(first.contentHash);
    expect(await store.list()).toHaveLength(1);
    expect(await store.get(first.uri)).not.toBeNull();
  });

  it('deletes content without inventing a new mutable identity', async () => {
    const store = new MemoryBinaryAssetStore();
    const record = await store.put(new Blob(['asset']), { fileName: 'asset.bin' });

    expect(await store.has(record.contentHash)).toBe(true);
    expect(await store.delete(record.uri)).toBe(true);
    expect(await store.has(record.contentHash)).toBe(false);
  });
});
