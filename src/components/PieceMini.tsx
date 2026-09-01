import { getShape, getShapeBounds } from '../domain/shapes';
import type { PieceInstance, TileColor } from '../domain/types';
import { TILE_COLOR_HEX } from '../renderer/materialPresets';

interface PieceMiniProps {
  piece?: PieceInstance;
  shapeId?: string;
  color?: TileColor;
  compact?: boolean;
}

export function PieceMini({ piece, shapeId, color = 'blue', compact = false }: PieceMiniProps) {
  const resolvedShapeId = piece?.shapeId ?? shapeId;
  if (!resolvedShapeId) return <div className="piece-mini piece-mini--empty" />;
  const shape = getShape(resolvedShapeId);
  const bounds = getShapeBounds(shape);
  const colorValue = piece?.color ?? color;
  const occupied = new Set(shape.cells.map(([row, col]) => `${row}:${col}`));
  return (
    <div
      className={`piece-mini${compact ? ' piece-mini--compact' : ''}`}
      style={{
        gridTemplateColumns: `repeat(${bounds.cols}, 1fr)`,
        gridTemplateRows: `repeat(${bounds.rows}, 1fr)`,
      }}
      aria-label={shape.label}
    >
      {Array.from({ length: bounds.rows * bounds.cols }, (_, index) => {
        const row = Math.floor(index / bounds.cols);
        const col = index % bounds.cols;
        return (
          <span
            key={`${row}:${col}`}
            className={occupied.has(`${row}:${col}`) ? 'piece-mini__cell is-filled' : 'piece-mini__cell'}
            style={occupied.has(`${row}:${col}`) ? { background: `#${TILE_COLOR_HEX[colorValue].toString(16).padStart(6, '0')}` } : undefined}
          />
        );
      })}
    </div>
  );
}
