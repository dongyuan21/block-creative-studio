import type { TapTileGameplayStatus } from '../gameplay';

export function GameplayTray({
  trayIds,
  status,
  glyphForTile,
}: {
  trayIds: readonly string[];
  status: TapTileGameplayStatus;
  glyphForTile(tileId: string): string;
}) {
  return (
    <div className={`tpt-tray tpt-gameplay-tray status-${status}`} data-occupied={trayIds.length}>
      {Array.from({ length: 7 }, (_, index) => {
        const tileId = trayIds[index];
        return (
          <i key={index} className={tileId ? 'is-occupied' : ''} data-tray-index={index} data-tile-id={tileId}>
            {tileId ? <span>{glyphForTile(tileId)}</span> : null}
          </i>
        );
      })}
    </div>
  );
}
