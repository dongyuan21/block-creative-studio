import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ResolvedRenderPlan } from '../headless/contracts';
import {
  BrowserAssetStore,
  type BrowserAssetMetadata,
  type BrowserAssetStoreEstimate,
  type PutBrowserAssetOptions,
} from '../assets/browserAssetStore';
import {
  EMPTY_RUNTIME_ASSET_BINDINGS,
  collectRuntimeAssetReferenceIssues,
  collectRuntimeAssetRequests,
  createRuntimeAssetBindings,
  imageBindingDefaults,
  runtimeBindingRevision,
  type RuntimeAssetBinding,
  type RuntimeAssetBindings,
  type RuntimeAssetMissing,
  type RuntimeImageAssetBinding,
} from '../assets/runtimeAssetBindings';

export type BrowserAssetStoreStatus = 'opening' | 'ready' | 'unavailable' | 'error';

export interface BrowserAssetStoreController {
  status: BrowserAssetStoreStatus;
  records: BrowserAssetMetadata[];
  estimate: BrowserAssetStoreEstimate;
  runtimeAssets: RuntimeAssetBindings;
  runtimeReady: boolean;
  error: string | null;
  putFile(file: File, options?: Omit<PutBrowserAssetOptions, 'fileName' | 'mimeType'>): Promise<BrowserAssetMetadata>;
  deleteAsset(contentHash: string): Promise<void>;
  clear(): Promise<void>;
  refresh(): Promise<void>;
}

const EMPTY_ESTIMATE: BrowserAssetStoreEstimate = {
  assetCount: 0,
  storedBytes: 0,
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRuntimeImageRole(
  role: string,
): role is RuntimeImageAssetBinding['role'] {
  return role === 'background-image'
    || role === 'tile-face-image'
    || role === 'particle-sprite'
    || role === 'texture-map';
}

function appendBinding(
  bySlot: Record<string, RuntimeAssetBinding[]>,
  binding: RuntimeAssetBinding,
): void {
  const list = bySlot[binding.slotId] ?? [];
  list.push(binding);
  bySlot[binding.slotId] = list;
}

function missingFromRequests(
  referenceIssues: RuntimeAssetMissing[],
  requests: Array<{ slotId: string; uri: string }>,
): RuntimeAssetMissing[] {
  return [
    ...referenceIssues,
    ...requests.map((request) => ({
      slotId: request.slotId,
      uri: request.uri,
      reason: 'blob-missing' as const,
    })),
  ];
}

export function useBrowserAssetStore(
  activePlan: ResolvedRenderPlan | null,
): BrowserAssetStoreController {
  const storeRef = useRef<BrowserAssetStore | null>(null);
  const [status, setStatus] = useState<BrowserAssetStoreStatus>('opening');
  const [records, setRecords] = useState<BrowserAssetMetadata[]>([]);
  const [estimate, setEstimate] = useState<BrowserAssetStoreEstimate>(EMPTY_ESTIMATE);
  const [runtimeAssets, setRuntimeAssets] = useState<RuntimeAssetBindings>(EMPTY_RUNTIME_ASSET_BINDINGS);
  const [error, setError] = useState<string | null>(null);
  const runtimeRequests = useMemo(
    () => collectRuntimeAssetRequests(activePlan),
    [activePlan],
  );

  const referenceIssues = useMemo(
    () => collectRuntimeAssetReferenceIssues(activePlan),
    [activePlan],
  );

  const refresh = useCallback(async (): Promise<void> => {
    const store = storeRef.current;
    if (!store) return;
    const [nextRecords, nextEstimate] = await Promise.all([store.list(), store.estimate()]);
    setRecords(nextRecords);
    setEstimate(nextEstimate);
  }, []);

  useEffect(() => {
    let canceled = false;
    void (async () => {
      if (typeof indexedDB === 'undefined') {
        if (!canceled) {
          setStatus('unavailable');
          setError('当前浏览器没有 IndexedDB，无法持久化图片、纹理、GLB 或音频。');
        }
        return;
      }
      try {
        const store = await BrowserAssetStore.openIndexedDb();
        if (canceled) {
          store.close();
          return;
        }
        storeRef.current = store;
        setStatus('ready');
        setError(null);
        const [nextRecords, nextEstimate] = await Promise.all([store.list(), store.estimate()]);
        if (!canceled) {
          setRecords(nextRecords);
          setEstimate(nextEstimate);
        }
      } catch (openError) {
        if (!canceled) {
          setStatus('error');
          setError(errorMessage(openError));
        }
      }
    })();
    return () => {
      canceled = true;
      storeRef.current?.close();
      storeRef.current = null;
    };
  }, []);

  useEffect(() => {
    let canceled = false;
    const objectUrls: string[] = [];
    const revision = runtimeBindingRevision(activePlan);

    if (!activePlan) {
      setRuntimeAssets(EMPTY_RUNTIME_ASSET_BINDINGS);
      return () => undefined;
    }
    if (status !== 'ready' || !storeRef.current) {
      setRuntimeAssets(createRuntimeAssetBindings({
        revision,
        missing: missingFromRequests(referenceIssues, runtimeRequests),
      }));
      return () => undefined;
    }

    void (async () => {
      const store = storeRef.current;
      if (!store) return;
      const bySlot: Record<string, RuntimeAssetBinding[]> = {};
      const missing: RuntimeAssetMissing[] = [...referenceIssues];

      for (const request of runtimeRequests) {
        const record = await store.get(request.contentHash);
        if (!record) {
          missing.push({
            slotId: request.slotId,
            uri: request.uri,
            reason: 'blob-missing',
          });
          continue;
        }
        if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
          missing.push({
            slotId: request.slotId,
            uri: request.uri,
            reason: 'unsupported-binding',
          });
          continue;
        }
        const objectUrl = URL.createObjectURL(record.blob);
        objectUrls.push(objectUrl);
        if (isRuntimeImageRole(request.role)) {
          appendBinding(bySlot, imageBindingDefaults(request, objectUrl));
        } else {
          appendBinding(bySlot, {
            slotId: request.slotId,
            role: request.role,
            contentHash: request.contentHash,
            sourceUri: request.uri,
            objectUrl,
            fileName: record.fileName,
            mimeType: record.mimeType,
          });
        }
      }

      if (canceled) {
        objectUrls.forEach((url) => URL.revokeObjectURL(url));
        return;
      }
      setRuntimeAssets(createRuntimeAssetBindings({ revision, bySlot, missing }));
      setError(null);
    })().catch((bindingError) => {
      if (canceled) return;
      setRuntimeAssets(createRuntimeAssetBindings({
        revision,
        missing: missingFromRequests(referenceIssues, runtimeRequests),
      }));
      setError(errorMessage(bindingError));
    });

    return () => {
      canceled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [activePlan, records, referenceIssues, runtimeRequests, status]);

  const putFile = useCallback(async (
    file: File,
    options: Omit<PutBrowserAssetOptions, 'fileName' | 'mimeType'> = {},
  ): Promise<BrowserAssetMetadata> => {
    const store = storeRef.current;
    if (!store || status !== 'ready') {
      throw new Error('Browser Asset Store 尚未就绪。');
    }
    const metadata = await store.putFile(file, options);
    await refresh();
    return metadata;
  }, [refresh, status]);

  const deleteAsset = useCallback(async (contentHash: string): Promise<void> => {
    const store = storeRef.current;
    if (!store || status !== 'ready') throw new Error('Browser Asset Store 尚未就绪。');
    await store.delete(contentHash);
    await refresh();
  }, [refresh, status]);

  const clear = useCallback(async (): Promise<void> => {
    const store = storeRef.current;
    if (!store || status !== 'ready') throw new Error('Browser Asset Store 尚未就绪。');
    await store.clear();
    await refresh();
  }, [refresh, status]);

  return {
    status,
    records,
    estimate,
    runtimeAssets,
    runtimeReady: referenceIssues.length === 0
      && (runtimeRequests.length === 0 || (status === 'ready' && runtimeAssets.missing.length === 0)),
    error,
    putFile,
    deleteAsset,
    clear,
    refresh,
  };
}
