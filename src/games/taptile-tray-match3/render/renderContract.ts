import { REFERENCE_PASS_ORDER } from '../../../headless/contracts';
import type { GameRenderContract } from '../../../game-runtime/renderContract';
import { GAME_RENDER_CONTRACT, GAME_RENDER_CONTRACT_VERSION } from '../../../game-runtime/renderContract';
import { TAPTILE_TRAY_MATCH3_GAME_ID } from '../manifest';
import { TAPTILE_PRESENTATION_SCHEMA_ID } from '../presentation/presentationAdapter';

export const TAPTILE_RENDER_CONTRACT_ID = 'bcs.render.taptile-tray-match3';
export const TAPTILE_RENDER_CONTRACT_VERSION = '1.0.0';

const SLOT_KINDS: Record<string, string[]> = {
  'stage.background': ['background'],
  'tile.body': ['tile-face', 'material-pack'],
  'tile.face': ['tile-face', 'bitmap'],
  'tray.slot': ['board-skin', 'ui-theme'],
  'match.primary': ['effect-pack'],
  'pointer.hand': ['animation-asset', 'vector'],
  'hud.preview': ['ui-theme'],
};

const TAPTILE_SLOTS = [
  { slotId: 'stage.background', role: undefined, required: true },
  { slotId: 'tile.body', role: 'tile-material', required: true },
  { slotId: 'tile.face', role: undefined, required: true },
  { slotId: 'tray.slot', role: undefined, required: true },
  { slotId: 'match.primary', role: 'clear-primary', required: true },
  { slotId: 'pointer.hand', role: undefined, required: false },
  { slotId: 'hud.preview', role: undefined, required: false },
] as const;

function slotsForBackend() {
  return TAPTILE_SLOTS.map((slot) => ({
    slotId: slot.slotId,
    acceptedKinds: SLOT_KINDS[slot.slotId] ?? ['bitmap'],
    required: slot.required,
    ...(slot.role ? { role: slot.role } : {}),
  }));
}

export const tapTileRenderContract: GameRenderContract = {
  contract: GAME_RENDER_CONTRACT,
  contractVersion: GAME_RENDER_CONTRACT_VERSION,
  id: TAPTILE_RENDER_CONTRACT_ID,
  version: TAPTILE_RENDER_CONTRACT_VERSION,
  gameId: TAPTILE_TRAY_MATCH3_GAME_ID,
  eventCatalog: [
    { type: 'taptile.tap.accepted', category: 'commit', tags: ['tap'], legacyAliases: ['tap.accepted'] },
    { type: 'taptile.tap.rejected', category: 'interaction', tags: ['tap'], legacyAliases: ['tap.rejected'] },
    { type: 'taptile.tile.fly-to-tray', category: 'reconfigure', tags: ['tile'], legacyAliases: ['tile.fly-to-tray'] },
    { type: 'taptile.tray.reordered', category: 'reconfigure', tags: ['tray'], legacyAliases: ['tray.reordered'] },
    { type: 'taptile.match.resolved', category: 'resolve', tags: ['match'], legacyAliases: ['match.resolved'] },
    { type: 'taptile.tiles.unlocked', category: 'reconfigure', tags: ['unlock'], legacyAliases: ['tiles.unlocked'] },
    { type: 'taptile.tray.warning', category: 'detect', tags: ['tray'], legacyAliases: ['tray.warning'] },
    { type: 'taptile.game.won', category: 'outcome', tags: ['terminal'], legacyAliases: ['game.won'] },
    { type: 'taptile.game.lost', category: 'outcome', tags: ['terminal'], legacyAliases: ['game.lost'] },
  ],
  backends: {
    'reference-2d': {
      supportedPresentationSchemas: [TAPTILE_PRESENTATION_SCHEMA_ID],
      requiredSlots: slotsForBackend(),
      passes: REFERENCE_PASS_ORDER.map((id, order) => ({ id, order, required: true })),
    },
    'fixed-camera-cinematic': {
      supportedPresentationSchemas: [TAPTILE_PRESENTATION_SCHEMA_ID],
      requiredSlots: slotsForBackend(),
      passes: [{ id: 'taptile-stage', order: 0, required: true }],
    },
  },
};
