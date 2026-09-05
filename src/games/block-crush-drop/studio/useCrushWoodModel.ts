import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CompiledFrameSource } from '../../../game-runtime/frameSource';
import { parseStudioProjectDocumentV2 } from '../../../game-runtime/projectParser';
import { executeVideoRenderJob, type RenderProgress, type VideoRenderOutput } from '../../../rendering/renderJob';
import type { StudioSessionMode } from '../../../studio/sessionTypes';
import { downloadBlob, safeFileName } from '../../../utils/download';
import { BLOCK_CRUSH_DROP_GAME_ID } from '../manifest';
import {
  crushWoodPayloadFromPacket,
  DEFAULT_CRUSH_WOOD_DIRECTOR_PROFILE,
  resolveCrushWoodDirectorProfile,
  type CrushWoodActionTrack,
} from '../presentation';
import {
  compileCrushWoodStudioSession,
  createCrushWoodReferenceDocument,
  CRUSH_WOOD_REFERENCE_TAKE_ID,
} from '../project';
import { createCrushWoodCinematicBackendAdapter } from '../render/cinematicBackendAdapter';
import { crushWoodConfigSchema } from '../schemas';
import type {
  CrushWoodDirectorProfile,
  CrushWoodPresentationPayload,
  CrushWoodSkinId,
} from '../types';

export const CRUSH_WOOD_STUDIO_FPS = 30;

export const CRUSH_WOOD_PHASE_LABELS: Record<CrushWoodPresentationPayload['phase'], string> = {
  idle: '待机',
  fall: '落块',
  impact: '撞击',
  crush: '粉碎',
  collapse: '坍落',
  settle: '稳定',
  outcome: '结算',
};

export const CRUSH_WOOD_STATUS_LABELS: Record<CrushWoodPresentationPayload['status'], string> = {
  playing: '进行中',
  won: '过关',
  'game-over': '失败',
};

interface ExportState {
  running: boolean;
  progress: RenderProgress | null;
  error: string | null;
}

export interface CrushWoodStudioModel {
  projectName: string;
  mode: StudioSessionMode;
  skinId: CrushWoodSkinId;
  seed: number;
  directorProfile: CrushWoodDirectorProfile;
  quality: VideoRenderOutput['quality'];
  frame: number;
  playing: boolean;
  frameSource: CompiledFrameSource;
  payload: CrushWoodPresentationPayload;
  tracks: CrushWoodActionTrack[];
  exportState: ExportState;
  locked: boolean;
  setProjectName(name: string): void;
  setSkinId(skinId: CrushWoodSkinId): void;
  setSeed(seed: number): void;
  setDirectorProfile(patch: Partial<CrushWoodDirectorProfile>): void;
  setQuality(quality: VideoRenderOutput['quality']): void;
  seek(frame: number): void;
  togglePlayback(): void;
  exportProject(): void;
  importProject(file: File): Promise<void>;
  exportVideo(): Promise<void>;
  cancelExport(): void;
}

function parseCrushWoodStudioFile(data: unknown): {
  name: string;
  skinId: CrushWoodSkinId;
  seed: number;
  directorProfile: CrushWoodDirectorProfile;
  quality: VideoRenderOutput['quality'];
} {
  const document = parseStudioProjectDocumentV2(data);
  if (document.game.game.id !== BLOCK_CRUSH_DROP_GAME_ID) {
    throw new Error('不是 Crush Wooood 工程。');
  }
  const config = crushWoodConfigSchema.parse(document.game.config.data);
  const quality = document.production.output.quality;
  return {
    name: document.name,
    skinId: config.skinId,
    seed: document.takes[0]?.seed ?? 29_980,
    directorProfile: resolveCrushWoodDirectorProfile(document.direction?.rhythm),
    quality: quality === 'preview' || quality === 'standard' || quality === 'cinematic' ? quality : 'cinematic',
  };
}

export function useCrushWoodModel(): CrushWoodStudioModel {
  const [projectName, setProjectName] = useState('Crush Wooood · golden-embossed');
  const [skinId, setSkinId] = useState<CrushWoodSkinId>('golden-embossed');
  const [seed, setSeed] = useState(29_980);
  const [directorProfile, setDirectorProfileState] = useState<CrushWoodDirectorProfile>({
    ...DEFAULT_CRUSH_WOOD_DIRECTOR_PROFILE,
  });
  const [quality, setQuality] = useState<VideoRenderOutput['quality']>('cinematic');
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [exportState, setExportState] = useState<ExportState>({
    running: false,
    progress: null,
    error: null,
  });
  const canvasExportAbort = useRef<AbortController | null>(null);
  const playbackStartedAt = useRef<number | null>(null);
  const playbackStartedFrame = useRef(0);
  const frameRef = useRef(0);
  frameRef.current = frame;

  const compiled = useMemo(
    () => compileCrushWoodStudioSession(skinId, { seed, directorProfile, fps: CRUSH_WOOD_STUDIO_FPS }),
    [directorProfile, seed, skinId],
  );
  const frameSource = compiled.frameSource;
  const tracks = compiled.tracks;
  const packet = useMemo(() => frameSource.evaluate(frame), [frame, frameSource]);
  const payload = useMemo(() => crushWoodPayloadFromPacket(packet), [packet]);
  const locked = exportState.running;
  const mode: StudioSessionMode = locked ? 'render' : 'replay';

  useEffect(() => {
    setFrame(0);
    playbackStartedAt.current = null;
  }, [frameSource]);

  useEffect(() => {
    if (!playing || locked) {
      playbackStartedAt.current = null;
      return undefined;
    }
    let animationFrame = 0;
    playbackStartedAt.current = null;
    const tick = (now: number): void => {
      if (playbackStartedAt.current === null) {
        playbackStartedAt.current = now;
        playbackStartedFrame.current = frameRef.current;
      }
      const elapsedFrames = Math.floor(((now - playbackStartedAt.current) / 1_000) * CRUSH_WOOD_STUDIO_FPS);
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
  }, [frameSource.totalFrames, locked, playing]);

  const seek = useCallback((next: number): void => {
    setPlaying(false);
    setFrame(Math.max(0, Math.min(frameSource.totalFrames - 1, Math.round(next))));
    playbackStartedAt.current = null;
  }, [frameSource.totalFrames]);

  const togglePlayback = useCallback((): void => {
    if (frameRef.current >= frameSource.totalFrames - 1) setFrame(0);
    setPlaying((value) => !value);
    playbackStartedAt.current = null;
  }, [frameSource.totalFrames]);

  const setDirectorProfile = useCallback((patch: Partial<CrushWoodDirectorProfile>): void => {
    setDirectorProfileState((current) => ({ ...current, ...patch }));
    setPlaying(false);
  }, []);

  const exportProject = useCallback((): void => {
    const document = createCrushWoodReferenceDocument(skinId, { name: projectName, seed, directorProfile, quality });
    downloadBlob(
      new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }),
      `${safeFileName(projectName)}.bcs.json`,
    );
  }, [directorProfile, projectName, quality, seed, skinId]);

  const importProject = useCallback(async (file: File): Promise<void> => {
    if (locked) throw new Error('视频渲染期间不能导入项目。');
    const parsed = parseCrushWoodStudioFile(JSON.parse(await file.text()));
    setProjectName(parsed.name);
    setSkinId(parsed.skinId);
    setSeed(parsed.seed);
    setDirectorProfileState(parsed.directorProfile);
    setQuality(parsed.quality);
    setPlaying(false);
    setFrame(0);
  }, [locked]);

  const exportVideo = useCallback(async (): Promise<void> => {
    if (exportState.running) return;
    setPlaying(false);
    const controller = new AbortController();
    canvasExportAbort.current = controller;
    setExportState({ running: true, progress: null, error: null });
    try {
      const result = await executeVideoRenderJob({
        frameSource,
        backend: createCrushWoodCinematicBackendAdapter(),
        output: { width: 1080, height: 1920, fps: CRUSH_WOOD_STUDIO_FPS, quality },
        projectName,
        takeName: `${skinId}-${CRUSH_WOOD_REFERENCE_TAKE_ID}`,
        resourcePolicy: {
          mode: 'procedural-no-assets',
          reason: 'Crush Wood reference skin is generated deterministically by its game-owned cinematic renderer.',
        },
        signal: controller.signal,
        onProgress: (progress) => setExportState({ running: true, progress, error: null }),
      });
      downloadBlob(result.blob, result.fileName);
      setExportState({ running: false, progress: null, error: null });
    } catch (error) {
      const canceled = error instanceof DOMException && error.name === 'AbortError';
      setExportState({
        running: false,
        progress: null,
        error: canceled ? null : error instanceof Error ? error.message : String(error),
      });
    } finally {
      canvasExportAbort.current = null;
    }
  }, [exportState.running, frameSource, projectName, quality, skinId]);

  const cancelExport = useCallback((): void => {
    canvasExportAbort.current?.abort();
  }, []);

  return {
    projectName,
    mode,
    skinId,
    seed,
    directorProfile,
    quality,
    frame,
    playing,
    frameSource,
    payload,
    tracks,
    exportState,
    locked,
    setProjectName,
    setSkinId,
    setSeed,
    setDirectorProfile,
    setQuality,
    seek,
    togglePlayback,
    exportProject,
    importProject,
    exportVideo,
    cancelExport,
  };
}
