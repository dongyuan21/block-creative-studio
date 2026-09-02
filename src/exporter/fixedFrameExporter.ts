import {
  AudioSample,
  AudioSampleSource,
  BufferTarget,
  CanvasSource,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
  Mp4OutputFormat,
  Output,
  Quality,
} from 'mediabunny';

export interface FrameRenderJob<Frame> {
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  evaluate(frameIndex: number): Frame;
  render(frame: Frame, canvas: HTMLCanvasElement): void | Promise<void>;
  prepare?(canvas: HTMLCanvasElement): void | Promise<void>;
  dispose?(): void | Promise<void>;
}

export interface FrameRenderProgress {
  phase: 'preparing' | 'rendering' | 'finalizing' | 'done';
  currentFrame: number;
  totalFrames: number;
  ratio: number;
  message: string;
}

export interface FixedFrameExportOptions {
  bitrate: number;
  fileName: string;
  metadata?: { title?: string; artist?: string; comment?: string };
  signal?: AbortSignal;
  onProgress?: (progress: FrameRenderProgress) => void;
  keyFrameIntervalSeconds?: number;
  audio?: FixedFrameAudioTrack;
}

export interface FixedFrameAudioTrack {
  data: Float32Array;
  sampleRate: number;
  numberOfChannels: number;
  bitrate?: number;
}

export interface FixedFrameExportResult {
  blob: Blob;
  fileName: string;
  frameCount: number;
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  codec: 'avc';
  audioCodec?: 'aac';
}

export interface FrameRenderJobValidation {
  valid: boolean;
  errors: string[];
}

export function validateFrameRenderJob<Frame>(job: FrameRenderJob<Frame>, evaluateAllFrames = true): FrameRenderJobValidation {
  const errors: string[] = [];
  if (!Number.isInteger(job.width) || !Number.isInteger(job.height) || job.width <= 0 || job.height <= 0) errors.push('输出宽高必须是正整数。');
  if (job.width % 2 !== 0 || job.height % 2 !== 0) errors.push('H.264 输出宽高必须是偶数。');
  if (!Number.isFinite(job.fps) || job.fps <= 0) errors.push('帧率必须大于 0。');
  if (!Number.isInteger(job.totalFrames) || job.totalFrames <= 0) errors.push('总帧数必须是正整数。');
  if (errors.length === 0) {
    const indexes = evaluateAllFrames
      ? Array.from({ length: job.totalFrames }, (_, index) => index)
      : [...new Set([0, Math.floor(job.totalFrames / 2), job.totalFrames - 1])];
    for (const index of indexes) {
      try {
        const frame = job.evaluate(index);
        if (frame === undefined || frame === null) errors.push(`第 ${index} 帧求值为空。`);
      } catch (error) {
        errors.push(`第 ${index} 帧求值失败：${error instanceof Error ? error.message : String(error)}`);
        break;
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Render canceled', 'AbortError');
}

function report(options: FixedFrameExportOptions, progress: FrameRenderProgress): void {
  options.onProgress?.(progress);
}

export async function exportFixedFrameVideo<Frame>(
  job: FrameRenderJob<Frame>,
  options: FixedFrameExportOptions,
): Promise<FixedFrameExportResult> {
  const validation = validateFrameRenderJob(job, true);
  if (!validation.valid) throw new Error(validation.errors.join('\n'));
  if (typeof document === 'undefined') throw new Error('固定帧 MP4 导出需要浏览器 Canvas 环境。');
  if (typeof VideoEncoder === 'undefined') throw new Error('当前浏览器未启用 WebCodecs VideoEncoder，无法导出 MP4。');
  throwIfAborted(options.signal);

  const canvas = document.createElement('canvas');
  canvas.width = job.width;
  canvas.height = job.height;
  report(options, { phase: 'preparing', currentFrame: 0, totalFrames: job.totalFrames, ratio: 0, message: '正在预热资产、字体与 H.264 编码器…' });
  if ('fonts' in document) await document.fonts.ready;
  await job.prepare?.(canvas);
  throwIfAborted(options.signal);

  const quality = new Quality({ bitrate: options.bitrate });
  const codec = await getFirstEncodableVideoCodec(['avc'], { width: job.width, height: job.height, quality });
  if (codec !== 'avc') throw new Error(`当前浏览器/GPU 无法以 H.264 编码 ${job.width}×${job.height} 视频。`);
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });
  const source = new CanvasSource(canvas, { codec, quality });
  output.addVideoTrack(source, { frameRate: job.fps });
  let audioSource: AudioSampleSource | undefined;
  let audioCodec: 'aac' | undefined;
  if (options.audio) {
    if (typeof AudioEncoder === 'undefined') throw new Error('当前浏览器未启用 WebCodecs AudioEncoder，无法导出带音频 MP4。');
    const { data, sampleRate, numberOfChannels } = options.audio;
    if (!(data instanceof Float32Array) || data.length === 0 || !Number.isInteger(sampleRate) || sampleRate <= 0 || !Number.isInteger(numberOfChannels) || numberOfChannels <= 0 || data.length % numberOfChannels !== 0) {
      throw new Error('固定帧导出的音频轨必须是有效的交错 Float32 PCM。');
    }
    const audioQuality = new Quality({ bitrate: options.audio.bitrate ?? 192_000 });
    const selectedAudioCodec = await getFirstEncodableAudioCodec(['aac'], { sampleRate, numberOfChannels, quality: audioQuality });
    if (selectedAudioCodec !== 'aac') throw new Error(`当前浏览器无法以 AAC 编码 ${sampleRate}Hz/${numberOfChannels}ch 音频。`);
    audioCodec = selectedAudioCodec;
    audioSource = new AudioSampleSource({ codec: audioCodec, quality: audioQuality });
    output.addAudioTrack(audioSource, { languageCode: 'und', name: 'TapTile semantic mix' });
  }
  if (options.metadata) output.setMetadataTags(options.metadata);

  try {
    await output.start();
    if (audioSource && options.audio) {
      const audioSample = new AudioSample({
        data: options.audio.data,
        format: 'f32',
        numberOfChannels: options.audio.numberOfChannels,
        sampleRate: options.audio.sampleRate,
        timestamp: 0,
      });
      try {
        await audioSource.add(audioSample);
      } finally {
        audioSample.close();
        audioSource.close();
      }
      throwIfAborted(options.signal);
    }
    const frameDuration = 1 / job.fps;
    const keyInterval = Math.max(1, Math.round((options.keyFrameIntervalSeconds ?? 2) * job.fps));
    for (let frameIndex = 0; frameIndex < job.totalFrames; frameIndex += 1) {
      throwIfAborted(options.signal);
      const frame = job.evaluate(frameIndex);
      await job.render(frame, canvas);
      await source.add(frameIndex * frameDuration, frameDuration, { keyFrame: frameIndex % keyInterval === 0 });
      if (frameIndex % 3 === 0 || frameIndex === job.totalFrames - 1) {
        report(options, {
          phase: 'rendering',
          currentFrame: frameIndex + 1,
          totalFrames: job.totalFrames,
          ratio: (frameIndex + 1) / job.totalFrames,
          message: `逐帧渲染 ${frameIndex + 1} / ${job.totalFrames}`,
        });
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }
    source.close();
    report(options, { phase: 'finalizing', currentFrame: job.totalFrames, totalFrames: job.totalFrames, ratio: 1, message: '正在完成 H.264 编码与 MP4 封装…' });
    await output.finalize();
    if (!target.buffer) throw new Error('编码完成但没有得到 MP4 缓冲区。');
    const blob = new Blob([target.buffer], { type: 'video/mp4' });
    report(options, { phase: 'done', currentFrame: job.totalFrames, totalFrames: job.totalFrames, ratio: 1, message: 'MP4 已生成。' });
    return {
      blob,
      fileName: options.fileName,
      frameCount: job.totalFrames,
      durationSeconds: job.totalFrames / job.fps,
      width: job.width,
      height: job.height,
      fps: job.fps,
      codec,
      ...(audioCodec ? { audioCodec } : {}),
    };
  } catch (error) {
    try { await output.cancel(); } catch { /* Preserve the original error. */ }
    throw error;
  } finally {
    await job.dispose?.();
  }
}
