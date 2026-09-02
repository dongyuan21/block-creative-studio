import type { ReactNode } from 'react';
import type { TapTileGameplayStatus } from '../gameplay';

export function GameplayTray({
  trayIds,
  status,
  renderTile,
}: {
  trayIds: readonly string[];
  status: TapTileGameplayStatus;
  renderTile(tileId: string): ReactNode;
}) {
  return (
    <div className={`tpt-tray tpt-gameplay-tray status-${status}`} data-occupied={trayIds.length}>
      {Array.from({ length: 7 }, (_, index) => {
        const tileId = trayIds[index];
        return (
          <i key={index} className={tileId ? 'is-occupied' : ''} data-tray-index={index} data-tile-id={tileId}>
            {tileId ? renderTile(tileId) : null}
          </i>
        );
      })}
    </div>
  );
}
