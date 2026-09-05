import type { CrushWoodAction, CrushWoodConfig, CrushWoodPieceId, CrushWoodSkinId } from './types';

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

export const CRUSH_WOOD_COLUMNS = 21;
export const CRUSH_WOOD_ROWS = 34;

export type CrushWoodBoardPresetId = 'reference' | 'empty' | 'corridor';

export const CRUSH_WOOD_BOARD_PRESETS: ReadonlyArray<{
  id: CrushWoodBoardPresetId;
  label: string;
}> = [
  { id: 'reference', label: '参考蛇形' },
  { id: 'empty', label: '空井' },
  { id: 'corridor', label: '双侧壁' },
];

export const CRUSH_WOOD_DEFAULT_QUEUE: CrushWoodPieceId[] = ['I4', 'O4', 'T4', 'L4', 'J4', 'S4', 'Z4', 'I3', 'L3'];

export function emptyCrushWoodRows(): string[] {
  return Array.from({ length: CRUSH_WOOD_ROWS }, () => '.'.repeat(CRUSH_WOOD_COLUMNS));
}

export function corridorCrushWoodRows(): string[] {
  return Array.from({ length: CRUSH_WOOD_ROWS }, (_, row) => (
    row < 4 ? '.'.repeat(CRUSH_WOOD_COLUMNS) : '##.................##'
  ));
}

export function crushWoodRowsForPreset(id: CrushWoodBoardPresetId): string[] {
  if (id === 'empty') return emptyCrushWoodRows();
  if (id === 'corridor') return corridorCrushWoodRows();
  return [...CRUSH_WOOD_REFERENCE_ROWS];
}

export function matchCrushWoodBoardPreset(rows: readonly string[]): CrushWoodBoardPresetId | null {
  const joined = rows.join('\n');
  if (joined === CRUSH_WOOD_REFERENCE_ROWS.join('\n')) return 'reference';
  if (joined === emptyCrushWoodRows().join('\n')) return 'empty';
  if (joined === corridorCrushWoodRows().join('\n')) return 'corridor';
  return null;
}

export function setCrushWoodCell(
  rows: readonly string[],
  row: number,
  col: number,
  fill: '#' | '.',
): string[] {
  const current = rows[row];
  if (!current || col < 0 || col >= current.length || current[col] === fill) {
    return rows as string[];
  }
  const next = [...rows];
  const cells = [...current];
  cells[col] = fill;
  next[row] = cells.join('');
  return next;
}

export function toggleCrushWoodCell(rows: readonly string[], row: number, col: number): string[] {
  const current = rows[row];
  if (!current || col < 0 || col >= current.length) return [...rows];
  return setCrushWoodCell(rows, row, col, current[col] === '#' ? '.' : '#');
}

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
    columns: CRUSH_WOOD_COLUMNS,
    rows: CRUSH_WOOD_ROWS,
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
