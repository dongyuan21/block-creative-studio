import {
  assetUriFromContentHash,
  contentHashFromAssetUri,
  normalizeSha256Hash,
} from '../headless/contentAddressedAsset';

export interface StoredBrowserAsset {
  contentHash: string;
  uri: string;
  fileName: string;
  mimeType: string;
  byteLength: number;
  createdAt: string;
  lastModified?: number;
}

interface StoredBrowserAssetRecord extends StoredBrowserAsset {
  blob: Blob;
}

export interface BrowserAssetStorageEstimate {
  usage: number | null;
  quota: number | null;
}

export interface BinaryAssetStore {
  put(
    blob: Blob,
    metadata: {
      fileName: string;
      mimeType?: string;
      lastModified?: number;
    },
  ): Promise<StoredBrowserAsset>;
  get(uriOrHash: string): Promise<Blob | null>;
  has(uriOrHash: string): Promise<boolean>;
  list(): Promise<StoredBrowserAsset[]>;
  delete(uriOrHash: string): Promise<boolean>;
  clear(): Promise<void>;
  estimate(): Promise<BrowserAssetStorageEstimate>;
}

export const BROWSER_ASSET_CHANGE_EVENT = 'bcs-browser-assets-changed';

const DATABASE_NAME = 'block-creative-studio-browser-assets';
const DATABASE_VERSION = 1;
const STORE_NAME = 'content';

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), { once: true });
    request.addEventListener('error', () => reject(request.error ?? new Error('IndexedDB request failed.')), {
      once: true,
    });
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true });
    transaction.addEventListener(
      'abort',
      () => reject(transaction.error ?? new Error('IndexedDB transaction was aborted.')),
      { once: true },
    );
    transaction.addEventListener(
      'error',
      () => reject(transaction.error ?? new Error('IndexedDB transaction failed.')),
      { once: true },
    );
  });
}

function hashFromInput(uriOrHash: string): string {
  const fromUri = contentHashFromAssetUri(uriOrHash);
  return fromUri ?? normalizeSha256Hash(uriOrHash);
}

function cloneMetadata(record: StoredBrowserAssetRecord): StoredBrowserAsset {
  return {
    contentHash: record.contentHash,
    uri: record.uri,
    fileName: record.fileName,
    mimeType: record.mimeType,
    byteLength: record.byteLength,
    createdAt: record.createdAt,
    ...(record.lastModified !== undefined ? { lastModified: record.lastModified } : {}),
  };
}

export async function sha256Blob(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  const bytes = new Uint8Array(digest);
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  return `sha256:${hex}`;
}

export class IndexedDbBinaryAssetStore implements BinaryAssetStore {
  private databasePromise: Promise<IDBDatabase> | null = null;

  private database(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;
    if (typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('This browser does not expose IndexedDB.'));
    }

    this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.addEventListener('upgradeneeded', () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: 'contentHash' });
          store.createIndex('createdAt', 'createdAt');
          store.createIndex('fileName', 'fileName');
        }
      });
      request.addEventListener('success', () => {
        const database = request.result;
        database.addEventListener('versionchange', () => database.close());
        resolve(database);
      }, { once: true });
      request.addEventListener(
        'error',
        () => reject(request.error ?? new Error('Unable to open the browser asset database.')),
        { once: true },
      );
      request.addEventListener(
        'blocked',
        () => reject(new Error('The browser asset database upgrade is blocked by another tab.')),
        { once: true },
      );
    });

    return this.databasePromise;
  }

  async put(
    blob: Blob,
    metadata: {
      fileName: string;
      mimeType?: string;
      lastModified?: number;
    },
  ): Promise<StoredBrowserAsset> {
    const contentHash = await sha256Blob(blob);
    const uri = assetUriFromContentHash(contentHash);
    const database = await this.database();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const done = transactionDone(transaction);
    const store = transaction.objectStore(STORE_NAME);
    const existing = await requestResult(
      store.get(contentHash) as IDBRequest<StoredBrowserAssetRecord | undefined>,
    );
    if (existing) {
      await done;
      return cloneMetadata(existing);
    }

    const record: StoredBrowserAssetRecord = {
      contentHash,
      uri,
      fileName: metadata.fileName,
      mimeType: metadata.mimeType?.trim() || blob.type || 'application/octet-stream',
      byteLength: blob.size,
      createdAt: new Date().toISOString(),
      ...(metadata.lastModified !== undefined ? { lastModified: metadata.lastModified } : {}),
      blob,
    };
    store.put(record);
    await done;
    return cloneMetadata(record);
  }

  async get(uriOrHash: string): Promise<Blob | null> {
    const database = await this.database();
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const done = transactionDone(transaction);
    const record = await requestResult(
      transaction.objectStore(STORE_NAME).get(hashFromInput(uriOrHash)) as IDBRequest<
        StoredBrowserAssetRecord | undefined
      >,
    );
    await done;
    return record?.blob ?? null;
  }

  async has(uriOrHash: string): Promise<boolean> {
    const database = await this.database();
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const done = transactionDone(transaction);
    const key = await requestResult(
      transaction.objectStore(STORE_NAME).getKey(hashFromInput(uriOrHash)),
    );
    await done;
    return key !== undefined;
  }

  async list(): Promise<StoredBrowserAsset[]> {
    const database = await this.database();
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const done = transactionDone(transaction);
    const records = await requestResult(
      transaction.objectStore(STORE_NAME).getAll() as IDBRequest<StoredBrowserAssetRecord[]>,
    );
    await done;
    return records
      .map(cloneMetadata)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async delete(uriOrHash: string): Promise<boolean> {
    const contentHash = hashFromInput(uriOrHash);
    const existed = await this.has(contentHash);
    if (!existed) return false;
    const database = await this.database();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const done = transactionDone(transaction);
    transaction.objectStore(STORE_NAME).delete(contentHash);
    await done;
    return true;
  }

  async clear(): Promise<void> {
    const database = await this.database();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const done = transactionDone(transaction);
    transaction.objectStore(STORE_NAME).clear();
    await done;
  }

  async estimate(): Promise<BrowserAssetStorageEstimate> {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
      return { usage: null, quota: null };
    }
    const result = await navigator.storage.estimate();
    return {
      usage: result.usage ?? null,
      quota: result.quota ?? null,
    };
  }
}

export class MemoryBinaryAssetStore implements BinaryAssetStore {
  private readonly records = new Map<string, StoredBrowserAssetRecord>();

  async put(
    blob: Blob,
    metadata: {
      fileName: string;
      mimeType?: string;
      lastModified?: number;
    },
  ): Promise<StoredBrowserAsset> {
    const contentHash = await sha256Blob(blob);
    const existing = this.records.get(contentHash);
    if (existing) return cloneMetadata(existing);
    const record: StoredBrowserAssetRecord = {
      contentHash,
      uri: assetUriFromContentHash(contentHash),
      fileName: metadata.fileName,
      mimeType: metadata.mimeType?.trim() || blob.type || 'application/octet-stream',
      byteLength: blob.size,
      createdAt: new Date().toISOString(),
      ...(metadata.lastModified !== undefined ? { lastModified: metadata.lastModified } : {}),
      blob,
    };
    this.records.set(contentHash, record);
    return cloneMetadata(record);
  }

  async get(uriOrHash: string): Promise<Blob | null> {
    return this.records.get(hashFromInput(uriOrHash))?.blob ?? null;
  }

  async has(uriOrHash: string): Promise<boolean> {
    return this.records.has(hashFromInput(uriOrHash));
  }

  async list(): Promise<StoredBrowserAsset[]> {
    return [...this.records.values()]
      .map(cloneMetadata)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async delete(uriOrHash: string): Promise<boolean> {
    return this.records.delete(hashFromInput(uriOrHash));
  }

  async clear(): Promise<void> {
    this.records.clear();
  }

  async estimate(): Promise<BrowserAssetStorageEstimate> {
    const usage = [...this.records.values()].reduce((sum, record) => sum + record.byteLength, 0);
    return { usage, quota: null };
  }
}

let defaultStore: IndexedDbBinaryAssetStore | null = null;

export function defaultBrowserAssetStore(): IndexedDbBinaryAssetStore {
  defaultStore ??= new IndexedDbBinaryAssetStore();
  return defaultStore;
}
