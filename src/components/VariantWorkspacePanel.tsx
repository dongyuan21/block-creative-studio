import type {
  AssetManifest,
  QualityReport,
  ResolvedRenderPlan,
  VariantLockMode,
  VariantRecipe,
} from '../headless/contracts';
import type { StudioLookOption } from '../integration/studioAssetCatalog';
import type { StudioVariantRow } from '../integration/studioVariantBridge';

type VariantExportKind = 'master' | 'recipe' | 'plan' | 'quality' | 'asset-bundle';

export interface VariantWorkspacePanelProps {
  lockMode: VariantLockMode;
  selectedLookKey: string;
  activeRecipeId: string;
  lookOptions: StudioLookOption[];
  rows: StudioVariantRow[];
  importedAssetCount: number;
  importedRecipeCount: number;
  workspaceError: string | null;
  locked: boolean;
  onLockMode(lockMode: VariantLockMode): void;
  onSelectLook(key: string): void;
  onSelectRecipe(id: string): void;
  onImportAssets(file: File): Promise<void>;
  onImportRecipe(file: File): Promise<void>;
  onExportArtifact(kind: VariantExportKind): void;
}

function activeStatus(row: StudioVariantRow | undefined): {
  label: string;
  tone: 'success' | 'warning' | 'error';
  detail: string;
} {
  if (!row) {
    return { label: '未编译', tone: 'error', detail: '没有可用的变体配方。' };
  }
  if (row.error) {
    return {
      label: '编译失败',
      tone: 'error',
      detail: `${row.error.code} · ${row.error.message}`,
    };
  }
  if (!row.quality?.passed) {
    const first = row.quality?.issues.find((issue) => issue.severity === 'error');
    return {
      label: '门禁未通过',
      tone: 'error',
      detail: first ? `${first.code} · ${first.message}` : '质量门禁返回失败。',
    };
  }
  if (!row.previewSupported) {
    return {
      label: '可编译',
      tone: 'warning',
      detail: '资产契约有效，但当前网页渲染器没有该 Look 的预览绑定。',
    };
  }
  return {
    label: '可渲染',
    tone: 'success',
    detail: '网页预览、CLI 编译和质量门禁使用同一份 Render Plan。',
  };
}

function shortHash(value: string | undefined): string {
  if (!value) return '—';
  return value.length > 20 ? `${value.slice(0, 12)}…${value.slice(-6)}` : value;
}

function downloadLabel(kind: VariantExportKind): string {
  switch (kind) {
    case 'master': return 'Master';
    case 'recipe': return 'Recipe';
    case 'plan': return 'Plan';
    case 'quality': return 'Report';
    case 'asset-bundle': return 'Assets';
  }
}

export function VariantWorkspacePanel({
  lockMode,
  selectedLookKey,
  activeRecipeId,
  lookOptions,
  rows,
  importedAssetCount,
  importedRecipeCount,
  workspaceError,
  locked,
  onLockMode,
  onSelectLook,
  onSelectRecipe,
  onImportAssets,
  onImportRecipe,
  onExportArtifact,
}: VariantWorkspacePanelProps) {
  const active = rows.find((row) => row.recipe.id === activeRecipeId) ?? rows[0];
  const status = activeStatus(active);
  const plan = active?.plan;
  const report = active?.quality;

  return (
    <section className="variant-workspace-section">
      <div className="section-heading">
        <span>变体编译</span>
        <small>Headless Core</small>
      </div>

      <div className={`variant-status-card is-${status.tone}`}>
        <div>
          <span className="variant-status-dot" />
          <strong>{status.label}</strong>
        </div>
        <p>{status.detail}</p>
      </div>

      {workspaceError && <p className="variant-workspace-error">{workspaceError}</p>}

      <label className="field-stack">
        <span>Look Pack</span>
        <select
          value={selectedLookKey}
          disabled={locked}
          onChange={(event) => onSelectLook(event.target.value)}
        >
          {lookOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}{option.origin !== 'builtin' && option.origin !== 'project' ? ` · ${option.origin}` : ''}
            </option>
          ))}
        </select>
        <small>
          {lookOptions.find((option) => option.key === selectedLookKey)?.description
            ?? 'Look Pack 将背景、棋盘、材质、清除与反馈组织为可覆盖的原子槽。'}
        </small>
      </label>

      <label className="field-stack">
        <span>不变量锁定</span>
        <select
          value={lockMode}
          disabled={locked || activeRecipeId !== 'project.current.variant'}
          onChange={(event) => onLockMode(event.target.value as VariantLockMode)}
        >
          <option value="frame-exact">Frame-exact · 帧位完全锁定</option>
          <option value="semantic">Semantic · 玩法事件锁定</option>
          <option value="rule-only">Rule-only · 仅规则锁定</option>
        </select>
        <small>严格换皮使用 Frame-exact；调整节奏时使用 Semantic。</small>
      </label>

      {rows.length > 1 && (
        <div className="variant-matrix-list">
          <div className="variant-matrix-title">
            <span>Variant Matrix</span>
            <small>{rows.length} 条配方</small>
          </div>
          {rows.map((row) => {
            const rowStatus = activeStatus(row);
            return (
              <button
                key={row.recipe.id}
                type="button"
                className={`variant-matrix-row ${row.recipe.id === activeRecipeId ? 'is-active' : ''}`}
                onClick={() => onSelectRecipe(row.recipe.id)}
                disabled={locked}
              >
                <span className={`variant-row-dot is-${rowStatus.tone}`} />
                <span>
                  <strong>{row.recipe.id}</strong>
                  <small>{row.recipe.lockMode} · {row.plan?.renderer ?? 'compile error'}</small>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="variant-plan-summary">
        <div>
          <span>Plan Hash</span>
          <strong title={plan?.planHash}>{shortHash(plan?.planHash)}</strong>
        </div>
        <div>
          <span>Renderer</span>
          <strong>{plan?.renderer ?? '—'}</strong>
        </div>
        <div>
          <span>资产</span>
          <strong>{report?.metrics.assetCount ?? '—'}</strong>
        </div>
        <div>
          <span>预算</span>
          <strong>{report ? `${report.metrics.textureMemoryMiB} MiB` : '—'}</strong>
        </div>
      </div>

      {report && report.issues.length > 0 && (
        <div className="quality-issue-list">
          {report.issues.slice(0, 3).map((issue, index) => (
            <div key={`${issue.code}-${index}`} className={`quality-issue is-${issue.severity}`}>
              <strong>{issue.code}</strong>
              <span>{issue.message}</span>
            </div>
          ))}
          {report.issues.length > 3 && <small>另有 {report.issues.length - 3} 项，导出 Report 查看完整结果。</small>}
        </div>
      )}

      <div className="variant-file-actions">
        <label className={`file-button variant-file-button ${locked ? 'is-disabled' : ''}`}>
          导入资产清单
          <input
            type="file"
            accept=".json,application/json"
            disabled={locked}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.currentTarget.value = '';
              if (file) void onImportAssets(file);
            }}
          />
        </label>
        <label className={`file-button variant-file-button ${locked ? 'is-disabled' : ''}`}>
          导入 Variant
          <input
            type="file"
            accept=".json,application/json"
            disabled={locked}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.currentTarget.value = '';
              if (file) void onImportRecipe(file);
            }}
          />
        </label>
      </div>
      <p className="variant-import-count">
        已导入 {importedAssetCount} 个外部资产、{importedRecipeCount} 条外部配方。只保存 Manifest，不执行任意代码。
      </p>

      <div className="variant-export-actions">
        {(['master', 'recipe', 'plan', 'quality', 'asset-bundle'] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            className="button-secondary"
            disabled={
              (kind === 'plan' && !plan)
              || (kind === 'quality' && !report)
              || (kind === 'recipe' && !active)
            }
            onClick={() => onExportArtifact(kind)}
          >
            {downloadLabel(kind)}
          </button>
        ))}
      </div>
    </section>
  );
}

export type VariantWorkspaceExportArtifact =
  | AssetManifest[]
  | VariantRecipe
  | ResolvedRenderPlan
  | QualityReport;
