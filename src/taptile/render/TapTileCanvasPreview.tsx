import { useEffect, useRef, useState } from 'react';
import type { CompiledTapTileTake } from '../director';
import type { CompiledTapTileLevel, TapTileProjectV2 } from '../project';
import { hashCanvasPixels } from './frameHash';
import { createTapTileRenderJob, type TapTileRenderJob } from './TapTileRenderJob';

export function TapTileCanvasPreview({
  project,
  level,
  compiledTake,
  frameNumber,
}: {
  project: TapTileProjectV2;
  level: CompiledTapTileLevel;
  compiledTake: CompiledTapTileTake;
  frameNumber: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pixelHash, setPixelHash] = useState('pending');
  const [renderedFrame, setRenderedFrame] = useState(-1);
  const [error, setError] = useState('');
  const jobRef = useRef<TapTileRenderJob | null>(null);
  const [readyRevision, setReadyRevision] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let active = true;
    const job = createTapTileRenderJob(project, level, compiledTake);
    jobRef.current = null;
    setPixelHash('pending');
    setRenderedFrame(-1);
    setError('');
    void (async () => {
      try {
        await job.prepare?.(canvas);
        if (!active) return;
        jobRef.current = job;
        setReadyRevision((revision) => revision + 1);
      } catch (renderError) {
        if (active) setError(renderError instanceof Error ? renderError.message : String(renderError));
      }
    })();
    return () => {
      active = false;
      if (jobRef.current === job) jobRef.current = null;
      void job.dispose?.();
    };
  }, [compiledTake, level, project]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const job = jobRef.current;
    if (!canvas || !job || readyRevision === 0) return undefined;
    let active = true;
    void (async () => {
      try {
        setPixelHash('pending');
        const frame = job.evaluate(frameNumber);
        await job.render(frame, canvas);
        if (!active || jobRef.current !== job) return;
        setPixelHash(hashCanvasPixels(canvas));
        setRenderedFrame(frameNumber);
        setError('');
      } catch (renderError) {
        if (active && jobRef.current === job) {
          setError(renderError instanceof Error ? renderError.message : String(renderError));
        }
      }
    })();
    return () => { active = false; };
  }, [frameNumber, readyRevision]);

  return (
    <canvas
      ref={canvasRef}
      className="tpt-canvas-preview"
      width={1080}
      height={1920}
      data-preview-frame={frameNumber}
      data-preview-rendered-frame={renderedFrame}
      data-preview-pixel-hash={pixelHash}
      data-preview-error={error}
      aria-label={`TapTile Canvas 固定帧预览 ${frameNumber}`}
    />
  );
}
