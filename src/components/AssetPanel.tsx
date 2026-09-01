import { SHAPES, TILE_COLORS } from '../domain/shapes';
import type { PieceInstance, Take, TileColor } from '../domain/types';
import { TILE_COLOR_HEX } from '../renderer/materialPresets';
import { PieceMini } from './PieceMini';

interface BoardPresetOption {
  id: string;
  label: string;
}

interface AssetPanelProps {
  boardPresets: readonly BoardPresetOption[];
  pieces: PieceInstance[];
  takes: Take[];
  setupEditable: boolean;
  takesLocked: boolean;
  selectedTakeId: string | null;
  selectedColor: TileColor;
  selectedPieceSlot: number;
  onBoardPreset(id: string): void;
  onColor(color: TileColor): void;
  onPieceSlot(slot: number): void;
  onPieceShape(shapeId: string): void;
  onPieceColor(slot: number, color: TileColor): void;
  onSelectTake(id: string): void;
  onDeleteTake(id: string): void;
}

export function AssetPanel({
  boardPresets,
  pieces,
  takes,
  setupEditable,
  takesLocked,
  selectedTakeId,
  selectedColor,
  selectedPieceSlot,
  onBoardPreset,
  onColor,
  onPieceSlot,
  onPieceShape,
  onPieceColor,
  onSelectTake,
  onDeleteTake,
}: AssetPanelProps) {
  return (
    <aside className="panel asset-panel">
      <section>
        <div className="section-heading">
          <span>牌面</span>
          <small>Board</small>
        </div>
        <div className="preset-grid preset-grid--two">
          {boardPresets.map((preset) => (
            <button
              key={preset.id}
              className="preset-card"
              disabled={!setupEditable}
              onClick={() => onBoardPreset(preset.id)}
            >
              <span className="preset-card__icon">8×8</span>
              <strong>{preset.label}</strong>
            </button>
          ))}
        </div>
        <div className="color-row" aria-label="绘制颜色">
          {TILE_COLORS.map((color) => (
            <button
              key={color}
              className={selectedColor === color ? 'color-chip is-active' : 'color-chip'}
              style={{ background: `#${TILE_COLOR_HEX[color].toString(16).padStart(6, '0')}` }}
              aria-label={color}
              disabled={!setupEditable}
              onClick={() => onColor(color)}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="section-heading">
          <span>候选方块</span>
          <small>Piece queue</small>
        </div>
        <div className="piece-slots">
          {pieces.map((piece) => (
            <div
              key={piece.id}
              className={selectedPieceSlot === piece.slotIndex ? 'piece-slot is-active' : 'piece-slot'}
            >
              <button
                type="button"
                className="piece-slot__select"
                aria-pressed={selectedPieceSlot === piece.slotIndex}
                disabled={!setupEditable}
                onClick={() => onPieceSlot(piece.slotIndex)}
              >
                <PieceMini piece={piece} />
                <span>槽位 {piece.slotIndex + 1}</span>
              </button>
              <select
                aria-label={`槽位 ${piece.slotIndex + 1} 颜色`}
                value={piece.color}
                disabled={!setupEditable}
                onChange={(event) => onPieceColor(piece.slotIndex, event.target.value as TileColor)}
              >
                {TILE_COLORS.map((color) => <option key={color} value={color}>{color}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="shape-grid">
          {SHAPES.map((shape) => (
            <button
              key={shape.id}
              className="shape-card"
              disabled={!setupEditable}
              onClick={() => onPieceShape(shape.id)}
              title={shape.label}
            >
              <PieceMini shapeId={shape.id} color={selectedColor} compact />
            </button>
          ))}
        </div>
      </section>

      <section className="takes-section">
        <div className="section-heading">
          <span>试玩 Take</span>
          <small>{takes.length}</small>
        </div>
        <div className="take-list">
          {takes.length === 0 && <p className="empty-copy">先进行真人试玩或机器试玩。</p>}
          {takes.map((take) => (
            <div key={take.id} className={selectedTakeId === take.id ? 'take-row is-active' : 'take-row'}>
              <button disabled={takesLocked} onClick={() => onSelectTake(take.id)}>
                <strong>{take.name}</strong>
                <span>{take.actions.length} 步 · {new Date(take.createdAt).toLocaleTimeString()}</span>
              </button>
              <button
                className="icon-button"
                aria-label={`删除 ${take.name}`}
                disabled={takesLocked}
                onClick={() => onDeleteTake(take.id)}
              >×</button>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
