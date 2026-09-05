import type { CrushWoodPieceId, CrushWoodPoint } from './types';

const BASE_SHAPES: Record<CrushWoodPieceId, readonly CrushWoodPoint[]> = {
  I4: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }],
  O4: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
  T4: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 1 }],
  L4: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 2, col: 1 }],
  J4: [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 0 }, { row: 2, col: 1 }],
  S4: [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
  Z4: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
  I3: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
  L3: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
  P5: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 0 }],
  U5: [{ row: 0, col: 0 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
  V5: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }],
  W5: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }, { row: 2, col: 2 }],
};

function normalize(points: readonly CrushWoodPoint[]): CrushWoodPoint[] {
  const minimumRow = Math.min(...points.map((point) => point.row));
  const minimumCol = Math.min(...points.map((point) => point.col));
  return points
    .map((point) => ({ row: point.row - minimumRow, col: point.col - minimumCol }))
    .sort((left, right) => left.row - right.row || left.col - right.col);
}

function rotateClockwise(points: readonly CrushWoodPoint[]): CrushWoodPoint[] {
  return normalize(points.map((point) => ({ row: point.col, col: -point.row })));
}

export function crushWoodShape(pieceId: CrushWoodPieceId, rotation: 0 | 1 | 2 | 3): CrushWoodPoint[] {
  let points = normalize(BASE_SHAPES[pieceId]);
  for (let index = 0; index < rotation; index += 1) points = rotateClockwise(points);
  return points;
}

export function crushWoodShapeKey(shape: readonly CrushWoodPoint[]): string {
  return normalize(shape).map((point) => `${point.row}:${point.col}`).join('|');
}

export function crushWoodShapeSize(shape: readonly CrushWoodPoint[]): { width: number; height: number } {
  return {
    width: Math.max(...shape.map((point) => point.col)) + 1,
    height: Math.max(...shape.map((point) => point.row)) + 1,
  };
}

export function uniqueCrushWoodRotations(pieceId: CrushWoodPieceId): Array<0 | 1 | 2 | 3> {
  const seen = new Set<string>();
  const rotations: Array<0 | 1 | 2 | 3> = [];
  for (const rotation of [0, 1, 2, 3] as const) {
    const key = crushWoodShapeKey(crushWoodShape(pieceId, rotation));
    if (!seen.has(key)) {
      seen.add(key);
      rotations.push(rotation);
    }
  }
  return rotations;
}

export const CRUSH_WOOD_PIECE_IDS = Object.freeze(Object.keys(BASE_SHAPES) as CrushWoodPieceId[]);

export function isCrushWoodPieceId(value: unknown): value is CrushWoodPieceId {
  return typeof value === 'string' && (CRUSH_WOOD_PIECE_IDS as readonly string[]).includes(value);
}
