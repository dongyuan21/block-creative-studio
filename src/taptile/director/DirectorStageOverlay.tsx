import type { CompiledTapTileLevel, TapTileProjectV2 } from '../project';
import { tapTileTraySlotCenter, tapTileTraySlotRect } from '../trayLayout';
import { resolveTileVisual } from '../visual';
import { TileVisual } from '../visual/TileVisual';
import type { TapTilePresentationFrame } from './types';

export function DirectorStageOverlay({
  frame,
  project,
  level,
}: {
  frame: TapTilePresentationFrame;
  project: TapTileProjectV2;
  level: CompiledTapTileLevel;
}) {
  const width = project.stage.exportWidth;
  const height = project.stage.exportHeight;
  return (
    <div
      className="tpt-director-stage-overlay"
      data-director-frame={frame.frameNumber}
      data-moving-count={frame.movingTiles.length}
      data-effect-count={frame.effects.length}
      style={{ transform: `translate(${frame.camera.xPx / 2.5}px, ${frame.camera.yPx / 2.5}px) scale(${frame.camera.zoom})` }}
      aria-hidden="true"
    >
      {frame.movingTiles.map((moving) => {
        const tile = level.tiles[moving.tileId];
        if (!tile) return null;
        const visual = resolveTileVisual(project, tile.archetypeId, project.visuals.selectedThemeId, 'flight');
        return (
          <span
            key={`${moving.actionIndex}:${moving.tileId}`}
            className="tpt-director-moving-tile"
            style={{
              left: `${(moving.xPx / width) * 100}%`,
              top: `${(moving.yPx / height) * 100}%`,
              width: `${(tile.geometry.widthPx / width) * 100}%`,
              transform: `translate(-50%, -50%) rotate(${moving.rotationDeg}deg) scale(${moving.scale})`,
            }}
          ><TileVisual visual={visual} /></span>
        );
      })}
      {frame.effects.filter((effect) => effect.kind === 'match').flatMap((effect) => effect.tileIds.map((tileId, index) => {
        const tile = level.tiles[tileId];
        if (!tile) return null;
        const visual = resolveTileVisual(project, tile.archetypeId, project.visuals.selectedThemeId, 'match-ghost');
        const slotIndex = effect.slotIndexes?.[index] ?? index;
        const slot = tapTileTraySlotRect(slotIndex);
        const center = tapTileTraySlotCenter(slotIndex);
        return (
          <span
            key={`${effect.id}:${tileId}`}
            className="tpt-director-match-ghost"
            style={{
              left: `${(center.xPx / width) * 100}%`,
              top: `${(center.yPx / height) * 100}%`,
              width: `${(slot.width / width) * 100}%`,
              opacity: Math.max(0, 1 - effect.progress),
              transform: `translate(-50%, -50%) scale(${1 + effect.progress * 0.5})`,
            }}
          ><TileVisual visual={visual} /></span>
        );
      }))}
      {frame.effects.flatMap((effect) => effect.particles.map((particle) => (
        <i
          key={particle.id}
          className="tpt-director-particle"
          style={{
            left: `${(particle.xPx / width) * 100}%`,
            top: `${(particle.yPx / height) * 100}%`,
            opacity: particle.opacity,
            transform: `translate(-50%, -50%) rotate(${particle.rotationDeg}deg) scale(${particle.scale})`,
          }}
        />
      )))}
      {frame.pointer.visible && (
        <span
          className={`tpt-director-pointer${frame.pointer.pressed ? ' is-pressed' : ''}`}
          style={{ left: `${(frame.pointer.xPx / width) * 100}%`, top: `${(frame.pointer.yPx / height) * 100}%` }}
        ><i /></span>
      )}
    </div>
  );
}
