import {
  requireCatalogOption,
  type GameAuthoringAdapter,
  type GameAuthoringCatalog,
  type GameAuthoringDocumentRequest,
  type GameAuthoringScaffoldRequest,
} from '../../game-runtime/authoringAdapter';
import { GameRuntimeError } from '../../game-runtime/errors';
import { CHAIN_COMBO_UI_THEME_ID, ensureChainComboFaceTheme } from '../../taptile/project/builtInFaceThemes';
import { createDefaultTapTileProject, parseTapTileProjectV2, type TapTileProjectV2 } from '../../taptile/project';
import { validateSkinPack } from '../../taptile/visual/compatibility';
import { TAPTILE_TRAY_MATCH3_GAME_ID } from './manifest';
import { createTapTileDocument } from './project';

const TEMPLATES = [
  { id: 'hourglass', label: '沙漏' },
  { id: 't-shape', label: 'T 型' },
  { id: 'terraces', label: '阶梯' },
  { id: 'free', label: '自由' },
] as const;

const SKINS = [
  { id: 'animals-v1', label: '动物乐园', notes: 'Built-in glyph theme. Gameplay levelHash is unchanged.' },
  { id: 'food-v1', label: '缤纷食物', notes: 'Built-in glyph theme. Gameplay levelHash is unchanged.' },
  { id: CHAIN_COMBO_UI_THEME_ID, label: '连消彩绘', notes: 'Chain-combo face pack. Replaces in-game tile UI, not Studio chrome.' },
];

function catalog(): GameAuthoringCatalog {
  return { gameId: TAPTILE_TRAY_MATCH3_GAME_ID, templates: TEMPLATES, skins: SKINS };
}

function isTemplate(id: string): id is TapTileProjectV2['authoring']['templateId'] {
  return TEMPLATES.some((item) => item.id === id);
}

function selectTheme(project: TapTileProjectV2, skinId: string): TapTileProjectV2 {
  const next = skinId === CHAIN_COMBO_UI_THEME_ID
    ? ensureChainComboFaceTheme(project)
    : structuredClone(project);
  next.visuals.selectedThemeId = skinId;
  const report = validateSkinPack(next, skinId);
  if (!report.valid) {
    throw new GameRuntimeError(
      'SKIN_INCOMPATIBLE',
      report.issues[0]?.message ?? `Theme ${skinId} is not compatible with this project.`,
      { details: report },
    );
  }
  return next;
}

export const tapTileTrayMatch3Authoring: GameAuthoringAdapter = {
  gameId: TAPTILE_TRAY_MATCH3_GAME_ID,
  catalog,
  scaffold(request: GameAuthoringScaffoldRequest) {
    const templateId = requireCatalogOption('template', request.template, TEMPLATES, 'hourglass');
    const skinId = requireCatalogOption('skin', request.skin, SKINS, 'animals-v1');
    if (!isTemplate(templateId)) {
      throw new GameRuntimeError('UNKNOWN_TEMPLATE', `Unknown TapTile template ${templateId}.`);
    }
    const project = selectTheme(createDefaultTapTileProject(templateId), skinId);
    project.director.seed = request.seed;
    if (request.name !== undefined) project.name = request.name;
    return {
      config: project,
      skinId,
      templateId,
      catalog: catalog(),
      notes: [`Template ${templateId} with theme ${skinId}. Studio chrome is not replaced.`],
    };
  },
  applySkin(config, skinId) {
    const resolved = requireCatalogOption('skin', skinId, SKINS, 'animals-v1');
    const project = selectTheme(parseTapTileProjectV2(config), resolved);
    return {
      config: project,
      skinId: resolved,
      notes: ['In-game tile/HUD theme replaced. Studio shell chrome is unchanged.'],
    };
  },
  emitDocument(request: GameAuthoringDocumentRequest) {
    let project = parseTapTileProjectV2(request.config);
    if (request.skin) {
      project = selectTheme(project, requireCatalogOption('skin', request.skin, SKINS, 'animals-v1'));
    }
    return createTapTileDocument(project, {
      seed: request.seed,
      includeGateTake: false,
      takes: request.takes ? [...request.takes] : [],
      ...(request.name !== undefined ? { name: request.name } : {}),
      ...(request.quality !== undefined ? { quality: request.quality } : {}),
    });
  },
};
