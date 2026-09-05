import { useEffect, useRef } from 'react';
import { Toolbar } from '../../../components/Toolbar';
import { CRUSH_WOOD_REFERENCE_TAKE_ID } from '../project';
import { CrushWoodCanvasScene } from '../render/CrushWoodCanvasScene';
import { CrushWoodAssetPanel } from './CrushWoodAssetPanel';
import { CrushWoodInspector } from './CrushWoodInspector';
import { CRUSH_WOOD_PHASE_LABELS, CRUSH_WOOD_STUDIO_FPS, useCrushWoodModel } from './useCrushWoodModel';
import './crushWoodWorkspace.css';

export function CrushWoodWorkspace() {
  const studio = useCrushWoodModel();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<CrushWoodCanvasScene | null>(null);
  const frameSourceRef = useRef(studio.frameSource);
  const frameRef = useRef(studio.frame);
  const totalFrames = studio.frameSource.totalFrames;
  frameSourceRef.current = studio.frameSource;
  frameRef.current = studio.frame;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const scene = new CrushWoodCanvasScene(canvas);
    sceneRef.current = scene;
    const resize = (): void => {
      const bounds = canvas.getBoundingClientRect();
      scene.resize(Math.max(1, bounds.width), Math.max(1, bounds.height), window.devicePixelRatio || 1);
      scene.renderAt(frameSourceRef.current.evaluate(frameRef.current));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return () => {
      observer.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, [studio.frameSource]);

  useEffect(() => {
    sceneRef.current?.renderAt(studio.frameSource.evaluate(studio.frame));
  }, [studio.frame, studio.frameSource]);

  return (
    <div className="studio-app crush-studio">
      <Toolbar
        projectName={studio.projectName}
        mode={studio.mode}
        hasTake
        editEnabled={false}
        playEnabled={false}
        agentEnabled={false}
        onProjectName={studio.setProjectName}
        onEdit={() => undefined}
        onPlay={() => undefined}
        onReplay={() => undefined}
        onAgent={() => undefined}
        onExportProject={studio.exportProject}
        onImportProject={studio.importProject}
      />

      <main className="studio-workspace">
        <CrushWoodAssetPanel
          skinId={studio.skinId}
          queue={studio.payload.queue}
          queueIndex={studio.payload.queueIndex}
          takeName={CRUSH_WOOD_REFERENCE_TAKE_ID}
          actionCount={studio.tracks.length}
          seed={studio.seed}
          locked={studio.locked}
          onSkinId={studio.setSkinId}
        />

        <section className="stage-column">
          <div className="stage-header">
            <div>
              <span className="eyebrow">REFERENCE-FIRST CREATIVE CANVAS</span>
              <h1>导演与固定帧重放</h1>
            </div>
            <div className="stage-metrics">
              <span><strong>21×34</strong>棋盘</span>
              <span><strong>{studio.payload.queue.length}</strong>候选块</span>
              <span><strong>{studio.tracks.length}</strong>动作</span>
            </div>
          </div>

          <div className="stage-frame">
            <div className="phone-frame">
              <div className="viewport-shell">
                <div className="viewport-badges">
                  <span>{CRUSH_WOOD_PHASE_LABELS[studio.payload.phase]}</span>
                  <span>{studio.frame + 1} / {totalFrames}</span>
                </div>
                <canvas
                  ref={canvasRef}
                  className="studio-canvas crush-studio-canvas"
                  aria-label="Crush Wood deterministic preview"
                />
              </div>
            </div>
            <div className="stage-callout">
              <strong>先看参考 Take，再导出。</strong>
              <span>左侧选择外观与队列；右侧调节节奏并生成 1080×1920 MP4。</span>
            </div>
          </div>
        </section>

        <CrushWoodInspector
          payload={studio.payload}
          skinId={studio.skinId}
          seed={studio.seed}
          directorProfile={studio.directorProfile}
          quality={studio.quality}
          totalFrames={totalFrames}
          fps={CRUSH_WOOD_STUDIO_FPS}
          locked={studio.locked}
          exportState={studio.exportState}
          onSeed={studio.setSeed}
          onDirectorProfile={studio.setDirectorProfile}
          onQuality={studio.setQuality}
          onExportVideo={studio.exportVideo}
          onCancelExport={studio.cancelExport}
        />
      </main>

      <section className="timeline" aria-label="Replay 事件时间线">
        <div className="timeline-controls">
          <button
            type="button"
            onClick={studio.togglePlayback}
            disabled={studio.locked}
            aria-label={studio.playing ? '暂停' : '播放'}
          >
            {studio.playing ? 'Ⅱ' : '▶'}
          </button>
          <div>
            <strong>Replay Director</strong>
            <span>
              {(studio.frame / CRUSH_WOOD_STUDIO_FPS).toFixed(2)}
              {' / '}
              {(totalFrames / CRUSH_WOOD_STUDIO_FPS).toFixed(2)} 秒
            </span>
          </div>
        </div>
        <div className="timeline-track-wrap">
          <div className="timeline-ruler">
            {Array.from({ length: 7 }, (_, index) => (
              <span key={index} style={{ left: `${(index / 6) * 100}%` }}>
                {((totalFrames / CRUSH_WOOD_STUDIO_FPS) * (index / 6)).toFixed(1)}s
              </span>
            ))}
          </div>
          <div className="timeline-track">
            {studio.tracks.map((track) => {
              const left = (track.startFrame / totalFrames) * 100;
              const width = Math.max(1.2, ((track.endFrame - track.startFrame) / totalFrames) * 100);
              const clearLeft = track.clearStartFrame === null
                ? null
                : ((track.clearStartFrame - track.startFrame) / Math.max(1, track.endFrame - track.startFrame)) * 100;
              return (
                <button
                  key={track.index}
                  type="button"
                  className="timeline-action"
                  style={{ left: `${left}%`, width: `${width}%` }}
                  disabled={studio.locked}
                  onClick={() => studio.seek(track.startFrame)}
                  title={`第 ${track.index + 1} 步 · ${track.pieceId}`}
                >
                  <span>{track.index + 1}</span>
                  {clearLeft !== null && <i style={{ left: `${Math.min(92, Math.max(5, clearLeft))}%` }} />}
                </button>
              );
            })}
            <div className="timeline-playhead" style={{ left: `${(studio.frame / totalFrames) * 100}%` }} />
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, totalFrames - 1)}
            value={Math.min(studio.frame, totalFrames - 1)}
            disabled={studio.locked}
            onChange={(event) => studio.seek(Number(event.currentTarget.value))}
            aria-label="回放帧"
          />
        </div>
      </section>

      <footer className="status-bar">
        <span className="status-dot" />
        <strong>导演回放</strong>
        <span>回合 {Math.max(0, studio.payload.actionIndex + 1)}</span>
        <span>得分 {studio.payload.score}</span>
        <span>消行 {studio.payload.linesCleared}</span>
        <span className="status-spacer" />
        <span>Canvas 2D</span>
        <span>固定时间步</span>
        <span>Schema 1.0.0</span>
      </footer>
    </div>
  );
}
