import type { FrameRenderProgress } from '../../../exporter/fixedFrameExporter';
import { TapTileProductionPanel } from '../../../taptile/production/TapTileProductionPanel';
import {
  FACE_LIBRARY,
  type StackTile,
} from '../../../taptile/stackModel';
import { type StackAlignmentCommand } from '../../../taptile/stackAlignment';
import type {
  CompiledTapTileLevel,
  TapTileDirectorProfile,
  TapTileDirectorTiming,
  TapTileProjectV2,
  TapTileTake,
} from '../../../taptile/project';
import type { CompiledTapTileTake } from '../../../taptile/director';
import type { TapTileCanvasPreviewState } from '../../../taptile/render/TapTileCanvasPreview';
import type { TapTileWorkspaceMode } from '../../../taptile/workspace/WorkspaceMode';

const ALIGNMENT_ACTIONS: Array<{
  command: StackAlignmentCommand;
  label: string;
  shortLabel: string;
  minimum: number;
}> = [
  { command: 'left', label: '左边缘对齐', shortLabel: '左对齐', minimum: 2 },
  { command: 'center-x', label: '水平中心对齐', shortLabel: '水平居中', minimum: 2 },
  { command: 'right', label: '右边缘对齐', shortLabel: '右对齐', minimum: 2 },
  { command: 'top', label: '上边缘对齐', shortLabel: '顶对齐', minimum: 2 },
  { command: 'center-y', label: '垂直中心对齐', shortLabel: '垂直居中', minimum: 2 },
  { command: 'bottom', label: '下边缘对齐', shortLabel: '底对齐', minimum: 2 },
  { command: 'distribute-x', label: '横向等距分布', shortLabel: '横向等距', minimum: 3 },
  { command: 'distribute-y', label: '纵向等距分布', shortLabel: '纵向等距', minimum: 3 },
];

function RangeField({
  label,
  value,
  min,
  max,
  step,
  suffix = 'f',
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  disabled: boolean;
  onChange(value: number): void;
}) {
  return (
    <label className="range-field">
      <span>{label}</span>
      <output>{value}{suffix}</output>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
}

export interface TapTileExportResult {
  url: string;
  fileName: string;
  bytes: number;
  frameCount: number;
  durationSeconds: number;
  verifiedFrame: number;
  verifiedPixelHash: string;
  renderIdentityHash: string;
  containerVerified: boolean;
  actualFps: number;
  actualVideoBitrate: number;
  minimumVisualPsnrDb: number;
}

export function TapTileInspector({
  project,
  compiledLevel,
  liveTrayCount,
  liveStatus,
  workspaceMode,
  workspaceModeLabel,
  selectedTake,
  compiledDirector,
  directorFrame,
  directorPreviewState,
  directorPreviewReady,
  primaryTile,
  selectedIds,
  highestLayer,
  setupEditable,
  locked,
  exportProgress,
  exportError,
  exportResult,
  exportRunning,
  renderRegressionFrames,
  onDirectorProfile,
  onDirectorTiming,
  onDirectorSeed,
  onRenderQuality,
  onDirectorFrame,
  onExportVideo,
  onCancelExport,
  onUpdateSelected,
  onAlign,
  onPairOverride,
  onSelectIssueTile,
  onSnap,
  onShowLayerBadges,
  onCommitProject,
  onImportProject,
  onNotice,
}: {
  project: TapTileProjectV2;
  compiledLevel: CompiledTapTileLevel;
  liveTrayCount: number;
  liveStatus: string;
  workspaceMode: TapTileWorkspaceMode;
  workspaceModeLabel: string;
  selectedTake: TapTileTake | null;
  compiledDirector: CompiledTapTileTake | null;
  directorFrame: number;
  directorPreviewState: TapTileCanvasPreviewState | null;
  directorPreviewReady: boolean;
  primaryTile: StackTile | null;
  selectedIds: readonly string[];
  highestLayer: number;
  setupEditable: boolean;
  locked: boolean;
  exportProgress: FrameRenderProgress | null;
  exportError: string;
  exportResult: TapTileExportResult | null;
  exportRunning: boolean;
  renderRegressionFrames: readonly unknown[];
  onDirectorProfile(profileId: string): void;
  onDirectorTiming(patch: Partial<TapTileDirectorTiming> & Pick<Partial<TapTileDirectorProfile>, 'betweenActionFrames'>): void;
  onDirectorSeed(seed: number): void;
  onRenderQuality(quality: TapTileProjectV2['render']['quality']): void;
  onDirectorFrame(frame: number): void;
  onExportVideo(): Promise<void>;
  onCancelExport(): void;
  onUpdateSelected(mutate: (tile: StackTile) => StackTile): void;
  onAlign(command: StackAlignmentCommand, label: string, minimum: number): void;
  onPairOverride(kind: 'ignored' | 'forced'): void;
  onSelectIssueTile(tileId: string, message: string): void;
  onSnap(enabled: boolean): void;
  onShowLayerBadges(enabled: boolean): void;
  onCommitProject(mutate: (draft: TapTileProjectV2) => void): void;
  onImportProject(next: TapTileProjectV2): void;
  onNotice(message: string): void;
}) {
  const profile = project.director.profiles[project.director.selectedProfileId];
  const errorCount = compiledLevel.validation.issues.filter((issue) => issue.severity === 'error').length;
  const warningCount = compiledLevel.validation.issues.filter((issue) => issue.severity === 'warning').length;
  const statusLabel = liveStatus === 'won' ? '已过关' : liveStatus === 'lost' ? '失败终局' : compiledLevel.validation.valid ? '关卡有效' : '待修复';

  return (
    <aside className="panel inspector-panel">
      <section>
        <div className="section-heading">
          <span>局面状态</span>
          <small>Live</small>
        </div>
        <div className="render-summary">
          <div><strong>{Object.keys(compiledLevel.tiles).length}</strong><span>牌块</span></div>
          <div><strong>{liveTrayCount}/7</strong><span>槽位</span></div>
          <div><strong>{compiledLevel.initialPlayableIds.length}</strong><span>可点</span></div>
        </div>
        <p className="empty-copy">
          {workspaceModeLabel}
          {' · '}
          {statusLabel}
          {' · '}
          {selectedTake ? selectedTake.name : '尚无 Take'}
        </p>
      </section>

      {primaryTile && (
        <section>
          <div className="section-heading">
            <span>选中牌块</span>
            <small>{selectedIds.length}</small>
          </div>
          <div className="taptile-selected-copy">
            <strong>{FACE_LIBRARY.find((face) => face.id === primaryTile.faceId)?.label ?? primaryTile.faceId}</strong>
            <span>{selectedIds.length > 1 ? `同时选中 ${selectedIds.length} 张` : primaryTile.id}</span>
          </div>
          <div className="two-column-field">
            <label className="compact-field">
              <span>X</span>
              <input
                type="number"
                value={Math.round(primaryTile.x)}
                disabled={!setupEditable}
                onChange={(event) => {
                  const delta = Number(event.target.value) - primaryTile.x;
                  onUpdateSelected((tile) => ({ ...tile, x: tile.x + delta }));
                }}
              />
            </label>
            <label className="compact-field">
              <span>Y</span>
              <input
                type="number"
                value={Math.round(primaryTile.y)}
                disabled={!setupEditable}
                onChange={(event) => {
                  const delta = Number(event.target.value) - primaryTile.y;
                  onUpdateSelected((tile) => ({ ...tile, y: tile.y + delta }));
                }}
              />
            </label>
          </div>
          <div className="inline-ranges">
            <RangeField
              label="层"
              value={primaryTile.layer + 1}
              min={1}
              max={Math.max(8, highestLayer + 2)}
              step={1}
              suffix=""
              disabled={!setupEditable}
              onChange={(layer) => onUpdateSelected((tile) => ({ ...tile, layer: layer - 1 }))}
            />
            <RangeField
              label="大小"
              value={Math.round(primaryTile.scale * 100)}
              min={55}
              max={165}
              step={1}
              suffix="%"
              disabled={!setupEditable}
              onChange={(scale) => onUpdateSelected((tile) => ({ ...tile, scale: scale / 100 }))}
            />
            <RangeField
              label="旋转"
              value={Math.round(primaryTile.rotation)}
              min={-45}
              max={45}
              step={1}
              suffix="°"
              disabled={!setupEditable}
              onChange={(rotation) => onUpdateSelected((tile) => ({ ...tile, rotation }))}
            />
          </div>
          {selectedIds.length > 1 && (
            <div className="shape-grid">
              {ALIGNMENT_ACTIONS.map((action) => (
                <button
                  key={action.command}
                  type="button"
                  className="shape-card"
                  disabled={!setupEditable || selectedIds.length < action.minimum}
                  onClick={() => onAlign(action.command, action.label, action.minimum)}
                  title={action.label}
                >{action.shortLabel}</button>
              ))}
            </div>
          )}
          {selectedIds.length === 2 && (
            <div className="crush-queue-actions">
              <button type="button" className="button-secondary" disabled={!setupEditable} onClick={() => onPairOverride('ignored')}>忽略阻挡</button>
              <button type="button" className="button-secondary" disabled={!setupEditable} onClick={() => onPairOverride('forced')}>强制阻挡</button>
            </div>
          )}
        </section>
      )}

      {(!compiledLevel.validation.valid || primaryTile) && (
        <section>
          <div className="section-heading">
            <span>关卡与阻挡</span>
            <small>{compiledLevel.validation.valid ? 'VALID' : 'ACTION REQUIRED'}</small>
          </div>
          <p className="empty-copy">{errorCount} 错误 · {warningCount} 警告 · {compiledLevel.initialPlayableIds.length} 张初始可点</p>
          {!compiledLevel.validation.valid && (
            <div className="taptile-issue-list">
              {compiledLevel.validation.issues.filter((issue) => issue.severity !== 'info').slice(0, 6).map((issue, index) => (
                <button
                  key={`${issue.code}-${index}`}
                  type="button"
                  className="button-secondary"
                  onClick={() => {
                    const tileId = issue.objectIds.find((id) => compiledLevel.tiles[id]);
                    if (tileId) onSelectIssueTile(tileId, `${issue.code}：${issue.message}${issue.suggestion ? ` · ${issue.suggestion}` : ''}`);
                    else onNotice(`${issue.code}：${issue.message}`);
                  }}
                ><b>{issue.code}</b></button>
              ))}
            </div>
          )}
          {primaryTile && (
            <p className="empty-copy" data-selected-tile={primaryTile.id}>
              阻挡它：{(compiledLevel.blockersByTile[primaryTile.id] ?? []).join('、') || '无'}
              {' · '}它阻挡：{(compiledLevel.dependentsByTile[primaryTile.id] ?? []).join('、') || '无'}
            </p>
          )}
        </section>
      )}

      <section>
        <div className="section-heading">
          <span>表现基线</span>
          <small>Renderer</small>
        </div>
        <label className="field-stack">
          <span>渲染模式</span>
          <select disabled value="fixed-camera-cinematic">
            <option value="fixed-camera-cinematic">固定机位 Cinematic</option>
          </select>
          <small>设计坐标 432×768，经 2.5× 映射到 1080×1920。左侧改牌面，中间堆叠编辑，右侧导出成片。</small>
        </label>
        <div className="lookdev-status-card">
          <strong>{project.authoring.material}</strong>
          <span>智能吸附 {project.authoring.snap ? '开' : '关'} · 层数徽标 {project.authoring.showLayerBadges ? '显示' : '隐藏'}</span>
        </div>
        <label className="compact-field checkbox-field">
          <input disabled={!setupEditable} type="checkbox" checked={project.authoring.snap} onChange={(event) => onSnap(event.target.checked)} />
          <span>智能吸附</span>
        </label>
        <label className="compact-field checkbox-field">
          <input disabled={!setupEditable} type="checkbox" checked={project.authoring.showLayerBadges} onChange={(event) => onShowLayerBadges(event.target.checked)} />
          <span>显示层数</span>
        </label>
      </section>

      <section>
        <div className="section-heading">
          <span>导演节奏</span>
          <small>Rhythm</small>
        </div>
        <label className="field-stack">
          <span>Director Profile</span>
          <select
            data-director-profile
            disabled={locked}
            value={project.director.selectedProfileId}
            onChange={(event) => onDirectorProfile(event.target.value)}
          >
            {Object.values(project.director.profiles).map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        {profile && (
          <div className="inline-ranges">
            <RangeField
              label="飞入时长"
              value={profile.timing.flightFrames}
              min={4}
              max={48}
              step={1}
              disabled={locked}
              onChange={(flightFrames) => onDirectorTiming({ flightFrames })}
            />
            <RangeField
              label="三消时长"
              value={profile.timing.matchVfxFrames}
              min={8}
              max={48}
              step={1}
              disabled={locked}
              onChange={(matchVfxFrames) => onDirectorTiming({ matchVfxFrames })}
            />
            <RangeField
              label="动作间隔"
              value={profile.betweenActionFrames}
              min={0}
              max={30}
              step={1}
              disabled={locked}
              onChange={(betweenActionFrames) => onDirectorTiming({ betweenActionFrames })}
            />
          </div>
        )}
      </section>

      <section>
        <div className="section-heading">
          <span>确定性</span>
          <small>Seed</small>
        </div>
        <label className="field-stack">
          <span>局面随机种子</span>
          <input
            type="number"
            min={0}
            max={2_147_483_647}
            step={1}
            value={project.director.seed}
            disabled={!setupEditable}
            onChange={(event) => onDirectorSeed(Number(event.currentTarget.value))}
          />
          <small>改牌面或匹配组会使已保存 Take 失效。</small>
        </label>
      </section>

      <section
        className="export-section"
        data-export-phase={exportProgress?.phase ?? 'idle'}
        data-export-frames={exportResult?.frameCount ?? 0}
        data-export-bytes={exportResult?.bytes ?? 0}
        data-export-duration={exportResult?.durationSeconds ?? 0}
        data-export-verified-frame={exportResult?.verifiedFrame ?? -1}
        data-export-verified-pixel-hash={exportResult?.verifiedPixelHash ?? ''}
        data-export-render-identity={exportResult?.renderIdentityHash ?? ''}
        data-export-container-verified={exportResult?.containerVerified ? 'true' : 'false'}
        data-export-actual-fps={exportResult?.actualFps ?? 0}
        data-export-actual-video-bitrate={exportResult?.actualVideoBitrate ?? 0}
        data-export-minimum-psnr={exportResult?.minimumVisualPsnrDb ?? 0}
        data-preview-parity={directorPreviewReady ? 'ready' : directorPreviewState?.status ?? 'pending'}
        data-regression-frames={JSON.stringify(renderRegressionFrames)}
      >
        <div className="section-heading">
          <span>高画质导出</span>
          <small>Chrome offline</small>
        </div>
        <label className="field-stack">
          <span>质量档</span>
          <select
            disabled={locked}
            value={project.render.quality}
            onChange={(event) => onRenderQuality(event.currentTarget.value as TapTileProjectV2['render']['quality'])}
          >
            <option value="preview">快速预览 · 8 Mbps</option>
            <option value="standard">标准成片 · 14 Mbps</option>
            <option value="cinematic">电影档 · 24 Mbps</option>
          </select>
        </label>
        <div className="render-summary">
          <div><strong>1080×1920</strong><span>分辨率</span></div>
          <div><strong>{project.render.fps} fps</strong><span>固定帧率</span></div>
          <div><strong>{compiledDirector ? (compiledDirector.totalFrames / project.render.fps).toFixed(1) : '—'} s</strong><span>成片时长</span></div>
        </div>
        {compiledDirector && (
          <label className="range-field">
            <span>检查帧</span>
            <output>{directorFrame}</output>
            <input data-export-preview-seek type="range" min={0} max={compiledDirector.totalFrames - 1} value={directorFrame} onChange={(event) => onDirectorFrame(Number(event.target.value))} />
          </label>
        )}
        {exportRunning ? (
          <button type="button" className="export-button export-button--cancel" data-action="cancel-taptile-export" onClick={onCancelExport}>
            取消本次渲染
          </button>
        ) : (
          <button
            type="button"
            className="export-button"
            data-action="start-taptile-export"
            disabled={!compiledDirector || !directorPreviewReady || locked}
            onClick={() => void onExportVideo()}
          >
            生成 1080P MP4
          </button>
        )}
        {exportProgress && (
          <div className="export-progress">
            <div><span style={{ width: `${exportProgress.ratio * 100}%` }} /></div>
            <p>{exportProgress.message}</p>
          </div>
        )}
        {exportError && <p className="error-copy">{exportError}</p>}
        {!compiledDirector && <p className="empty-copy">先保存一次人类或机器试玩 Take。</p>}
        {compiledDirector && !directorPreviewReady && <p className="empty-copy">先点导演回放锁定画面。</p>}
        {exportResult?.containerVerified && (
          <p className="empty-copy">✓ MP4 回读验收通过 · {exportResult.frameCount} 帧 · {exportResult.actualFps.toFixed(3)}fps</p>
        )}
        {exportResult && <a data-export-download href={exportResult.url} download={exportResult.fileName}>下载 {exportResult.fileName}</a>}
      </section>

      {workspaceMode === 'export' && compiledDirector && (
        <TapTileProductionPanel
          project={project}
          level={compiledLevel}
          onChange={onCommitProject}
          onImport={onImportProject}
          onNotice={onNotice}
        />
      )}
    </aside>
  );
}
