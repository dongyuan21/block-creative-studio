import {
  requireCatalogOption,
  type GameAuthoringAdapter,
  type GameAuthoringCatalog,
  type GameAuthoringDocumentRequest,
  type GameAuthoringScaffoldRequest,
} from '../../game-runtime/authoringAdapter';
import {
  CRUSH_WOOD_BOARD_PRESETS,
  CRUSH_WOOD_SKINS,
  createCrushWoodReferenceConfig,
  crushWoodRowsForPreset,
  type CrushWoodBoardPresetId,
} from './levels';
import { BLOCK_CRUSH_DROP_GAME_ID } from './manifest';
import { createCrushWoodDocument } from './project';
import { crushWoodConfigSchema } from './schemas';
import type { CrushWoodSkinId } from './types';

const TEMPLATES = CRUSH_WOOD_BOARD_PRESETS.map((preset) => ({ id: preset.id, label: preset.label }));
const SKINS = CRUSH_WOOD_SKINS.map((skin) => ({
  id: skin.id,
  label: skin.label,
  notes: 'Canvas palette swap. skinId is part of Crush Wood state hash.',
}));

function catalog(): GameAuthoringCatalog {
  return { gameId: BLOCK_CRUSH_DROP_GAME_ID, templates: TEMPLATES, skins: SKINS };
}

function isPreset(id: string): id is CrushWoodBoardPresetId {
  return TEMPLATES.some((item) => item.id === id);
}

function isSkin(id: string): id is CrushWoodSkinId {
  return SKINS.some((item) => item.id === id);
}

export const blockCrushDropAuthoring: GameAuthoringAdapter = {
  gameId: BLOCK_CRUSH_DROP_GAME_ID,
  catalog,
  scaffold(request: GameAuthoringScaffoldRequest) {
    const templateId = requireCatalogOption('template', request.template, TEMPLATES, 'reference');
    const skinId = requireCatalogOption('skin', request.skin, SKINS, 'golden-embossed');
    if (!isPreset(templateId) || !isSkin(skinId)) {
      throw new Error('Crush Wood catalog invariant violated.');
    }
    const config = createCrushWoodReferenceConfig(skinId);
    config.initialRows = crushWoodRowsForPreset(templateId);
    return {
      config,
      skinId,
      templateId,
      catalog: catalog(),
      notes: [
        `Board preset ${templateId} with skin ${skinId}.`,
        'Changing skinId changes Crush Wood initialStateHash; re-run the agent after a skin swap.',
      ],
    };
  },
  applySkin(config, skinId) {
    const resolved = requireCatalogOption('skin', skinId, SKINS, 'golden-embossed');
    if (!isSkin(resolved)) throw new Error('Crush Wood catalog invariant violated.');
    const parsed = crushWoodConfigSchema.parse(config);
    parsed.skinId = resolved;
    return {
      config: parsed,
      skinId: resolved,
      notes: ['skinId is hashed into Crush Wood state. Existing takes must be regenerated.'],
    };
  },
  emitDocument(request: GameAuthoringDocumentRequest) {
    const parsed = crushWoodConfigSchema.parse(request.config);
    if (request.skin) {
      const resolved = requireCatalogOption('skin', request.skin, SKINS, parsed.skinId);
      if (isSkin(resolved)) parsed.skinId = resolved;
    }
    return createCrushWoodDocument(parsed, {
      seed: request.seed,
      takes: request.takes ? [...request.takes] : [],
      ...(request.name !== undefined ? { name: request.name } : {}),
      ...(request.quality !== undefined ? { quality: request.quality } : {}),
    });
  },
};
