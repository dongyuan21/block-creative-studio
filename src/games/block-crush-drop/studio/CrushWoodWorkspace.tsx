import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { executeVideoRenderJob, type RenderProgress } from '../../../rendering/renderJob';
import { downloadBlob } from '../../../utils/download';
import { CRUSH_WOOD_SKINS } from '../levels';
import { compileCrushWoodReferenceFrameSource, createCrushWoodReferenceDocument } from '../project';
import { crushWoodPayloadFromPacket } from '../presentation';
import { createCrushWoodCinematicBackendAdapter } from '../render/cinematicBackendAdapter';
import { CrushWoodCanvasScene } from '../render/CrushWoodCanvasScene';
import type { CrushWoodPhase, CrushWoodSkinId } from '../types';
import './crushWoodWorkspace.css';

const FPS = 30;

const PHASE_LABELS: Record<CrushWoodPhase, string> = {
  idle: '待机',
  fall: '落块',
  impact: '撞击',
  crush: '粉碎',
  collapse: '坍落',
  settle: '稳定',
  outcome: '结算',
};

function progressLabel(progress: RenderProgress | null): string {
  if (!progress) return '导出 1080×1920 MP4';
  if (progress.phase === 'done') return '视频已生成';
  return `${progress.message} ${Math.round(progress.ratio * 100)}%`;
}

export function CrushWoodWorkspace() {
  const [skinId, setSkinId] = useState<CrushWoodSkinId>('golden-embossed');
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<CrushWoodCanvasScene | null>(null);
  const playbackStartedAt = useRef<number | null>(null);
  const playbackStartedFrame = useRef(0);

  const frameSource = useMemo(() => compileCrushWoodReferenceFrameSource(skinId), [skinId]);
  const packet = useMemo(() => frameSource.evaluate(frame), [frameSource, frame]);
  const payload = useMemo(() => crushWoodPayloadFromPacket(packet), [packet]);

  const drawFrame = useCallback(() => {
    sceneRef.current?.renderAt(frameSource.evaluate(frame));
  }, [frame, frameSource]);

  useEffect(() => {
    setFrame(0);
    playbackStartedAt.current = null;
  }, [frameSource]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const scene = new CrushWoodCanvasScene(canvas);
    sceneRef.current = scene;
    const resize = (): void => {
      const bounds = canvas.getBoundingClientRect();
      scene.resize(Math.max(1, bounds.width), Math.max(1, bounds.height), window.devicePixelRatio || 1);
      scene.renderAt(frameSource.evaluate(frame));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return () => {
      observer.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, [frameSource]);

  useEffect(() => {
    drawFrame();
  }, [drawFrame]);

  useEffect(() => {
    if (!playing || exporting) {
      playbackStartedAt.current = null;
      return undefined;
    }
    let animationFrame = 0;
    const tick = (now: number): void => {
      if (playbackStartedAt.current === null) {
        playbackStartedAt.current = now;
        playbackStartedFrame.current = frame;
      }
      const elapsedFrames = Math.floor(((now - playbackStartedAt.current) / 1_000) * FPS);
      const next = playbackStartedFrame.current + elapsedFrames;
      if (next >= frameSource.totalFrames) {
        setFrame(frameSource.totalFrames - 1);
        setPlaying(false);
        playbackStartedAt.current = null;
        return;
      }
      setFrame(next);
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [exporting, frame, frameSource.totalFrames, playing]);

  const seek = (next: number): void => {
    setFrame(Math.max(0, Math.min(frameSource.totalFrames - 1, Math.round(next))));
    playbackStartedAt.current = null;
  };

  const togglePlayback = (): void => {
    if (frame >= frameSource.totalFrames - 1) setFrame(0);
    setPlaying((value) => !value);
    playbackStartedAt.current = null;
  };

  const nextBeat = (): void => {
    const currentPhase = payload.phase;
    for (let candidate = frame + 1; candidate < frameSource.totalFrames; candidate += 1) {
      const nextPayload = crushWoodPayloadFromPacket(frameSource.evaluate(candidate));
      if (nextPayload.phase !== currentPhase) {
        seek(candidate);
        setPlaying(false);
        return;
      }
    }
    seek(frameSource.totalFrames - 1);
    setPlaying(false);
  };

  const exportProject = (): void => {
    const document = createCrushWoodReferenceDocument(skinId);
    downloadBlob(
      new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }),
      `crush-wood-${skinId}.bcs.json`,
    );
  };

  const exportVideo = async (): Promise<void> => {
    setPlaying(false);
    setExporting(true);
    setExportError(null);
    setRenderProgress(null);
    try {
      const result = await executeVideoRenderJob({
        frameSource,
        backend: createCrushWoodCinematicBackendAdapter(),
        output: { width: 1080, height: 1920, fps: FPS, quality: 'cinematic' },
        projectName: 'Crush Wooood',
        takeName: `${skinId}-reference`,
        resourcePolicy: {
          mode: 'procedural-no-assets',
          reason: 'Crush Wood reference skin is generated deterministically by its game-owned cinematic renderer.',
        },
        onProgress: setRenderProgress,
      });
      downloadBlob(result.blob, result.fileName);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : String(error));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="crush-workspace">
      <header className="crush-workspace__header">
        <div>
          <span className="crush-eyebrow">REFERENCE-DRIVEN GAME PACKAGE</span>
          <h1>Crush Wooood!</h1>
          <p>21×34 预制木块关卡 · 纵向落块 · 满行粉碎 · 上层坍落 · 确定性视频导出</p>
        </div>
        <div className="crush-workspace__header-actions">
          <button type="button" className="button-secondary" onClick={exportProject}>导出 BCS JSON</button>
          <button type="button" className="button-primary" onClick={() => void exportVideo()} disabled={exporting}>
            {progressLabel(renderProgress)}
          </button>
        </div>
      </header>

      <main className="crush-workspace__body">
        <aside className="crush-panel crush-panel--left">
          <section>
            <span className="crush-panel__label">REFERENCE SKIN</span>
            <div className="crush-skin-list">
              {CRUSH_WOOD_SKINS.map((skin) => (
                <button
                  type="button"
                  key={skin.id}
                  className={`crush-skin-card${skin.id === skinId ? ' is-active' : ''}`}
                  onClick={() => setSkinId(skin.id)}
                >
                  <span className={`crush-skin-swatch crush-skin-swatch--${skin.id}`} />
                  <span>
                    <strong>{skin.label}</strong>
                    <small>{skin.description}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="crush-contract-card">
            <span className="crush-panel__label">GAME CONTRACT</span>
            <dl>
              <div><dt>Topology</dt><dd>21 × 34 Grid</dd></div>
              <div><dt>Rule</dt><dd>Drop → Full Row → Collapse</dd></div>
              <div><dt>Score</dt><dd>100 / line</dd></div>
              <div><dt>Replay</dt><dd>9 deterministic actions</dd></div>
              <div><dt>Output</dt><dd>1080 × 1920 · 30 fps</dd></div>
            </dl>
          </section>
        </aside>

        <section className="crush-stage-column">
          <div className="crush-stage-toolbar">
            <div>
              <strong>{PHASE_LABELS[payload.phase]}</strong>
              <span>Frame {frame + 1} / {frameSource.totalFrames}</span>
            </div>
            <div className="crush-stage-toolbar__buttons">
              <button type="button" className="button-secondary" onClick={() => seek(0)}>重置</button>
              <button type="button" className="button-primary" onClick={togglePlayback}>{playing ? '暂停' : '播放'}</button>
              <button type="button" className="button-secondary" onClick={nextBeat}>下一节拍</button>
            </div>
          </div>

          <div className="crush-phone-shell">
            <canvas ref={canvasRef} className="crush-canvas" aria-label="Crush Wood deterministic preview" />
          </div>

          <div className="crush-timeline">
            <input
              type="range"
              min={0}
              max={frameSource.totalFrames - 1}
              value={frame}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setPlaying(false);
                seek(Number(event.currentTarget.value));
              }}
              aria-label="Crush Wood playback frame"
            />
            <div className="crush-timeline__ticks">
              <span>START</span>
              <span>DROP</span>
              <span>CRUSH</span>
              <span>COLLAPSE</span>
              <span>OUTCOME</span>
            </div>
          </div>
        </section>

        <aside className="crush-panel crush-panel--right">
          <section className="crush-live-card">
            <span className="crush-panel__label">LIVE STATE</span>
            <div className="crush-score">{payload.score}</div>
            <span className="crush-score__caption">SCORE / {payload.targetScore}</span>
            <div className="crush-progress-track"><span style={{ width: `${Math.min(100, payload.score / payload.targetScore * 100)}%` }} /></div>
            <dl>
              <div><dt>Phase</dt><dd>{PHASE_LABELS[payload.phase]}</dd></div>
              <div><dt>Action</dt><dd>{Math.max(0, payload.actionIndex + 1)} / 9</dd></div>
              <div><dt>Lines</dt><dd>{payload.linesCleared}</dd></div>
              <div><dt>Queue</dt><dd>{payload.queue[payload.queueIndex % payload.queue.length] ?? '—'}</dd></div>
              <div><dt>Time</dt><dd>{Math.ceil(payload.remainingTimeMs / 1_000)}s</dd></div>
              <div><dt>Status</dt><dd>{payload.status}</dd></div>
            </dl>
          </section>

          <section className="crush-quality-card">
            <span className="crush-panel__label">PIXEL REGRESSION ANCHORS</span>
            <p>设计坐标 720×1280，经 1.5× 映射到附件的 1080×1920。</p>
            <code>well: (16,140) 688×1125</code>
            <code>cell: 32.76×33.09</code>
            <code>seed: 29980</code>
          </section>

          {exportError && <div className="crush-error" role="alert">{exportError}</div>}
        </aside>
      </main>
    </div>
  );
}
