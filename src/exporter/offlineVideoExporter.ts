import type { RenderSpec, RhythmProfile, StyleSpec, Take } from '../domain/types';
import type { RuntimeAssetBindings } from '../assets/runtimeAssetBindings';
import { compileBlockPlacementFrameSource } from '../games/block-placement/presentation/legacyPresentationAdapter';
import { createBlockPlacementCinematicBackendAdapter } from '../games/block-placement/render/cinematicBackendAdapter';
import { createBlockPlacementReferenceBackendAdapter } from '../games/block-placement/render/referenceBackendAdapter';
import {
  executeVideoRenderJob,
  type RenderProgress,
  type VideoRenderJobResult,
} from '../rendering/renderJob';

export type { RenderProgress };

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

export type ExportVideoResult = VideoRenderJobResult;

export async function exportTakeVideo(options: ExportVideoOptions): Promise<ExportVideoResult> {
  const frameSource = compileBlockPlacementFrameSource({
    take: options.take,
    rhythm: options.rhythm,
    fps: options.render.fps,
  });
  const backend = options.style.renderer === 'reference-2d'
    ? createBlockPlacementReferenceBackendAdapter(options.style)
    : createBlockPlacementCinematicBackendAdapter(options.style);
  const policy = {
    mode: 'procedural-no-assets' as const,
    reason: 'V1 take exporter is not bound to a Resolved Render Plan; StyleSpec drives the first-game backend directly.',
    ...(options.runtimeAssets ? { runtimeAssets: options.runtimeAssets } : {}),
  };
  return executeVideoRenderJob({
    frameSource,
    backend,
    output: options.render,
    projectName: options.projectName,
    takeName: options.take.name,
    resourcePolicy: policy,
    ...(options.signal ? { signal: options.signal } : {}),
    ...(options.onProgress ? { onProgress: options.onProgress } : {}),
  });
}
