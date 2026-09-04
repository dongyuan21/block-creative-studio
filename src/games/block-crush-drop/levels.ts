import type { CrushWoodAction, CrushWoodConfig, CrushWoodSkinId } from './types';

/**
 * Pixel-calibrated from the stable board in CRUSHZR29980. `#` is a pre-built
 * wooden cube and `.` is an empty well. The grid is 21 × 34.
 */
export const CRUSH_WOOD_REFERENCE_ROWS = [
  '.....................',
  '.....................',
  '.....................',
  '.....................',
  '#...................#',
  '####..............###',
  '######..........#####',
  '#######...###########',
  '#########.###########',
  '##########.##########',
  '###########...#######',
  '##############.######',
  '###############.#####',
  '#############...#####',
  '############.########',
  '#########...#########',
  '########.############',
  '#####...#############',
  '####.################',
  '####...##############',
  '#######.#############',
  '########...##########',
  '###########.#########',
  '############...######',
  '###############.#####',
  '################.####',
  '##############...####',
  '#############.#######',
  '##########...########',
  '#########.###########',
  '######...############',
  '#####.###############',
  '#####...#############',
  '########.############',
] as const;

export const CRUSH_WOOD_REFERENCE_ACTIONS = [
  { pieceId: 'J4', column: 7, rotation: 3 },
  { pieceId: 'L3', column: 9, rotation: 2 },
  { pieceId: 'I3', column: 11, rotation: 0 },
  { pieceId: 'L3', column: 13, rotation: 2 },
  { pieceId: 'I3', column: 15, rotation: 1 },
  { pieceId: 'I3', column: 6, rotation: 0 },
  { pieceId: 'L3', column: 11, rotation: 0 },
  { pieceId: 'L3', column: 13, rotation: 0 },
  { pieceId: 'I3', column: 12, rotation: 1 },
] as const satisfies readonly CrushWoodAction[];

export const CRUSH_WOOD_SKINS: ReadonlyArray<{
  id: CrushWoodSkinId;
  label: string;
  description: string;
}> = [
  { id: 'golden-embossed', label: 'Golden Relief', description: '附件主参考：金色浮雕木块与全高棋盘。' },
  { id: 'classic-maple', label: 'Classic Maple', description: '浅枫木、关卡 HUD 与暖色舞台。' },
  { id: 'deep-mahogany', label: 'Deep Mahogany', description: '深红硬木与高对比阴影。' },
  { id: 'checker-maze', label: 'Checker Maze', description: '明暗交错木块迷宫。' },
];

export function createCrushWoodReferenceConfig(
  skinId: CrushWoodSkinId = 'golden-embossed',
): CrushWoodConfig {
  return {
    levelId: 'reference-serpentine-21x34',
    columns: 21,
    rows: 34,
    initialRows: [...CRUSH_WOOD_REFERENCE_ROWS],
    queue: CRUSH_WOOD_REFERENCE_ACTIONS.map((action) => action.pieceId),
    startingScore: 0,
    targetScore: 900,
    scorePerLine: 100,
    startingTimeMs: 30_000,
    moveTimeMs: 2_400,
    skinId,
  };
}
