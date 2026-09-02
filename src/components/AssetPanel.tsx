import { getShape, getShapeBounds, SHAPES, TILE_COLORS } from '../domain/shapes';
import { pieceCellColor } from '../domain/gameEngine';
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
  onPieceCellColor(slot: number, cellIndex: number, color: TileColor): void;
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
  onPieceCellColor,
  onSelectTake,
  onDeleteTake,
}: AssetPanelProps) {
  const selectedPiece = pieces.find((piece) => piece.slotIndex === selectedPieceSlot) ?? null;
  const selectedShape = selectedPiece ? getShape(selectedPiece.shapeId) : null;
  const selectedBounds = selectedShape ? getShapeBounds(selectedShape) : null;
  const selectedCells = new Map(
    selectedShape?.cells.map(([row, col], cellIndex) => [`${row}:${col}`, cellIndex] as const) ?? [],
  );

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
        {selectedPiece && selectedShape && selectedBounds && (
          <div className="piece-cell-editor-block">
            <div className="piece-cell-editor-copy">
              <strong>逐格牌面颜色</strong>
              <span>先选上方色板，再点击候选块中的单元。</span>
            </div>
            <div
              className="piece-cell-editor"
              style={{
                gridTemplateColumns: `repeat(${selectedBounds.cols}, 34px)`,
                gridTemplateRows: `repeat(${selectedBounds.rows}, 34px)`,
              }}
              aria-label={`槽位 ${selectedPiece.slotIndex + 1} 逐格颜色`}
            >
              {Array.from({ length: selectedBounds.rows * selectedBounds.cols }, (_, index) => {
                const row = Math.floor(index / selectedBounds.cols);
                const col = index % selectedBounds.cols;
                const cellIndex = selectedCells.get(`${row}:${col}`);
                if (cellIndex === undefined) return <span key={`${row}:${col}`} className="piece-cell-editor__empty" />;
                const color = pieceCellColor(selectedPiece, cellIndex);
                return (
                  <button
                    key={`${row}:${col}`}
                    type="button"
                    className="piece-cell-editor__cell"
                    title={`单元 ${cellIndex + 1}: ${color}`}
                    disabled={!setupEditable}
                    style={{ background: `#${TILE_COLOR_HEX[color].toString(16).padStart(6, '0')}` }}
                    onClick={() => onPieceCellColor(selectedPiece.slotIndex, cellIndex, selectedColor)}
                  />
                );
              })}
            </div>
          </div>
        )}
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
