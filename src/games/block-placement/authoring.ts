import {
  requireCatalogOption,
  type GameAuthoringAdapter,
  type GameAuthoringCatalog,
  type GameAuthoringDocumentRequest,
  type GameAuthoringScaffoldRequest,
} from '../../game-runtime/authoringAdapter';
import { BLOCK_PLACEMENT_GAME_ID } from './manifest';
import { createBlockPlacementDocument, BLOCK_PLACEMENT_LOOK_COPPER } from './project';
import { BOARD_PRESETS } from './runtime/boardPresets';
import { parseBlockPlacementConfig } from './schemas';

const TEMPLATES = BOARD_PRESETS.map((preset) => ({ id: preset.id, label: preset.label }));
const SKINS = [
  {
    id: BLOCK_PLACEMENT_LOOK_COPPER,
    label: 'Copper look pack',
    notes: 'Builtin 9:16 look. Gameplay hash is unchanged; the look is attached on the studio document.',
  },
];

function catalog(): GameAuthoringCatalog {
  return { gameId: BLOCK_PLACEMENT_GAME_ID, templates: TEMPLATES, skins: SKINS };
}

function resolveLookId(skinId: string): string {
  return skinId === 'copper' ? BLOCK_PLACEMENT_LOOK_COPPER : skinId;
}

export const blockPlacementAuthoring: GameAuthoringAdapter = {
  gameId: BLOCK_PLACEMENT_GAME_ID,
  catalog,
  scaffold(request: GameAuthoringScaffoldRequest) {
    const templateId = requireCatalogOption('template', request.template, TEMPLATES, 'empty');
    const skinId = requireCatalogOption('skin', request.skin ? resolveLookId(request.skin) : undefined, SKINS, BLOCK_PLACEMENT_LOOK_COPPER);
    const preset = BOARD_PRESETS.find((item) => item.id === templateId)!;
    return {
      config: { board: preset.create() },
      skinId,
      templateId,
      catalog: catalog(),
      notes: [
        `Board preset ${templateId}.`,
        'Look pack is applied when emitting the studio document; gameplay config stays board/pieces only.',
      ],
    };
  },
  applySkin(config, skinId) {
    const resolved = requireCatalogOption('skin', resolveLookId(skinId), SKINS, BLOCK_PLACEMENT_LOOK_COPPER);
    return {
      config: parseBlockPlacementConfig(config),
      skinId: resolved,
      notes: ['Placement look is attached at document emit via production.lookPackRef.'],
    };
  },
  emitDocument(request: GameAuthoringDocumentRequest) {
    const parsed = parseBlockPlacementConfig(request.config);
    const lookId = request.skin
      ? requireCatalogOption('skin', resolveLookId(request.skin), SKINS, BLOCK_PLACEMENT_LOOK_COPPER)
      : BLOCK_PLACEMENT_LOOK_COPPER;
    return createBlockPlacementDocument(parsed, {
      seed: request.seed,
      ...(request.takes !== undefined ? { takes: request.takes } : {}),
      lookId,
      ...(request.name !== undefined ? { name: request.name } : {}),
      ...(request.quality !== undefined ? { quality: request.quality } : {}),
    });
  },
};
