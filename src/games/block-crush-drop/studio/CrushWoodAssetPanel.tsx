import { CRUSH_WOOD_REFERENCE_ROWS, CRUSH_WOOD_SKINS } from '../levels';
import { crushWoodShape, crushWoodShapeSize } from '../shapes';
import type { CrushWoodPieceId, CrushWoodSkinId } from '../types';

const PIECE_FILL = '#7b73ff';

function CrushPieceMini({ pieceId, compact = false }: { pieceId: CrushWoodPieceId; compact?: boolean }) {
  const shape = crushWoodShape(pieceId, 0);
  const size = crushWoodShapeSize(shape);
  const occupied = new Set(shape.map((point) => `${point.row}:${point.col}`));
  return (
    <div
      className={`piece-mini${compact ? ' piece-mini--compact' : ''}`}
      style={{
        gridTemplateColumns: `repeat(${size.width}, 1fr)`,
        gridTemplateRows: `repeat(${size.height}, 1fr)`,
      }}
      aria-hidden="true"
    >
      {Array.from({ length: size.width * size.height }, (_, index) => {
        const row = Math.floor(index / size.width);
        const col = index % size.width;
        const filled = occupied.has(`${row}:${col}`);
        return (
          <span
            key={`${row}:${col}`}
            className={filled ? 'piece-mini__cell is-filled' : 'piece-mini__cell'}
            style={filled ? { background: PIECE_FILL } : undefined}
          />
        );
      })}
    </div>
  );
}

export function CrushWoodAssetPanel({
  skinId,
  queue,
  queueIndex,
  takeName,
  actionCount,
  seed,
  locked,
  onSkinId,
}: {
  skinId: CrushWoodSkinId;
  queue: CrushWoodPieceId[];
  queueIndex: number;
  takeName: string;
  actionCount: number;
  seed: number;
  locked: boolean;
  onSkinId(skinId: CrushWoodSkinId): void;
}) {
  return (
    <aside className="panel asset-panel">
      <section>
        <div className="section-heading">
          <span>牌面</span>
          <small>Board</small>
        </div>
        <div className="preset-grid">
          <button type="button" className="preset-card is-active" disabled>
            <span className="preset-card__icon">21×34</span>
            <strong>Reference Well</strong>
          </button>
        </div>
        <div className="crush-board-mini" aria-hidden="true">
          {CRUSH_WOOD_REFERENCE_ROWS.flatMap((row, rowIndex) => (
            row.split('').map((cell, colIndex) => (
              <i
                key={`${rowIndex}:${colIndex}`}
                className={cell === '#' ? 'is-filled' : undefined}
              />
            ))
          ))}
        </div>
      </section>

      <section>
        <div className="section-heading">
          <span>外观</span>
          <small>Look</small>
        </div>
        <div className="preset-grid preset-grid--two">
          {CRUSH_WOOD_SKINS.map((skin) => (
            <button
              key={skin.id}
              type="button"
              className={skin.id === skinId ? 'preset-card is-active' : 'preset-card'}
              disabled={locked}
              onClick={() => onSkinId(skin.id)}
              title={skin.description}
            >
              <span className={`preset-card__icon crush-skin-swatch crush-skin-swatch--${skin.id}`} />
              <strong>{skin.label}</strong>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="section-heading">
          <span>落块队列</span>
          <small>Piece queue</small>
        </div>
        <div className="shape-grid">
          {queue.map((pieceId, index) => (
            <button
              key={`${pieceId}-${index}`}
              type="button"
              className={index === queueIndex % queue.length ? 'shape-card is-active' : 'shape-card'}
              disabled
              title={`第 ${index + 1} 块 · ${pieceId}`}
            >
              <CrushPieceMini pieceId={pieceId} compact />
            </button>
          ))}
        </div>
      </section>

      <section className="takes-section">
        <div className="section-heading">
          <span>试玩 Take</span>
          <small>1</small>
        </div>
        <div className="take-list">
          <div className="take-row is-active crush-take-row">
            <button type="button" disabled={locked}>
              <strong>{takeName}</strong>
              <span>{actionCount} 步 · seed {seed}</span>
            </button>
          </div>
        </div>
        <p className="empty-copy">参考重建 Take 已锁定。导入工程可替换外观、节奏与 Seed。</p>
      </section>
    </aside>
  );
}
