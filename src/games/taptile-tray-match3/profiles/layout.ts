import { TAPTILE_TRAY_MATCH3_GAME_ID } from '../manifest';
import { TAPTILE_COMPOSITION_PROFILE_ID, tapTileCompositionProfile } from './composition';

export const TAPTILE_LAYOUT_PROFILE_ID = 'taptile-tray-match3.layout.v1';

const playfield = tapTileCompositionProfile.playfield;
const tray = tapTileCompositionProfile.tray;

export const tapTileLayoutProfile = {
  id: TAPTILE_LAYOUT_PROFILE_ID,
  version: '1.0.0',
  gameId: TAPTILE_TRAY_MATCH3_GAME_ID,
  compositionProfileId: TAPTILE_COMPOSITION_PROFILE_ID,
  canvas: tapTileCompositionProfile.designResolution,
  tray: { outer: tray, capacity: 7 },
  board: { outer: playfield },
} as const;
