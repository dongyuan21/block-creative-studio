import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BROWSER_ASSET_CHANGE_EVENT,
  defaultBrowserAssetStore,
  type BrowserAssetStorageEstimate,
  type StoredBrowserAsset,
} from '../assets/browserAssetStore';
import {
  assetRefFromManifest,
  createIngestedAssetManifest,
  expectedAssetKindForSlot,
  inferAssetKind,
  sanitizeAssetId,
} from '../headless/contentAddressedAsset';
import type {
  AssetManifest,
  AssetRef,
  ResolvedRenderPlan,
  VariantRecipe,
} from '../headless/contracts';

const BINDING_OPTIONS = [
  {
    id: 'background.base',
    label: '背景主体',
    accept: 'image/*,video/mp4,video/webm,.hdr,.exr',
    description: '图片会立即进入 Reference 2D 预览；视频/HDR 会先完成存储和契约绑定。',
  },
  {
    id: 'tile.face',
    label: '牌面贴图',
    accept: 'image/*,.svg',
    description: '保存为独立 tile-face，不与材质、几何或颜色烤死。',
  },
  {
    id: 'clear.secondary',
    label: '辅助清除特效',
    accept: 'image/*,video/mp4,video/webm,.glb,.gltf',
    description: '适合 Sprite、Flipbook、透明视频或 DCC 导出的辅助层。',
  },
  {
    id: 'tile.geometry',
    label: '牌块 / 碎片几何',
    accept: '.glb,.gltf,model/gltf-binary,model/gltf+json',
    description: '进入 Asset Registry；当前网页 2D 预览不会错误地把它当成图片。',
  },
  {
    id: 'audio.pack',
    label: '音频资产',
    accept: 'audio/*,.wav,.mp3,.flac,.ogg,.m4a',
    description: '进入确定性资产包，后续由音频事件绑定和混音 Runtime 消费。',
  },
  {
    id: 'library-only',
    label: '仅加入素材库',
    accept: 'image/*,video/*,audio/*,.svg,.glb,.gltf,.ktx2,.hdr,.exr',
    description: '只创建内容寻址资产和 Manifest，不修改当前 Variant。',
  },
] as const;

type BindingSlot = (typeof BINDING_OPTIONS)[number]['id'];

export interface BrowserAssetStorePanelProps {
  activeRecipe: VariantRecipe | null;
  activePlan: ResolvedRenderPlan | null;
  locked: boolean;
  onImportAssets(file: File): Promise<void>;
  onImportRecipe(file: File): Promise<void>;
}

function humanBytes(value: number | null): string {
  if (value === null) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KiB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MiB`;
  return `${(value / 1024 ** 3).toFixed(2)} GiB`;
}

function shortHash(value: string): string {
  return `${value.slice(0, 11)}…${value.slice(-8)}`;
}

function manifestFile(manifest: AssetManifest): File {
  return new File(
    [JSON.stringify({ contract: 'bcs.asset-bundle', contractVersion: '1.0.0', assets: [manifest] }, null, 2)],
    `${sanitizeAssetId(manifest.id)}.asset-bundle.json`,
    { type: 'application/json' },
  );
}

function recipeFile(recipe: VariantRecipe): File {
  return new File(
    [JSON.stringify(recipe, null, 2)],
    `${sanitizeAssetId(recipe.id)}.variant-recipe.json`,
    { type: 'application/json' },
  );
}

function nextRecipe(
  active: VariantRecipe,
  slot: Exclude<BindingSlot, 'library-only'>,
  manifest: AssetManifest,
): VariantRecipe {
  const contentToken = manifest.contentHash?.slice(-12) ?? Date.now().toString(36);
  return {
    ...structuredClone(active),
    id: `browser.${sanitizeAssetId(manifest.id)}.${contentToken}`,
    slotOverrides: {
      ...(active.slotOverrides ?? {}),
      [slot]: assetRefFromManifest(manifest),
    },
  };
}

function planReferencesUri(plan: ResolvedRenderPlan | null, uri: string): boolean {
  if (!plan) return false;
  const assets = [
    plan.layoutProfile,
    plan.cameraProfile,
    plan.lookPack,
    ...Object.values(plan.slots),
  ];
  return assets.some((asset) => asset.manifest.uri === uri);
}

export function BrowserAssetStorePanel({
  activeRecipe,
  activePlan,
  locked,
  onImportAssets,
  onImportRecipe,
}: BrowserAssetStorePanelProps) {
  const store = useMemo(() => defaultBrowserAssetStore(), []);
  const [assets, setAssets] = useState<StoredBrowserAsset[]>([]);
  const [estimate, setEstimate] = useState<BrowserAssetStorageEstimate>({
    usage: null,
    quota: null,
  });
  const [bindingSlot, setBindingSlot] = useState<BindingSlot>('background.base');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const [nextAssets, nextEstimate] = await Promise.all([store.list(), store.estimate()]);
      setAssets(nextAssets);
      setEstimate(nextEstimate);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [store]);

  useEffect(() => {
    void refresh();
    const onChange = (): void => {
      void refresh();
    };
    window.addEventListener(BROWSER_ASSET_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(BROWSER_ASSET_CHANGE_EVENT, onChange);
  }, [refresh]);

  const activeOption = BINDING_OPTIONS.find((option) => option.id === bindingSlot)!;

  const importFile = async (file: File): Promise<void> => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const stored = await store.put(file, {
        fileName: file.name,
        mimeType: file.type,
        lastModified: file.lastModified,
      });
      const inferredKind = inferAssetKind(file.name, file.type);
      const kind = bindingSlot === 'library-only'
        ? inferredKind
        : expectedAssetKindForSlot(bindingSlot, inferredKind);
      const manifest = createIngestedAssetManifest({
        kind,
        contentHash: stored.contentHash,
        uri: stored.uri,
        label: file.name,
        metadata: {
          fileName: stored.fileName,
          mimeType: stored.mimeType,
          byteLength: stored.byteLength,
          ...(stored.lastModified !== undefined ? { lastModified: stored.lastModified } : {}),
        },
      });
      await onImportAssets(manifestFile(manifest));

      if (bindingSlot !== 'library-only') {
        if (!activeRecipe) throw new Error('当前没有可继承的 Variant Recipe。');
        const recipe = nextRecipe(activeRecipe, bindingSlot, manifest);
        await onImportRecipe(recipeFile(recipe));
        setMessage(
          `${file.name} 已按 ${shortHash(stored.contentHash)} 存入 IndexedDB，并绑定到 ${bindingSlot}。`,
        );
      } else {
        setMessage(`${file.name} 已加入内容寻址素材库，尚未绑定到 Variant。`);
      }
      window.dispatchEvent(new CustomEvent(BROWSER_ASSET_CHANGE_EVENT));
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (asset: StoredBrowserAsset): Promise<void> => {
    const referenced = planReferencesUri(activePlan, asset.uri);
    if (referenced) {
      setError('当前 Render Plan 正在引用此二进制资产。请先切换 Variant，再删除。');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await store.delete(asset.contentHash);
      window.dispatchEvent(new CustomEvent(BROWSER_ASSET_CHANGE_EVENT));
      await refresh();
      setMessage(`已删除 ${asset.fileName} 的本地二进制内容；Manifest 历史不会被静默改写。`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const download = async (asset: StoredBrowserAsset): Promise<void> => {
    setError(null);
    try {
      const blob = await store.get(asset.contentHash);
      if (!blob) throw new Error('IndexedDB 中找不到该资产内容。');
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = asset.fileName;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <div className="browser-asset-store">
      <div className="variant-matrix-title">
        <span>Browser Asset Store</span>
        <small>{assets.length} 个内容对象 · {humanBytes(estimate.usage)}</small>
      </div>

      <label className="field-stack">
        <span>导入后绑定到</span>
        <select
          value={bindingSlot}
          disabled={locked || busy}
          onChange={(event) => setBindingSlot(event.target.value as BindingSlot)}
        >
          {BINDING_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
        <small>{activeOption.description}</small>
      </label>

      <label className={`file-button browser-asset-upload ${locked || busy ? 'is-disabled' : ''}`}>
        {busy ? '正在计算 Hash…' : '上传二进制资产'}
        <input
          type="file"
          accept={activeOption.accept}
          disabled={locked || busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.currentTarget.value = '';
            if (file) void importFile(file);
          }}
        />
      </label>

      {message && <p className="browser-asset-message">{message}</p>}
      {error && <p className="browser-asset-error">{error}</p>}

      <div className="browser-asset-list">
        {assets.slice(0, 6).map((asset) => {
          const referenced = planReferencesUri(activePlan, asset.uri);
          return (
            <div key={asset.contentHash} className={`browser-asset-row ${referenced ? 'is-referenced' : ''}`}>
              <div>
                <strong title={asset.fileName}>{asset.fileName}</strong>
                <span>{asset.mimeType} · {humanBytes(asset.byteLength)}</span>
                <code title={asset.contentHash}>{shortHash(asset.contentHash)}</code>
              </div>
              <div>
                <button
                  type="button"
                  className="icon-button"
                  title="下载原始内容"
                  onClick={() => void download(asset)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="icon-button"
                  title={referenced ? '当前 Plan 正在引用' : '删除本地二进制内容'}
                  disabled={busy || referenced}
                  onClick={() => void remove(asset)}
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
        {assets.length === 0 && (
          <p className="empty-copy">
            二进制文件保存在当前浏览器的 IndexedDB；LocalStorage 只保存轻量 Manifest。
          </p>
        )}
      </div>

      <p className="variant-import-count">
        URI 使用 <code>bcs-asset://sha256/…</code>。同一文件重复导入会去重；同一 Manifest 可由 Web、CLI 或未来 Render Worker 解析。
      </p>
    </div>
  );
}
