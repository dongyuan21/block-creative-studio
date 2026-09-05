import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { Toolbar } from '../../../components/Toolbar';
import { CrushWoodCanvasScene } from '../render/CrushWoodCanvasScene';
import { CrushWoodAssetPanel } from './CrushWoodAssetPanel';
import { CrushWoodInspector } from './CrushWoodInspector';
import {
  CRUSH_WOOD_MODE_LABELS,
  CRUSH_WOOD_PHASE_LABELS,
  CRUSH_WOOD_STUDIO_FPS,
  useCrushWoodModel,
} from './useCrushWoodModel';
import './crushWoodWorkspace.css';

const STAGE_COPY = {
  edit: { title: '拆解并设计 2D 牌面', callout: '先造局，再试玩。', hint: '左侧选择外观与队列；点击棋盘绘制或擦除木块。' },
  play: { title: '录制真人试玩', callout: '正在记录 Replay', hint: '点击井内列落下当前块，只保存动作与 Seed。' },
  replay: { title: '导演与固定帧重放', callout: '先看 Take，再导出。', hint: '左侧选择 Take；右侧调节节奏并生成 1080×1920 MP4。' },
  render: { title: '导演与固定帧重放', callout: '正在导出成片', hint: '离线逐帧渲染进行中。' },
} as const;

export function CrushWoodWorkspace() {
  const studio = useCrushWoodModel();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<CrushWoodCanvasScene | null>(null);
  const paintStrokeRef = useRef<{ fill: '#' | '.'; lastKey: string } | null>(null);
  const packetRef = useRef(studio.displayPacket);
  packetRef.current = studio.displayPacket;
  const totalFrames = studio.frameSource?.totalFrames ?? 1;
  const copy = STAGE_COPY[studio.mode];
  const rows = studio.config.rows;
  const columns = studio.config.columns;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const scene = new CrushWoodCanvasScene(canvas);
    sceneRef.current = scene;
    const resize = (): void => {
      const bounds = canvas.getBoundingClientRect();
      scene.resize(Math.max(1, bounds.width), Math.max(1, bounds.height), window.devicePixelRatio || 1);
      scene.renderAt(packetRef.current);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return () => {
      observer.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.renderAt(studio.displayPacket);
  }, [studio.displayPacket]);

  useEffect(() => {
    if (studio.mode !== 'play') return undefined;
    const rotate = studio.rotatePlayPiece;
    const drop = studio.dropAtColumn;
    const setHover = studio.setHoverCol;
    const column = studio.hoverCol;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'ArrowUp' || event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        rotate();
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const current = column ?? Math.floor(columns / 2);
        const next = event.key === 'ArrowLeft' ? current - 1 : current + 1;
        setHover(Math.max(0, Math.min(columns - 1, next)));
      }
      if ((event.key === ' ' || event.key === 'Enter') && column !== null) {
        event.preventDefault();
        drop(column);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [columns, studio.dropAtColumn, studio.hoverCol, studio.mode, studio.rotatePlayPiece, studio.setHoverCol]);

  const hitCell = (event: ReactPointerEvent<HTMLCanvasElement>) => (
    sceneRef.current?.hitTestCell(event.clientX, event.clientY, rows, columns) ?? null
  );

  const onCanvasPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    const cell = hitCell(event);
    if (studio.mode === 'play') {
      studio.setHoverCol(cell?.col ?? null);
      return;
    }
    if (studio.mode !== 'edit' || !cell) return;
    const current = studio.config.initialRows[cell.row]?.[cell.col];
    const fill = current === '#' ? '.' : '#';
    paintStrokeRef.current = { fill, lastKey: `${cell.row}:${cell.col}` };
    studio.paintCell(cell.row, cell.col, fill);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onCanvasPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    if (studio.mode === 'play') {
      studio.setHoverCol(hitCell(event)?.col ?? null);
      return;
    }
    const stroke = paintStrokeRef.current;
    if (studio.mode !== 'edit' || !stroke) return;
    const cell = hitCell(event);
    if (!cell) return;
    const key = `${cell.row}:${cell.col}`;
    if (key === stroke.lastKey) return;
    stroke.lastKey = key;
    studio.paintCell(cell.row, cell.col, stroke.fill);
  };

  const onCanvasPointerUp = (): void => {
    paintStrokeRef.current = null;
  };

  const onCanvasClick = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    if (studio.mode !== 'play') return;
    const cell = hitCell(event);
    if (cell) studio.dropAtColumn(cell.col);
  };

  return (
    <div className={`studio-app crush-studio is-${studio.mode}`}>
      <Toolbar
        projectName={studio.projectName}
        mode={studio.mode}
        hasTake={studio.takes.length > 0}
        onProjectName={studio.setProjectName}
        onEdit={studio.enterEdit}
        onPlay={studio.beginHumanPlay}
        onReplay={studio.enterReplay}
        onAgent={studio.runAgent}
        onExportProject={studio.exportProject}
        onImportProject={studio.importProject}
      />

      <main className="studio-workspace">
        <CrushWoodAssetPanel
          skinId={studio.skinId}
          boardRows={studio.config.initialRows}
          boardPreset={studio.boardPreset}
          queue={studio.config.queue}
          queueIndex={studio.payload.queueIndex}
          selectedQueueSlot={studio.selectedQueueSlot}
          takes={studio.takes}
          selectedTakeId={studio.selectedTakeId}
          seed={studio.seed}
          setupEditable={studio.setupEditable}
          takesLocked={studio.mode === 'play' || studio.mode === 'render'}
          onBoardPreset={studio.applyBoardPreset}
          onSkinId={studio.setSkinId}
          onSelectQueueSlot={studio.setSelectedQueueSlot}
          onQueuePiece={studio.setQueuePiece}
          onAddQueuePiece={studio.addQueuePiece}
          onRemoveQueuePiece={studio.removeQueuePiece}
          onSelectTake={studio.selectTake}
          onDeleteTake={studio.deleteTake}
        />

        <section className="stage-column">
          <div className="stage-header">
            <div>
              <span className="eyebrow">REFERENCE-FIRST CREATIVE CANVAS</span>
              <h1>{copy.title}</h1>
            </div>
            <div className="stage-metrics">
              <span><strong>21×34</strong>棋盘</span>
              <span><strong>{studio.config.queue.length}</strong>候选块</span>
              <span><strong>{studio.tracks.length || studio.recordingCount}</strong>动作</span>
            </div>
          </div>

          <div className="stage-frame">
            <div className="phone-frame">
              <div className="viewport-shell">
                <div className="viewport-badges">
                  <span>{studio.mode === 'replay' ? CRUSH_WOOD_PHASE_LABELS[studio.payload.phase] : studio.mode === 'play' ? 'RECORD' : 'EDIT'}</span>
                  <span>
                    {studio.mode === 'replay' || studio.mode === 'render'
                      ? `${studio.frame + 1} / ${totalFrames}`
                      : `${studio.payload.score} / ${studio.config.targetScore}`}
                  </span>
                </div>
                <canvas
                  ref={canvasRef}
                  className="studio-canvas crush-studio-canvas"
                  aria-label="Crush Wood studio canvas"
                  onPointerDown={onCanvasPointerDown}
                  onPointerMove={onCanvasPointerMove}
                  onPointerUp={onCanvasPointerUp}
                  onPointerCancel={onCanvasPointerUp}
                  onPointerLeave={() => studio.setHoverCol(null)}
                  onClick={onCanvasClick}
                />
              </div>
            </div>

            {studio.mode === 'play' && (
              <div className="play-session-bar">
                <div>
                  <span className="recording-dot" />
                  <strong>
                    {studio.recordingStatus === 'won'
                      ? '已过关，可保存 Take'
                      : studio.recordingStatus === 'game-over'
                        ? '失败终局，可保存 Take'
                        : '正在记录 Replay'}
                  </strong>
                  <span>点击井内列落下 · ↑ 旋转 · ← → 选列</span>
                </div>
                <div>
                  <button type="button" className="button-secondary" onClick={studio.rotatePlayPiece}>旋转</button>
                  <button type="button" className="button-secondary" onClick={studio.undoHumanPlacement} disabled={studio.recordingCount === 0}>撤回一步</button>
                  <button type="button" className="button-secondary" onClick={studio.cancelHumanPlay}>取消</button>
                  <button type="button" className="button-primary" onClick={studio.finishHumanTake} disabled={studio.recordingCount === 0}>结束并保存 Take</button>
                </div>
              </div>
            )}

            {studio.mode === 'edit' && (
              <div className="stage-callout">
                <strong>{copy.callout}</strong>
                <span>{copy.hint}</span>
              </div>
            )}
          </div>
        </section>

        <CrushWoodInspector
          payload={studio.payload}
          skinId={studio.skinId}
          seed={studio.seed}
          targetScore={studio.config.targetScore}
          actionCount={studio.mode === 'play' ? studio.recordingCount : studio.tracks.length}
          directorProfile={studio.directorProfile}
          quality={studio.quality}
          totalFrames={totalFrames}
          fps={CRUSH_WOOD_STUDIO_FPS}
          locked={studio.locked}
          setupEditable={studio.setupEditable}
          hasTake={studio.takes.length > 0}
          exportState={studio.exportState}
          onSeed={studio.setSeed}
          onTargetScore={studio.setTargetScore}
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
            disabled={!studio.frameSource || studio.locked}
            aria-label={studio.playing ? '暂停' : '播放'}
          >
            {studio.playing ? 'Ⅱ' : '▶'}
          </button>
          <div>
            <strong>Replay Director</strong>
            <span>
              {studio.frameSource
                ? `${(studio.frame / CRUSH_WOOD_STUDIO_FPS).toFixed(2)} / ${(totalFrames / CRUSH_WOOD_STUDIO_FPS).toFixed(2)} 秒`
                : '尚未选择 Take'}
            </span>
          </div>
        </div>
        <div className="timeline-track-wrap">
          <div className="timeline-ruler">
            {Array.from({ length: 7 }, (_, index) => (
              <span key={index} style={{ left: `${(index / 6) * 100}%` }}>
                {studio.frameSource ? ((totalFrames / CRUSH_WOOD_STUDIO_FPS) * (index / 6)).toFixed(1) : '0'}s
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
            <div className="timeline-playhead" style={{ left: `${(studio.frame / Math.max(1, totalFrames)) * 100}%` }} />
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, totalFrames - 1)}
            value={Math.min(studio.frame, totalFrames - 1)}
            disabled={!studio.frameSource || studio.locked}
            onChange={(event) => studio.seek(Number(event.currentTarget.value))}
            aria-label="回放帧"
          />
        </div>
      </section>

      <footer className="status-bar">
        <span className="status-dot" />
        <strong>{CRUSH_WOOD_MODE_LABELS[studio.mode]}</strong>
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
