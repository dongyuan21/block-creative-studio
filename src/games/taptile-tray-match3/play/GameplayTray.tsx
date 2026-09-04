import type { CSSProperties, ReactNode } from 'react';
import { TAPTILE_TRAY_CAPACITY, tapTileTraySlotRect } from '../trayLayout';

function traySlotStyle(index: number): CSSProperties {
  const slot = tapTileTraySlotRect(index);
  return {
    left: `${slot.left / 1080 * 100}%`,
    top: `${slot.top / 1920 * 100}%`,
    width: `${slot.width / 1080 * 100}%`,
    height: `${slot.height / 1920 * 100}%`,
  };
}

export function GameplayTray({
  trayIds,
  status,
  renderTile,
}: {
  trayIds: string[];
  status: 'playing' | 'won' | 'lost';
  renderTile(tileId: string): ReactNode;
}) {
  return (
    <div
      className={`tpt-gameplay-tray status-${status}`}
      data-tray-count={trayIds.length}
      data-tray-order={trayIds.join('|')}
      aria-label={`槽位 ${trayIds.length}/${TAPTILE_TRAY_CAPACITY}`}
    >
      {Array.from({ length: TAPTILE_TRAY_CAPACITY }, (_, index) => (
        <i
          key={index}
          className={trayIds[index] ? 'is-occupied' : ''}
          style={traySlotStyle(index)}
          aria-hidden="true"
        />
      ))}
      <div className="tpt-tray-tile-layer" aria-hidden="true">
        {trayIds.map((tileId, index) => (
          <span
            key={tileId}
            className="tpt-tray-tile"
            data-tray-tile-id={tileId}
            data-tray-to-index={index}
            style={traySlotStyle(index)}
          >
            <span className="tpt-tray-tile-card">{renderTile(tileId)}</span>
          </span>
        ))}
      </div>
      {trayIds.length === TAPTILE_TRAY_CAPACITY - 1 && status === 'playing' && <b>Only 1 Slot Left!</b>}
      {status === 'lost' && <b>Tray Full</b>}
    </div>
  );
}
