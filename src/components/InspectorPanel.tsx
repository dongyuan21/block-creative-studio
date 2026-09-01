import type {
  CameraPresetId,
  CompiledTake,
  FxPresetId,
  GeometryPresetId,
  LightingPresetId,
  MaterialPresetId,
  ProjectSpec,
  RhythmPresetId,
  RhythmProfile,
  StyleSpec,
  Take,
} from '../domain/types';
import type { RenderProgress } from '../exporter/offlineVideoExporter';
import {
  CAMERA_OPTIONS,
  FX_OPTIONS,
  GEOMETRY_DEFAULTS,
  GEOMETRY_OPTIONS,
  LIGHTING_OPTIONS,
  MATERIAL_OPTIONS,
} from '../renderer/stylePresets';
import { RHYTHM_PRESET_LIST } from '../director/rhythmPresets';

interface InspectorPanelProps {
  style: StyleSpec;
  rhythm: RhythmProfile;
  render: ProjectSpec['render'];
  seed: number;
  take: Take | null;
  compiled: CompiledTake | null;
  locked: boolean;
  setupEditable: boolean;
  exportState: { running: boolean; progress: RenderProgress | null; error: string | null };
  onStyle(patch: Partial<StyleSpec>): void;
  onGeometry(patch: Partial<StyleSpec['geometry']>): void;
  onRhythmPreset(id: RhythmPresetId): void;
  onRhythm(patch: Partial<RhythmProfile>): void;
  onSeed(seed: number): void;
  onRenderQuality(quality: ProjectSpec['render']['quality']): void;
  onExportVideo(): Promise<void>;
  onCancelExport(): void;
}

function SelectField<T extends string>({
  label,
  value,
  options,
  disabled = false,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ id: T; label: string; description: string }>;
  disabled?: boolean;
  onChange(value: T): void;
}) {
  const active = options.find((option) => option.id === value);
  return (
    <label className="field-stack">
      <span>{label}</span>
      <select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      {active && <small>{active.description}</small>}
    </label>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  suffix = '',
  disabled = false,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  disabled?: boolean;
  onChange(value: number): void;
}) {
  return (
    <label className="range-field">
      <span>{label}</span>
      <output>{value.toFixed(step < 0.1 ? 2 : 1)}{suffix}</output>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function InspectorPanel({
  style,
  rhythm,
  render,
  seed,
  take,
  compiled,
  locked,
  setupEditable,
  exportState,
  onStyle,
  onGeometry,
  onRhythmPreset,
  onRhythm,
  onSeed,
  onRenderQuality,
  onExportVideo,
  onCancelExport,
}: InspectorPanelProps) {
  return (
    <aside className="panel inspector-panel">
      <section>
        <div className="section-heading">
          <span>视觉质感</span>
          <small>Look</small>
        </div>
        <SelectField<GeometryPresetId>
          label="彩块几何"
          value={style.geometry.id}
          options={GEOMETRY_OPTIONS}
          disabled={locked}
          onChange={(id) => onGeometry(GEOMETRY_DEFAULTS[id])}
        />
        <SelectField<MaterialPresetId>
          label="材质"
          value={style.material}
          options={MATERIAL_OPTIONS}
          disabled={locked}
          onChange={(material) => onStyle({ material })}
        />
        <div className="inline-ranges">
          <RangeField label="厚度" value={style.geometry.depth} min={0.18} max={0.72} step={0.01} disabled={locked} onChange={(depth) => onGeometry({ depth })} />
          <RangeField label="倒角" value={style.geometry.bevel} min={0.04} max={0.24} step={0.01} disabled={locked} onChange={(bevel) => onGeometry({ bevel })} />
          <RangeField label="间隙" value={style.geometry.gap} min={0.04} max={0.18} step={0.01} disabled={locked} onChange={(gap) => onGeometry({ gap })} />
        </div>
        <SelectField<LightingPresetId>
          label="灯光"
          value={style.lighting}
          options={LIGHTING_OPTIONS}
          disabled={locked}
          onChange={(lighting) => onStyle({ lighting })}
        />
        <SelectField<CameraPresetId>
          label="摄像机"
          value={style.camera}
          options={CAMERA_OPTIONS}
          disabled={locked}
          onChange={(camera) => onStyle({ camera })}
        />
        <SelectField<FxPresetId>
          label="3D 清除特效"
          value={style.fx}
          options={FX_OPTIONS}
          disabled={locked}
          onChange={(fx) => onStyle({ fx })}
        />
        <div className="two-column-field">
          <label className="compact-field">
            <span>背景</span>
            <input type="color" value={style.background} disabled={locked} onChange={(event) => onStyle({ background: event.target.value })} />
          </label>
          <label className="compact-field checkbox-field">
            <input type="checkbox" checked={style.showPointer} disabled={locked} onChange={(event) => onStyle({ showPointer: event.target.checked })} />
            <span>显示指针</span>
          </label>
        </div>
      </section>

      <section>
        <div className="section-heading">
          <span>导演节奏</span>
          <small>Rhythm</small>
        </div>
        <SelectField<RhythmPresetId>
          label="节奏模板"
          value={rhythm.id}
          options={RHYTHM_PRESET_LIST}
          disabled={locked}
          onChange={onRhythmPreset}
        />
        <RangeField
          label="全局速度"
          value={rhythm.globalSpeed}
          min={0.72}
          max={1.5}
          step={0.01}
          suffix="×"
          disabled={locked}
          onChange={(globalSpeed) => onRhythm({ globalSpeed })}
        />
        <RangeField
          label="拖拽时长"
          value={rhythm.dragFrames}
          min={8}
          max={36}
          step={1}
          suffix="f"
          disabled={locked}
          onChange={(dragFrames) => onRhythm({ dragFrames })}
        />
        <RangeField
          label="动作间隔"
          value={rhythm.betweenActionFrames}
          min={2}
          max={30}
          step={1}
          suffix="f"
          disabled={locked}
          onChange={(betweenActionFrames) => onRhythm({ betweenActionFrames })}
        />
        <RangeField
          label="清除时长"
          value={rhythm.clearDurationFrames}
          min={7}
          max={34}
          step={1}
          suffix="f"
          disabled={locked}
          onChange={(clearDurationFrames) => onRhythm({ clearDurationFrames })}
        />
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
            disabled={!setupEditable}
            onChange={(event) => onSeed(Number(event.target.value))}
          />
          <small>改变 Seed 会清空旧 Take，保证候选刷新与特效随机可复现。</small>
        </label>
      </section>

      <section className="export-section">
        <div className="section-heading">
          <span>高画质导出</span>
          <small>Chrome offline</small>
        </div>
        <label className="field-stack">
          <span>质量档</span>
          <select disabled={locked} value={render.quality} onChange={(event) => onRenderQuality(event.target.value as ProjectSpec['render']['quality'])}>
            <option value="preview">快速预览 · 8 Mbps</option>
            <option value="standard">标准成片 · 14 Mbps</option>
            <option value="cinematic">电影档 · 24 Mbps</option>
          </select>
        </label>
        <div className="render-summary">
          <div><strong>{render.width}×{render.height}</strong><span>分辨率</span></div>
          <div><strong>{render.fps} fps</strong><span>固定帧率</span></div>
          <div><strong>{compiled ? (compiled.totalFrames / compiled.fps).toFixed(1) : '—'} s</strong><span>成片时长</span></div>
        </div>
        {exportState.running ? (
          <button className="export-button export-button--cancel" onClick={onCancelExport}>
            取消本次渲染
          </button>
        ) : (
          <button className="export-button" disabled={!take || locked} onClick={() => void onExportVideo()}>
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
        {!take && <p className="empty-copy">先保存一次人类或机器试玩 Take。</p>}
      </section>
    </aside>
  );
}
