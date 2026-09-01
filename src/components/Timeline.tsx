import type { CompiledTake } from '../domain/types';

interface TimelineProps {
  compiled: CompiledTake | null;
  frame: number;
  playing: boolean;
  locked: boolean;
  onFrame(frame: number): void;
  onToggle(): void;
}

export function Timeline({ compiled, frame, playing, locked, onFrame, onToggle }: TimelineProps) {
  const totalFrames = compiled?.totalFrames ?? 1;
  return (
    <section className="timeline" aria-label="Replay 事件时间线">
      <div className="timeline-controls">
        <button onClick={onToggle} disabled={!compiled || locked} aria-label={playing ? '暂停' : '播放'}>
          {playing ? 'Ⅱ' : '▶'}
        </button>
        <div>
          <strong>Replay Director</strong>
          <span>{compiled ? `${(frame / compiled.fps).toFixed(2)} / ${(compiled.totalFrames / compiled.fps).toFixed(2)} 秒` : '尚未选择 Take'}</span>
        </div>
      </div>
      <div className="timeline-track-wrap">
        <div className="timeline-ruler">
          {Array.from({ length: 7 }, (_, index) => (
            <span key={index} style={{ left: `${(index / 6) * 100}%` }}>
              {compiled ? ((compiled.totalFrames / compiled.fps) * (index / 6)).toFixed(1) : '0'}s
            </span>
          ))}
        </div>
        <div className="timeline-track">
          {compiled?.actions.map((action, index) => {
            const left = (action.startFrame / totalFrames) * 100;
            const width = Math.max(1.2, ((action.endFrame - action.startFrame) / totalFrames) * 100);
            const clearLeft = ((action.clearStartFrame - action.startFrame) / Math.max(1, action.endFrame - action.startFrame)) * 100;
            return (
              <button
                key={action.action.id}
                className="timeline-action"
                style={{ left: `${left}%`, width: `${width}%` }}
                disabled={locked}
                onClick={() => onFrame(action.startFrame)}
                title={`第 ${index + 1} 步 · ${action.action.actor === 'human' ? '人类' : 'Agent'}`}
              >
                <span>{index + 1}</span>
                {action.transition.clear.cells.length > 0 && (
                  <i style={{ left: `${Math.min(92, Math.max(5, clearLeft))}%` }} />
                )}
              </button>
            );
          })}
          <div className="timeline-playhead" style={{ left: `${(frame / totalFrames) * 100}%` }} />
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(0, totalFrames - 1)}
          value={Math.min(frame, totalFrames - 1)}
          disabled={!compiled || locked}
          onChange={(event) => onFrame(Number(event.target.value))}
          aria-label="回放帧"
        />
      </div>
    </section>
  );
}
