import type { TapTileDirectorTiming } from '../project';
import type { CompiledTapTileTake } from './types';

export function DirectorTimeline({
  compiled,
  currentFrame,
  playing,
  locked,
  selectedActionId,
  actionOverrides,
  onSeek,
  onToggle,
  onSelectAction,
  onTimingOverride,
  onResetOverride,
}: {
  compiled: CompiledTapTileTake;
  currentFrame: number;
  playing: boolean;
  locked: boolean;
  selectedActionId: string | null;
  actionOverrides: Record<string, Partial<TapTileDirectorTiming>>;
  onSeek(frame: number): void;
  onToggle(): void;
  onSelectAction(actionId: string): void;
  onTimingOverride(actionId: string, key: keyof TapTileDirectorTiming, value: number): void;
  onResetOverride(actionId: string): void;
}) {
  const totalFrames = Math.max(1, compiled.totalFrames);
  const selectedAction = compiled.actions.find((action) => action.actionId === selectedActionId) ?? null;
  const overlapCount = compiled.actions.filter((action, index) => {
    const next = compiled.actions[index + 1];
    return action.transition.matchedTileIds.length > 0 && next && next.timing.actionStartFrame < action.timing.matchVfxEndFrame;
  }).length;
  const firstOverlapFrame = compiled.actions.find((action, index) => {
    const next = compiled.actions[index + 1];
    return action.transition.matchedTileIds.length > 0 && next && next.timing.actionStartFrame < action.timing.matchVfxEndFrame;
  })?.timing.inputReadyFrame;

  return (
    <section
      className="timeline"
      aria-label="Replay 事件时间线"
      data-total-frames={compiled.totalFrames}
      data-profile-id={compiled.profileId}
      data-overlap-count={overlapCount}
      data-first-overlap-frame={firstOverlapFrame ?? ''}
      data-level-hash={compiled.levelHash}
      data-final-state-hash={compiled.finalStateHash}
    >
      <div className="timeline-controls">
        <button
          type="button"
          onClick={onToggle}
          disabled={locked}
          aria-label={playing ? '暂停' : '播放'}
        >
          {playing ? 'Ⅱ' : '▶'}
        </button>
        <div>
          <strong>Replay Director</strong>
          <span>{`${(currentFrame / compiled.fps).toFixed(2)} / ${(compiled.totalFrames / compiled.fps).toFixed(2)} 秒`}</span>
        </div>
        {selectedAction && (
          <div className="tpt-action-override" data-selected-director-action={selectedAction.actionId}>
            <span>动作 {selectedAction.index + 1}</span>
            <label>
              飞行帧
              <input
                type="number"
                min={1}
                max={120}
                value={actionOverrides[selectedAction.actionId]?.flightFrames ?? selectedAction.effectiveTiming.flightFrames}
                onChange={(event) => onTimingOverride(selectedAction.actionId, 'flightFrames', Number(event.target.value))}
              />
            </label>
            <button type="button" onClick={() => onResetOverride(selectedAction.actionId)}>重置覆盖</button>
          </div>
        )}
      </div>
      <div className="timeline-track-wrap">
        <div className="timeline-ruler">
          {Array.from({ length: 7 }, (_, index) => (
            <span key={index} style={{ left: `${(index / 6) * 100}%` }}>
              {((compiled.totalFrames / compiled.fps) * (index / 6)).toFixed(1)}s
            </span>
          ))}
        </div>
        <div className="timeline-track">
          {compiled.actions.map((action) => {
            const left = (action.timing.actionStartFrame / totalFrames) * 100;
            const width = Math.max(1.2, ((action.timing.actionVisualEndFrame - action.timing.actionStartFrame) / totalFrames) * 100);
            const matchLeft = action.transition.matchedTileIds.length > 0
              ? ((action.timing.matchStartFrame - action.timing.actionStartFrame) / Math.max(1, action.timing.actionVisualEndFrame - action.timing.actionStartFrame)) * 100
              : null;
            return (
              <button
                key={action.actionId}
                type="button"
                className={`timeline-action${selectedActionId === action.actionId ? ' is-active' : ''}`}
                data-director-action={action.actionId}
                data-action-index={action.index}
                style={{ left: `${left}%`, width: `${width}%` }}
                disabled={locked}
                onClick={() => {
                  onSelectAction(action.actionId);
                  onSeek(action.timing.actionStartFrame);
                }}
                title={`第 ${action.index + 1} 步 · ${action.tileId}`}
              >
                <span>{action.index + 1}</span>
                {matchLeft !== null && <i style={{ left: `${Math.min(92, Math.max(5, matchLeft))}%` }} />}
              </button>
            );
          })}
          <div className="timeline-playhead" style={{ left: `${(currentFrame / totalFrames) * 100}%` }} />
        </div>
        <input
          data-director-seek
          type="range"
          min={0}
          max={Math.max(0, compiled.totalFrames - 1)}
          value={Math.min(currentFrame, compiled.totalFrames - 1)}
          disabled={locked}
          onChange={(event) => onSeek(Number(event.currentTarget.value))}
          aria-label="回放帧"
        />
      </div>
    </section>
  );
}
