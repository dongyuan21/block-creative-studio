import {
  BufferTarget,
  CanvasSource,
  getFirstEncodableVideoCodec,
  Mp4OutputFormat,
  Output,
  Quality,
} from 'mediabunny';
import { compileTake, evaluateCompiledTake } from '../director/presentationCompiler';
import type { PresentationFrame, RenderSpec, RhythmProfile, StyleSpec, Take } from '../domain/types';
import type { RuntimeAssetBindings } from '../assets/runtimeAssetBindings';
import { StudioScene } from '../renderer/StudioScene';
import { Reference2DScene } from '../reference2d/Reference2DScene';
import { containMapping, DESIGN_RESOLUTION } from '../headless/coordinateMapping';
import { safeFileName } from '../utils/download';

export interface RenderProgress {
  phase: 'preparing' | 'rendering' | 'finalizing' | 'done';
  currentFrame: number;
  totalFrames: number;
  ratio: number;
  message: string;
}

export interface ExportVideoOptions {
  take: Take;
  rhythm: RhythmProfile;
  style: StyleSpec;
  render: RenderSpec;
  projectName: string;
  runtimeAssets?: RuntimeAssetBindings;
  signal?: AbortSignal;
  onProgress?: (progress: RenderProgress) => void;
}

export interface ExportVideoResult {
  blob: Blob;
  fileName: string;
  frameCount: number;
  durationSeconds: number;
  renderScale: number;
}

interface QualitySettings {
  bitrate: number;
  renderScale: number;
}

interface OfflineRenderStage {
  readonly canvas: HTMLCanvasElement;
  resize(width: number, height: number, pixelRatio?: number): void;
  setRuntimeAssets(bindings: RuntimeAssetBindings): void;
  warmup(frame: PresentationFrame, style: StyleSpec): Promise<void>;
  renderAt(frame: PresentationFrame, style: StyleSpec): void;
  dispose(): void;
}

function createOfflineStage(canvas: HTMLCanvasElement, style: StyleSpec): OfflineRenderStage {
  return style.renderer === 'reference-2d'
    ? new Reference2DScene(canvas, { quality: 'cinematic' })
    : new StudioScene(canvas, { quality: 'cinematic' });
}

const QUALITY_SETTINGS: Record<RenderSpec['quality'], QualitySettings> = {
  preview: { bitrate: 8_000_000, renderScale: 1 },
  standard: { bitrate: 14_000_000, renderScale: 1.35 },
  cinematic: { bitrate: 24_000_000, renderScale: 2 },
};

function report(callback: ExportVideoOptions['onProgress'], progress: RenderProgress): void {
  callback?.(progress);
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Render canceled', 'AbortError');
}

function blitFrame(
  outputContext: CanvasRenderingContext2D,
  renderCanvas: HTMLCanvasElement,
  renderer: StyleSpec['renderer'],
  width: number,
  height: number,
): void {
  outputContext.fillStyle = '#05070d';
  outputContext.fillRect(0, 0, width, height);
  if (renderer === 'reference-2d') {
    const mapping = containMapping(DESIGN_RESOLUTION, { width, height });
    outputContext.drawImage(
      renderCanvas,
      mapping.offsetX,
      mapping.offsetY,
      mapping.drawWidth,
      mapping.drawHeight,
    );
    return;
  }
  outputContext.drawImage(renderCanvas, 0, 0, width, height);
}

export async function exportTakeVideo(options: ExportVideoOptions): Promise<ExportVideoResult> {
  if (typeof VideoEncoder === 'undefined') {
    throw new Error('当前 Chrome 未启用 WebCodecs VideoEncoder，无法在浏览器内导出 MP4。');
  }
  if (options.render.width % 2 !== 0 || options.render.height % 2 !== 0) {
    throw new Error('H.264 输出宽高必须是偶数。');
  }

  const compiled = compileTake(options.take, options.rhythm, options.render.fps);
  const quality = QUALITY_SETTINGS[options.render.quality];
  const encodingQuality = new Quality({ bitrate: quality.bitrate });
  const codec = await getFirstEncodableVideoCodec(['avc'], {
    width: options.render.width,
    height: options.render.height,
    quality: encodingQuality,
  });
  if (codec !== 'avc') {
    throw new Error(
      `当前 Chrome/GPU 无法以 H.264 编码 ${options.render.width}×${options.render.height} 视频。请更新 Chrome、显卡驱动，或改用支持 AVC 的机器。`,
    );
  }

  // Render above target resolution, then downsample into the fixed 1080p encoding canvas.
  // This keeps the delivered video dimensions stable while improving edges and material highlights.
  const renderCanvas = document.createElement('canvas');
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = options.render.width;
  outputCanvas.height = options.render.height;
  const outputContext = outputCanvas.getContext('2d', { alpha: false });
  if (!outputContext) throw new Error('无法创建视频输出 Canvas。');
  outputContext.imageSmoothingEnabled = true;
  outputContext.imageSmoothingQuality = 'high';

  const stage = createOfflineStage(renderCanvas, options.style);
  if (options.runtimeAssets) stage.setRuntimeAssets(options.runtimeAssets);
  const nativeDesign = options.style.renderer === 'reference-2d';
  if (nativeDesign) {
    stage.resize(DESIGN_RESOLUTION.width, DESIGN_RESOLUTION.height, 1);
  } else {
    stage.resize(options.render.width, options.render.height, quality.renderScale);
  }

  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });
  const source = new CanvasSource(outputCanvas, {
    codec,
    quality: encodingQuality,
  });
  output.addVideoTrack(source, { frameRate: options.render.fps });
  output.setMetadataTags({
    title: `${options.projectName} · ${options.take.name}`,
    artist: 'Block Creative Studio',
    comment: `Deterministic browser render · ${options.style.renderer} · ${quality.renderScale}x supersampling`,
  });

  report(options.onProgress, {
    phase: 'preparing',
    currentFrame: 0,
    totalFrames: compiled.totalFrames,
    ratio: 0,
    message: `正在预热材质、Shader 与编码器（${quality.renderScale}× 超采样）…`,
  });

  try {
    throwIfAborted(options.signal);
    const warmupFrame = evaluateCompiledTake(compiled, 0, options.rhythm);
    await stage.warmup(warmupFrame, options.style);
    blitFrame(outputContext, renderCanvas, options.style.renderer, options.render.width, options.render.height);
    await output.start();

    const frameDuration = 1 / options.render.fps;
    for (let frameIndex = 0; frameIndex < compiled.totalFrames; frameIndex += 1) {
      throwIfAborted(options.signal);
      const frame = evaluateCompiledTake(compiled, frameIndex, options.rhythm);
      stage.renderAt(frame, options.style);
      blitFrame(outputContext, renderCanvas, options.style.renderer, options.render.width, options.render.height);
      await source.add(frameIndex * frameDuration, frameDuration, {
        keyFrame: frameIndex % (options.render.fps * 2) === 0,
      });

      if (frameIndex % 3 === 0 || frameIndex === compiled.totalFrames - 1) {
        report(options.onProgress, {
          phase: 'rendering',
          currentFrame: frameIndex + 1,
          totalFrames: compiled.totalFrames,
          ratio: (frameIndex + 1) / compiled.totalFrames,
          message: `逐帧渲染 ${frameIndex + 1} / ${compiled.totalFrames}`,
        });
        // Yield so progress, cancellation, and browser UI remain responsive between frame batches.
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }

    source.close();
    report(options.onProgress, {
      phase: 'finalizing',
      currentFrame: compiled.totalFrames,
      totalFrames: compiled.totalFrames,
      ratio: 1,
      message: '正在完成 H.264 编码与 MP4 封装…',
    });
    await output.finalize();
    const buffer = target.buffer;
    if (!buffer) throw new Error('视频编码完成，但没有得到输出缓冲区。');

    const blob = new Blob([buffer], { type: 'video/mp4' });
    const fileName = `${safeFileName(options.projectName)}-${safeFileName(options.take.name)}-${options.render.width}x${options.render.height}.mp4`;
    report(options.onProgress, {
      phase: 'done',
      currentFrame: compiled.totalFrames,
      totalFrames: compiled.totalFrames,
      ratio: 1,
      message: '视频已生成。',
    });
    return {
      blob,
      fileName,
      frameCount: compiled.totalFrames,
      durationSeconds: compiled.totalFrames / options.render.fps,
      renderScale: quality.renderScale,
    };
  } catch (error) {
    try {
      await output.cancel();
    } catch {
      // Ignore cleanup errors; the original render error is more useful.
    }
    throw error;
  } finally {
    stage.dispose();
  }
}
