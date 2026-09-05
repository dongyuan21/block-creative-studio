import {
  CRUSH_WOOD_BOARD_PRESETS,
  CRUSH_WOOD_SKINS,
  type CrushWoodBoardPresetId,
} from '../levels';
import { crushWoodShape, crushWoodShapeSize, CRUSH_WOOD_PIECE_IDS } from '../shapes';
import type { CrushWoodPieceId, CrushWoodSkinId } from '../types';
import type { GameReplayEnvelope } from '../../../game-runtime/replayEnvelope';

const PIECE_FILL = '#7b73ff';

export function CrushPieceMini({ pieceId, compact = false }: { pieceId: CrushWoodPieceId; compact?: boolean }) {
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
  boardRows,
  boardPreset,
  queue,
  queueIndex,
  selectedQueueSlot,
  takes,
  selectedTakeId,
  seed,
  setupEditable,
  takesLocked,
  onBoardPreset,
  onSkinId,
  onSelectQueueSlot,
  onQueuePiece,
  onAddQueuePiece,
  onRemoveQueuePiece,
  onSelectTake,
  onDeleteTake,
}: {
  skinId: CrushWoodSkinId;
  boardRows: readonly string[];
  boardPreset: CrushWoodBoardPresetId | null;
  queue: CrushWoodPieceId[];
  queueIndex: number;
  selectedQueueSlot: number;
  takes: readonly GameReplayEnvelope[];
  selectedTakeId: string | null;
  seed: number;
  setupEditable: boolean;
  takesLocked: boolean;
  onBoardPreset(id: CrushWoodBoardPresetId): void;
  onSkinId(skinId: CrushWoodSkinId): void;
  onSelectQueueSlot(slot: number): void;
  onQueuePiece(slot: number, pieceId: CrushWoodPieceId): void;
  onAddQueuePiece(pieceId: CrushWoodPieceId): void;
  onRemoveQueuePiece(slot: number): void;
  onSelectTake(takeId: string): void;
  onDeleteTake(takeId: string): void;
}) {
  return (
    <aside className="panel asset-panel">
      <section>
        <div className="section-heading">
          <span>牌面</span>
          <small>Board</small>
        </div>
        <div className="preset-grid">
          {CRUSH_WOOD_BOARD_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={boardPreset === preset.id ? 'preset-card is-active' : 'preset-card'}
              disabled={!setupEditable}
              onClick={() => onBoardPreset(preset.id)}
            >
              <span className="preset-card__icon">21×34</span>
              <strong>{preset.label}</strong>
            </button>
          ))}
        </div>
        <div className="crush-board-mini" aria-hidden="true">
          {boardRows.flatMap((row, rowIndex) => (
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
              disabled={takesLocked}
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
              className={index === (setupEditable ? selectedQueueSlot : queueIndex % queue.length) ? 'shape-card is-active' : 'shape-card'}
              disabled={!setupEditable}
              title={`第 ${index + 1} 块 · ${pieceId}`}
              onClick={() => onSelectQueueSlot(index)}
            >
              <CrushPieceMini pieceId={pieceId} compact />
            </button>
          ))}
        </div>
        {setupEditable && (
          <>
            <div className="crush-queue-actions">
              <button
                type="button"
                className="button-secondary"
                disabled={queue.length >= 24}
                onClick={() => onAddQueuePiece(CRUSH_WOOD_PIECE_IDS[0]!)}
              >＋ 添加</button>
              <button
                type="button"
                className="button-secondary"
                disabled={queue.length <= 1}
                onClick={() => onRemoveQueuePiece(selectedQueueSlot)}
              >删除槽位</button>
            </div>
            <div className="shape-grid">
              {CRUSH_WOOD_PIECE_IDS.map((pieceId) => (
                <button
                  key={pieceId}
                  type="button"
                  className="shape-card"
                  title={pieceId}
                  onClick={() => onQueuePiece(selectedQueueSlot, pieceId)}
                >
                  <CrushPieceMini pieceId={pieceId} compact />
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="takes-section">
        <div className="section-heading">
          <span>试玩 Take</span>
          <small>{takes.length}</small>
        </div>
        <div className="take-list">
          {takes.length === 0 && <p className="empty-copy">先进行真人试玩或机器试玩。</p>}
          {takes.map((take) => (
            <div key={take.takeId} className={selectedTakeId === take.takeId ? 'take-row is-active' : 'take-row'}>
              <button type="button" disabled={takesLocked} onClick={() => onSelectTake(take.takeId)}>
                <strong>{take.takeId}</strong>
                <span>{take.actions.length} 步 · {take.actions[0]?.actor === 'human' ? '人类' : 'Agent'} · seed {seed}</span>
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`删除 ${take.takeId}`}
                disabled={takesLocked}
                onClick={() => onDeleteTake(take.takeId)}
              >×</button>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
