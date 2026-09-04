import type { CaptureSuite } from '../../../capture/captureSuite';
import type { PresentationPacket } from '../../../game-runtime/presentationPacket';
import { compileTapTileTake, evaluateTapTileFrame } from '../director';
import { compileTapTileLevel, createInitialTapTileGameState, tapTileStateHash } from '../gameplay';
import { TAPTILE_TRAY_MATCH3_GAME_ID } from '../manifest';
import { tapTilePacketFromFrame } from '../presentation/presentationAdapter';
import { tapTileCompositionProfile } from '../profiles/composition';
import { createDefaultTapTileProject } from '../project';
import { DEFAULT_DIRECTOR_PROFILES } from '../project/migrateV1';
import { createTapTileTake } from '../gameplay/take';

export const TAPTILE_CAPTURE_FPS = 30;

export interface TapTileCaptureStillSpec {
  id: string;
  role: 'after' | 'diagnostic';
  renderer: 'reference-2d';
  anchor: 'idle' | 'end';
}

export const TAPTILE_STILL_SPECS: TapTileCaptureStillSpec[] = [
  { id: 'taptile-idle', role: 'after', renderer: 'reference-2d', anchor: 'idle' },
  { id: 'taptile-end', role: 'diagnostic', renderer: 'reference-2d', anchor: 'end' },
];

export const TAPTILE_VIDEO_SPECS = [
  { id: 'taptile-reference-2d', renderer: 'reference-2d' as const },
];

function diagnosticCompiledTake() {
  const project = createDefaultTapTileProject('hourglass');
  const level = compileTapTileLevel(project);
  const initial = createInitialTapTileGameState(level);
  const take = createTapTileTake(level, [], initial, { id: 'taptile-capture-idle', name: 'Idle' });
  const profile = DEFAULT_DIRECTOR_PROFILES['human-natural']!;
  return compileTapTileTake(level, take, profile, { seed: project.director.seed, fps: TAPTILE_CAPTURE_FPS });
}

export function packetForTapTileStill(spec: TapTileCaptureStillSpec): PresentationPacket {
  const compiled = diagnosticCompiledTake();
  const frameIndex = spec.anchor === 'end' ? compiled.totalFrames - 1 : 0;
  const frame = evaluateTapTileFrame(compiled, frameIndex);
  return tapTilePacketFromFrame({
    takeId: compiled.takeId,
    frame,
    events: compiled.events,
    stateHash: tapTileStateHash(frame.gameState),
    fps: compiled.fps,
  });
}

export const tapTileCaptureSuite: CaptureSuite<TapTileCaptureStillSpec, (typeof TAPTILE_VIDEO_SPECS)[number]> = {
  id: 'taptile-tray-match3.capture.v1',
  gameId: TAPTILE_TRAY_MATCH3_GAME_ID,
  stills: TAPTILE_STILL_SPECS,
  videos: TAPTILE_VIDEO_SPECS,
};

export const TAPTILE_VIDEO_SIZE = {
  width: tapTileCompositionProfile.videoResolution.width,
  height: tapTileCompositionProfile.videoResolution.height,
} as const;
