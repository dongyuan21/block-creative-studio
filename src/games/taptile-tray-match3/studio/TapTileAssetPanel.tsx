import { TileVisual } from '../../../taptile/visual/TileVisual';
import type { ResolvedTileVisual } from '../../../taptile/visual/types';
import type { SkinCompatibilityReport } from '../../../taptile/visual/types';
import {
  CHAIN_COMBO_UI_THEME_ID,
  type TapTileProjectV2,
  type TapTileTake,
} from '../../../taptile/project';
import {
  FACE_LIBRARY,
  TEMPLATE_OPTIONS,
  type SceneThemeId,
  type StackTemplateId,
  type TileMaterialId,
} from '../../../taptile/stackModel';

const SCENE_THEMES: Array<{ id: SceneThemeId; label: string }> = [
  { id: 'deep-ocean', label: '深海蓝岛' },
  { id: 'sunset', label: '日落旷野' },
  { id: 'candy', label: '糖果乐园' },
  { id: 'forest', label: '薄雾森林' },
];

const MATERIALS: Array<{ id: TileMaterialId; label: string }> = [
  { id: 'porcelain', label: '经典休闲牌' },
  { id: 'ice', label: '冰瓷圆角' },
  { id: 'jelly', label: '透明果冻' },
  { id: 'paper', label: '磨砂纸牌' },
];

export interface TapTileMatchGroupPreview {
  face: (typeof FACE_LIBRARY)[number];
  index: number;
  visual: ResolvedTileVisual | null;
  visibleName: string;
  label: string;
}

export function TapTileAssetPanel({
  project,
  matchGroupPreviews,
  selectedSkinCompatibility,
  selectedTakeId,
  setupEditable,
  takesLocked,
  lookLocked,
  onTemplate,
  onSceneTheme,
  onVisualTheme,
  onRerollFaces,
  onMaterial,
  onChooseFace,
  onSelectTake,
  onDeleteTake,
}: {
  project: TapTileProjectV2;
  matchGroupPreviews: readonly TapTileMatchGroupPreview[];
  selectedSkinCompatibility: SkinCompatibilityReport;
  selectedTakeId: string | null;
  setupEditable: boolean;
  takesLocked: boolean;
  lookLocked: boolean;
  onTemplate(id: StackTemplateId): void;
  onSceneTheme(id: SceneThemeId): void;
  onVisualTheme(themeId: string): void;
  onRerollFaces(): void;
  onMaterial(id: TileMaterialId): void;
  onChooseFace(faceId: string): void;
  onSelectTake(takeId: string): void;
  onDeleteTake(takeId: string): void;
}) {
  const selectedTheme = project.visuals.themes[project.visuals.selectedThemeId];
  return (
    <aside className="panel asset-panel">
      <section>
        <div className="section-heading">
          <span>牌面</span>
          <small>Board</small>
        </div>
        <div className="preset-grid preset-grid--two">
          {TEMPLATE_OPTIONS.map((template) => (
            <button
              key={template.id}
              type="button"
              className={project.authoring.templateId === template.id ? 'preset-card is-active' : 'preset-card'}
              disabled={!setupEditable}
              onClick={() => onTemplate(template.id)}
            >
              <span className="preset-card__icon">{template.id === 'hourglass' ? '⌛' : template.id === 't-shape' ? 'T' : template.id === 'terraces' ? '≡' : '·'}</span>
              <strong>{template.label}</strong>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="section-heading">
          <span>外观</span>
          <small>Look</small>
        </div>
        <div className="preset-grid preset-grid--two">
          {SCENE_THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={project.authoring.sceneTheme === theme.id ? 'preset-card is-active' : 'preset-card'}
              disabled={lookLocked}
              onClick={() => onSceneTheme(theme.id)}
            >
              <span className={`preset-card__icon taptile-scene-swatch taptile-scene-swatch--${theme.id}`} />
              <strong>{theme.label}</strong>
            </button>
          ))}
        </div>
        <label className="field-stack">
          <span>牌面分组（不改玩法）</span>
          <select
            data-face-group-select
            disabled={takesLocked}
            value={project.visuals.selectedThemeId}
            onChange={(event) => onVisualTheme(event.target.value)}
          >
            {Object.values(project.visuals.themes).map((theme) => (
              <option key={theme.id} value={theme.id}>{theme.name}</option>
            ))}
          </select>
          <small
            className={selectedSkinCompatibility.valid ? 'tpt-skin-compat is-valid' : 'tpt-skin-compat is-invalid'}
            data-skin-valid={selectedSkinCompatibility.valid ? 'true' : 'false'}
            data-skin-theme={selectedSkinCompatibility.themeId}
          >
            {selectedSkinCompatibility.valid
              ? `${selectedSkinCompatibility.coveredArchetypeIds.length} 个匹配组全部覆盖`
              : `${selectedSkinCompatibility.issues.filter((issue) => issue.severity === 'error').length} 个兼容错误`}
          </small>
        </label>
        {project.visuals.selectedThemeId === CHAIN_COMBO_UI_THEME_ID && (
          <div className="crush-queue-actions" data-face-group={CHAIN_COMBO_UI_THEME_ID}>
            <button type="button" className="button-secondary" data-action="reroll-face-group" disabled={lookLocked} onClick={onRerollFaces}>
              重新随机
            </button>
          </div>
        )}
        <div className="preset-grid preset-grid--two">
          {MATERIALS.map((material) => (
            <button
              key={material.id}
              type="button"
              className={project.authoring.material === material.id ? 'preset-card is-active' : 'preset-card'}
              disabled={lookLocked}
              onClick={() => onMaterial(material.id)}
            >
              <span className={`preset-card__icon taptile-material-swatch taptile-material-swatch--${material.id}`} />
              <strong>{material.label}</strong>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="section-heading">
          <span>匹配组</span>
          <small>{FACE_LIBRARY.length} · {selectedTheme?.name ?? 'MATCH KEYS'}</small>
        </div>
        <p className="empty-copy">每种牌仍为 3 的倍数。点选会改玩法与 Take；纯换皮请用上方外观。</p>
        <div className="shape-grid taptile-match-grid" data-match-group-theme={project.visuals.selectedThemeId}>
          {matchGroupPreviews.map(({ face, index, visual, visibleName, label }) => (
            <button
              key={face.id}
              type="button"
              className="shape-card"
              title={`匹配分组 ${index + 1} · 当前牌面：${visibleName}`}
              disabled={!setupEditable}
              data-match-key={face.id}
              data-preview-face-assembly={visual?.faceAssembly.id}
              onClick={() => onChooseFace(face.id)}
            >
              <span className="taptile-match-preview" aria-hidden="true">
                {visual ? <TileVisual visual={visual} /> : <span>{face.glyph}</span>}
              </span>
              <small>{label}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="takes-section">
        <div className="section-heading">
          <span>试玩 Take</span>
          <small>{project.takes.length}</small>
        </div>
        <div className="take-list">
          {project.takes.length === 0 && <p className="empty-copy">先进行真人试玩或机器试玩。</p>}
          {project.takes.map((take: TapTileTake) => (
            <div key={take.id} className={selectedTakeId === take.id ? 'take-row is-active' : 'take-row'}>
              <button type="button" disabled={takesLocked} onClick={() => onSelectTake(take.id)}>
                <strong>{take.name}</strong>
                <span>{take.actions.length} 步 · {take.actions[0]?.actor === 'human' ? '人类' : 'Agent'} · {take.result}</span>
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`删除 ${take.name}`}
                disabled={takesLocked}
                onClick={() => onDeleteTake(take.id)}
              >×</button>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
