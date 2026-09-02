import { useEffect, useMemo, useRef, useState } from 'react';
import type { CompiledTapTileTake } from '../director';
import type { CompiledTapTileLevel, TapTileProjectV2 } from '../project';
import { hashCanvasPixels } from './frameHash';
import { createTapTileRenderJob } from './TapTileRenderJob';

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
  const job = useMemo(
    () => createTapTileRenderJob(project, level, compiledTake),
    [compiledTake, level, project],
  );

  useEffect(() => {
    let active = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    void (async () => {
      try {
        setPixelHash('pending');
        await job.prepare?.(canvas);
        if (!active) return;
        const frame = job.evaluate(frameNumber);
        await job.render(frame, canvas);
        if (!active) return;
        setPixelHash(hashCanvasPixels(canvas));
        setRenderedFrame(frameNumber);
        setError('');
      } catch (renderError) {
        if (active) setError(renderError instanceof Error ? renderError.message : String(renderError));
      }
    })();
    return () => { active = false; };
  }, [frameNumber, job]);

  useEffect(() => () => { void job.dispose?.(); }, [job]);

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
