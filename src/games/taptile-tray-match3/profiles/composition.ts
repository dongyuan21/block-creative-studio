import type { CompositionProfile } from '../../../rendering/composition';
import { TAPTILE_TRAY_MATCH3_GAME_ID } from '../manifest';
import { TAPTILE_EXPORT_STAGE } from '../pixelGeometry';
import { TAPTILE_REFERENCE_BOARD_TOP_PX, TAPTILE_REFERENCE_TRAY_BOUNDS } from '../trayLayout';

export const TAPTILE_COMPOSITION_PROFILE_ID = 'taptile-tray-match3.composition.v1';
export const TAPTILE_COMPOSITION_PROFILE_VERSION = '1.0.0';

const tray = TAPTILE_REFERENCE_TRAY_BOUNDS;

export const tapTileCompositionProfile = {
  id: TAPTILE_COMPOSITION_PROFILE_ID,
  version: TAPTILE_COMPOSITION_PROFILE_VERSION,
  gameId: TAPTILE_TRAY_MATCH3_GAME_ID,
  designResolution: { width: TAPTILE_EXPORT_STAGE.width, height: TAPTILE_EXPORT_STAGE.height },
  videoResolution: { width: TAPTILE_EXPORT_STAGE.width, height: TAPTILE_EXPORT_STAGE.height },
  playfield: {
    x: 50,
    y: TAPTILE_REFERENCE_BOARD_TOP_PX,
    width: 980,
    height: TAPTILE_EXPORT_STAGE.height - TAPTILE_REFERENCE_BOARD_TOP_PX - 90,
  },
  tray: { x: tray.left, y: tray.top, width: tray.width, height: tray.height },
} as const satisfies CompositionProfile & { tray: { x: number; y: number; width: number; height: number } };
