import { BLOCK_PLACEMENT_GAME_ID } from '../manifest';
import { BLOCK_PLACEMENT_COMPOSITION_PROFILE_ID, blockPlacementCompositionProfile } from './composition';

export const BLOCK_PLACEMENT_LAYOUT_PROFILE_ID = 'block-placement.layout.v1';

const playfield = blockPlacementCompositionProfile.playfield;

export const blockPlacementLayoutProfile = {
  id: BLOCK_PLACEMENT_LAYOUT_PROFILE_ID,
  version: '1.0.0',
  gameId: BLOCK_PLACEMENT_GAME_ID,
  compositionProfileId: BLOCK_PLACEMENT_COMPOSITION_PROFILE_ID,
  canvas: blockPlacementCompositionProfile.designResolution,
  hud: {
    best: { x: 72, y: 48, width: 320, height: 86 },
    scoreCenter: { x: 532, y: 213 },
    controls: { x: 778, y: 48, width: 210, height: 88 },
  },
  board: {
    outer: { x: playfield.x, y: playfield.y, size: playfield.width, radius: 18 },
    grid: { x: 91, y: 321, cell: 108, gap: 4, pitch: 112 },
  },
  rack: {
    centersX: [238, 532, 826],
    centerY: 1470,
    cell: 50,
    pickupLift: 145,
  },
} as const;
