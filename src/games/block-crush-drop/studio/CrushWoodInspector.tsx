import type { RenderProgress } from '../../../rendering/renderJob';
import type { CrushWoodDirectorProfile, CrushWoodPresentationPayload, CrushWoodSkinId } from '../types';
import { CRUSH_WOOD_PHASE_LABELS, CRUSH_WOOD_STATUS_LABELS } from './useCrushWoodModel';

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

export function CrushWoodInspector({
  payload,
  skinId,
  seed,
  directorProfile,
  quality,
  totalFrames,
  fps,
  locked,
  exportState,
  onSeed,
  onDirectorProfile,
  onQuality,
  onExportVideo,
  onCancelExport,
}: {
  payload: CrushWoodPresentationPayload;
  skinId: CrushWoodSkinId;
  seed: number;
  directorProfile: CrushWoodDirectorProfile;
  quality: 'preview' | 'standard' | 'cinematic';
  totalFrames: number;
  fps: number;
  locked: boolean;
  exportState: { running: boolean; progress: RenderProgress | null; error: string | null };
  onSeed(seed: number): void;
  onDirectorProfile(patch: Partial<CrushWoodDirectorProfile>): void;
  onQuality(quality: 'preview' | 'standard' | 'cinematic'): void;
  onExportVideo(): Promise<void>;
  onCancelExport(): void;
}) {
  const actionLabel = payload.actionIndex < 0 ? '—' : `${payload.actionIndex + 1} / 9`;
  return (
    <aside className="panel inspector-panel">
      <section>
        <div className="section-heading">
          <span>局面状态</span>
          <small>Live</small>
        </div>
        <div className="render-summary">
          <div><strong>{payload.score}</strong><span>得分</span></div>
          <div><strong>{payload.linesCleared}</strong><span>消行</span></div>
          <div><strong>{CRUSH_WOOD_PHASE_LABELS[payload.phase]}</strong><span>阶段</span></div>
        </div>
        <p className="empty-copy">
          动作 {actionLabel}
          {' · '}队列 {payload.queue[payload.queueIndex % payload.queue.length] ?? '—'}
          {' · '}{CRUSH_WOOD_STATUS_LABELS[payload.status]}
          {' · '}剩余 {Math.ceil(payload.remainingTimeMs / 1_000)}s
        </p>
      </section>

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
          <small>Crush Wooood 使用游戏自有确定性 2.5D 木块后端，输出锁定 1080×1920。</small>
        </label>
        <div className="lookdev-status-card">
          <strong>{skinId}</strong>
          <span>设计坐标 720×1280，经 1.5× 映射到 1080×1920。well (16,140) 688×1125 · cell 32.76×33.09。</span>
        </div>
      </section>

      <section>
        <div className="section-heading">
          <span>导演节奏</span>
          <small>Rhythm</small>
        </div>
        <div className="inline-ranges">
          <RangeField
            label="落块时长"
            value={directorProfile.fallFrames}
            min={8}
            max={48}
            step={1}
            disabled={locked}
            onChange={(fallFrames) => onDirectorProfile({ fallFrames })}
          />
          <RangeField
            label="粉碎时长"
            value={directorProfile.crushFrames}
            min={0}
            max={36}
            step={1}
            disabled={locked}
            onChange={(crushFrames) => onDirectorProfile({ crushFrames })}
          />
          <RangeField
            label="坍落时长"
            value={directorProfile.collapseFrames}
            min={0}
            max={36}
            step={1}
            disabled={locked}
            onChange={(collapseFrames) => onDirectorProfile({ collapseFrames })}
          />
          <RangeField
            label="动作间隔"
            value={directorProfile.interActionGapFrames}
            min={0}
            max={30}
            step={1}
            disabled={locked}
            onChange={(interActionGapFrames) => onDirectorProfile({ interActionGapFrames })}
          />
        </div>
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
            value={seed}
            disabled={locked}
            onChange={(event) => onSeed(Math.max(0, Math.trunc(Number(event.currentTarget.value) || 0)))}
          />
          <small>参考像素回归使用 29980。改变 Seed 只影响碎屑随机，不改写预制落点。</small>
        </label>
      </section>

      <section className="export-section">
        <div className="section-heading">
          <span>高画质导出</span>
          <small>Chrome offline</small>
        </div>
        <label className="field-stack">
          <span>质量档</span>
          <select
            disabled={locked}
            value={quality}
            onChange={(event) => onQuality(event.currentTarget.value as 'preview' | 'standard' | 'cinematic')}
          >
            <option value="preview">快速预览 · 8 Mbps</option>
            <option value="standard">标准成片 · 14 Mbps</option>
            <option value="cinematic">电影档 · 24 Mbps</option>
          </select>
        </label>
        <div className="render-summary">
          <div><strong>1080×1920</strong><span>分辨率</span></div>
          <div><strong>{fps} fps</strong><span>固定帧率</span></div>
          <div><strong>{(totalFrames / fps).toFixed(1)} s</strong><span>成片时长</span></div>
        </div>
        {exportState.running ? (
          <button type="button" className="export-button export-button--cancel" onClick={onCancelExport}>
            取消本次渲染
          </button>
        ) : (
          <button type="button" className="export-button" onClick={() => void onExportVideo()}>
            生成 1080P MP4
          </button>
        )}
        {exportState.progress && (
          <div className="export-progress">
            <div><span style={{ width: `${exportState.progress.ratio * 100}%` }} /></div>
            <p>{exportState.progress.message}</p>
          </div>
        )}
        {exportState.error && <p className="error-copy">{exportState.error}</p>}
      </section>
    </aside>
  );
}
