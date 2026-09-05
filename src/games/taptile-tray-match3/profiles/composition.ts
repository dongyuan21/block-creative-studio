import type { CompositionProfile } from '../../../rendering/composition';
import { TAPTILE_AUTHORING_STAGE, TAPTILE_EXPORT_STAGE } from '../../../taptile/pixelGeometry';
import { TAPTILE_REFERENCE_BOARD_TOP_PX, TAPTILE_REFERENCE_TRAY_BOUNDS } from '../../../taptile/trayLayout';
import { TAPTILE_TRAY_MATCH3_GAME_ID, TAPTILE_TRAY_MATCH3_MODULE_VERSION } from '../manifest';

export const TAPTILE_COMPOSITION_PROFILE_ID = 'taptile-tray-match3.composition.reference.v1';

const scale = TAPTILE_AUTHORING_STAGE.width / TAPTILE_EXPORT_STAGE.width;

function designRect(
  left: number,
  top: number,
  width: number,
  height: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.round(left * scale),
    y: Math.round(top * scale),
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/** Design-space playfield is the stacked board below the frozen top tray. */
export const tapTilePlayfield = designRect(
  16,
  TAPTILE_REFERENCE_BOARD_TOP_PX,
  TAPTILE_EXPORT_STAGE.width - 32,
  TAPTILE_EXPORT_STAGE.height - TAPTILE_REFERENCE_BOARD_TOP_PX - 24,
);

export const tapTileTrayRoi = designRect(
  TAPTILE_REFERENCE_TRAY_BOUNDS.left,
  TAPTILE_REFERENCE_TRAY_BOUNDS.top,
  TAPTILE_REFERENCE_TRAY_BOUNDS.width,
  TAPTILE_REFERENCE_TRAY_BOUNDS.height,
);

export const tapTileCompositionProfile = {
  id: TAPTILE_COMPOSITION_PROFILE_ID,
  version: TAPTILE_TRAY_MATCH3_MODULE_VERSION,
  gameId: TAPTILE_TRAY_MATCH3_GAME_ID,
  designResolution: { width: TAPTILE_AUTHORING_STAGE.width, height: TAPTILE_AUTHORING_STAGE.height },
  videoResolution: { width: TAPTILE_EXPORT_STAGE.width, height: TAPTILE_EXPORT_STAGE.height },
  playfield: tapTilePlayfield,
} as const satisfies CompositionProfile;
