import type { FrameRenderJob } from '../../exporter/fixedFrameExporter';
import type { CompiledTapTileTake } from '../director';
import { stableHash, type AudioPack, type CompiledTapTileLevel, type CutSpec, type TapTileProjectV2 } from '../project';
import { createTapTileRenderJob, preflightTapTileRenderJob, type TapTileRenderJob, type TapTileRenderPreflightIssue } from '../render/TapTileRenderJob';
import { renderTapTileOutroOverlay } from '../render/CanvasRenderer';
import { compileTapTileAudioMix, type CompiledTapTileAudioMix } from './audio';
import { compileTapTileCut, type CompiledTapTileCut, type TapTileProductionFrame } from './cut';

export interface TapTileProductionIdentity {
  combinationHash: string;
  base: TapTileRenderJob['identity'];
  cutHash: string;
  audioHash: string;
  outroHash?: string;
}

export interface TapTileProductionRenderJob extends FrameRenderJob<TapTileProductionFrame> {
  readonly baseJob: TapTileRenderJob;
  readonly cut: CompiledTapTileCut;
  readonly audioMix: CompiledTapTileAudioMix;
  readonly audioPack: AudioPack;
  readonly identity: TapTileProductionIdentity;
}

export interface TapTileProductionPreflightResult {
  valid: boolean;
  issues: TapTileRenderPreflightIssue[];
  identity: TapTileProductionIdentity;
  totalFrames: number;
  durationSeconds: number;
  scheduledAudioCues: number;
}

export function createTapTileProductionRenderJob(
  project: TapTileProjectV2,
  level: CompiledTapTileLevel,
  compiledTake: CompiledTapTileTake,
  cutSpec: CutSpec,
  audioPack: AudioPack,
): TapTileProductionRenderJob {
  const baseJob = createTapTileRenderJob(project, level, compiledTake);
  const cut = compileTapTileCut(compiledTake, cutSpec, baseJob.project.production.outros);
  const audioMix = compileTapTileAudioMix(baseJob.project, compiledTake, cut, audioPack);
  const identity: TapTileProductionIdentity = Object.freeze({
    combinationHash: stableHash({
      base: baseJob.identity,
      cut: cut.frameMapHash,
      audioPack,
      audioPcm: audioMix.pcmHash,
      outro: cut.outro,
      render: baseJob.project.render,
    }, 'variant'),
    base: baseJob.identity,
    cutHash: cut.frameMapHash,
    audioHash: audioMix.pcmHash,
    ...(cut.outro ? { outroHash: stableHash(cut.outro, 'outro') } : {}),
  });
  return {
    width: baseJob.width,
    height: baseJob.height,
    fps: baseJob.fps,
    totalFrames: cut.totalFrames,
    baseJob,
    cut,
    audioMix,
    audioPack: structuredClone(audioPack),
    identity,
    evaluate: cut.evaluate,
    ...(baseJob.prepare ? { prepare: baseJob.prepare } : {}),
    render: async (frame, canvas) => {
      await baseJob.render(frame.presentation, canvas);
      if (frame.phase === 'outro' && frame.outro) {
        renderTapTileOutroOverlay(canvas, frame.outro, frame.outroProgress, {
          project: baseJob.project,
          level: baseJob.level,
          assets: baseJob.assets,
        });
      }
    },
    ...(baseJob.dispose ? { dispose: baseJob.dispose } : {}),
  };
}

export async function preflightTapTileProductionRenderJob(job: TapTileProductionRenderJob): Promise<TapTileProductionPreflightResult> {
  const base = await preflightTapTileRenderJob(job.baseJob);
  const issues = [...base.issues];
  if (job.totalFrames <= 0) issues.push({ code: 'PRODUCTION_DURATION_INVALID', message: '最终成片必须至少包含 1 帧。' });
  if (job.audioMix.data.length / job.audioMix.numberOfChannels < Math.ceil(job.totalFrames / job.fps * job.audioMix.sampleRate)) {
    issues.push({ code: 'AUDIO_DURATION_SHORT', message: '混音轨长度短于最终成片。' });
  }
  if (job.audioMix.scheduledCues.length === 0) issues.push({ code: 'AUDIO_CUES_EMPTY', message: '所选 Cut 内没有可绑定的语义音频事件。' });
  if (job.audioMix.peakAfterLimit > job.audioMix.peakLimit + 0.0001) {
    issues.push({ code: 'AUDIO_PEAK_EXCEEDED', message: `音频峰值 ${job.audioMix.peakAfterLimit.toFixed(4)} 超过 ${job.audioMix.peakLimit.toFixed(4)}。` });
  }
  return {
    valid: issues.length === 0,
    issues,
    identity: job.identity,
    totalFrames: job.totalFrames,
    durationSeconds: job.totalFrames / job.fps,
    scheduledAudioCues: job.audioMix.scheduledCues.length,
  };
}
