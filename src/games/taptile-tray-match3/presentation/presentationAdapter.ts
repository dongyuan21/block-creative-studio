import type { CompiledFrameSource, PresentationCompilerAdapter } from '../../../game-runtime/frameSource';
import type { GameProjectEnvelope } from '../../../game-runtime/projectEnvelope';
import {
  PRESENTATION_PACKET_CONTRACT,
  PRESENTATION_PACKET_CONTRACT_VERSION,
  presentationHashIdentity,
  type PresentationPacket,
  type SemanticGameEvent,
} from '../../../game-runtime/presentationPacket';
import type { GameReplayEnvelope } from '../../../game-runtime/replayEnvelope';
import { stableHash } from '../../../headless/stableHash';
import { compileTapTileTake, evaluateTapTileFrame } from '../director';
import type { CompiledDirectorEvent, TapTilePresentationFrame } from '../director';
import { compileTapTileLevel, createInitialTapTileGameState, tapTileStateHash } from '../gameplay';
import { tapTileTakeFromReplayEnvelope } from '../gameplay/take/envelope';
import {
  TAPTILE_TRAY_MATCH3_GAME_ID,
  TAPTILE_TRAY_MATCH3_MODULE_VERSION,
} from '../manifest';
import { parseTapTileConfig, tapTileProjectFromConfig } from '../project/config';
import { DEFAULT_DIRECTOR_PROFILES } from '../project/migrateV1';
import type { TapTileDirectorProfile } from '../project';

export const TAPTILE_PRESENTATION_SCHEMA_ID = 'bcs.taptile-tray-match3.presentation-frame.v1';

function eventCategory(type: string): SemanticGameEvent['category'] {
  if (type === 'tap.accepted') return 'commit';
  if (type === 'tap.rejected') return 'interaction';
  if (type === 'match.resolved') return 'resolve';
  if (type === 'tray.warning') return 'detect';
  if (type === 'game.won' || type === 'game.lost') return 'outcome';
  return 'reconfigure';
}

function eventsFromDirector(
  compiledEvents: readonly CompiledDirectorEvent[],
  frame: TapTilePresentationFrame,
): SemanticGameEvent[] {
  const active = new Set(frame.activeEventIds);
  return compiledEvents
    .filter((item) => active.has(item.id) || (item.frame <= frame.frameNumber && frame.frameNumber < item.endFrame))
    .map((item) => ({
      id: item.id,
      type: `taptile.${item.event.type}`,
      category: eventCategory(item.event.type),
      tags: [item.event.type.split('.')[0] ?? 'taptile'],
      entityIds: 'tileId' in item.event && typeof item.event.tileId === 'string'
        ? [item.event.tileId]
        : 'tileIds' in item.event && Array.isArray(item.event.tileIds)
          ? [...item.event.tileIds]
          : [],
      payload: item.event,
    }));
}

export function tapTilePacketFromFrame(input: {
  takeId: string;
  frame: TapTilePresentationFrame;
  events: readonly CompiledDirectorEvent[];
  stateHash: string;
  fps: number;
}): PresentationPacket {
  const semanticEvents = eventsFromDirector(input.events, input.frame);
  const cameraPunch = Math.hypot(input.frame.camera.xPx, input.frame.camera.yPx);
  const identityBody = presentationHashIdentity({
    frameIndex: input.frame.frameNumber,
    fps: input.fps,
    totalFrames: input.frame.totalFrames,
    payload: input.frame,
    semanticEvents,
    cameraPunch,
  });
  return {
    contract: PRESENTATION_PACKET_CONTRACT,
    contractVersion: PRESENTATION_PACKET_CONTRACT_VERSION,
    identity: {
      gameId: TAPTILE_TRAY_MATCH3_GAME_ID,
      moduleVersion: TAPTILE_TRAY_MATCH3_MODULE_VERSION,
      takeId: input.takeId,
      frameIndex: input.frame.frameNumber,
      fps: input.fps,
      totalFrames: input.frame.totalFrames,
      stateHash: input.stateHash,
      presentationHash: stableHash(identityBody),
    },
    semanticEvents,
    feedback: {
      cameraPunch,
      screenShake: { x: input.frame.camera.xPx, y: input.frame.camera.yPx },
    },
    payloadSchemaId: TAPTILE_PRESENTATION_SCHEMA_ID,
    payload: input.frame,
  };
}

export function tapTileFrameFromPacket(packet: PresentationPacket): TapTilePresentationFrame {
  if (packet.payloadSchemaId !== TAPTILE_PRESENTATION_SCHEMA_ID) {
    throw new Error(`Unsupported presentation schema ${packet.payloadSchemaId}`);
  }
  return packet.payload as TapTilePresentationFrame;
}

function directorProfileFromInput(directorProfile: unknown): TapTileDirectorProfile {
  if (directorProfile && typeof directorProfile === 'object' && 'timing' in directorProfile) {
    return directorProfile as TapTileDirectorProfile;
  }
  return DEFAULT_DIRECTOR_PROFILES['human-natural']!;
}

export function compileTapTileFrameSource(input: {
  project: GameProjectEnvelope;
  replay: GameReplayEnvelope;
  directorProfile: unknown;
  fps: number;
}): CompiledFrameSource {
  const config = parseTapTileConfig(input.project.config.data);
  const project = tapTileProjectFromConfig(config, { id: input.replay.takeId, name: input.replay.takeId });
  const level = compileTapTileLevel(project);
  const take = tapTileTakeFromReplayEnvelope(input.replay, {
    levelHash: level.levelHash,
    finalStateHash: tapTileStateHash(createInitialTapTileGameState(level)),
  });
  const compiled = compileTapTileTake(level, take, directorProfileFromInput(input.directorProfile), {
    seed: input.replay.seed,
    fps: input.fps,
  });
  const frameSourceHash = stableHash({
    gameId: TAPTILE_TRAY_MATCH3_GAME_ID,
    takeId: input.replay.takeId,
    fps: compiled.fps,
    totalFrames: compiled.totalFrames,
    seed: compiled.seed,
    initialStateHash: tapTileStateHash(compiled.initialState),
    finalStateHash: compiled.finalStateHash,
    actions: compiled.actions.map((item) => ({
      id: item.actionId,
      startFrame: item.timing.actionStartFrame,
      endFrame: item.timing.actionVisualEndFrame,
    })),
  });
  return {
    gameId: TAPTILE_TRAY_MATCH3_GAME_ID,
    takeId: input.replay.takeId,
    fps: compiled.fps,
    totalFrames: compiled.totalFrames,
    frameSourceHash,
    evaluate(frameIndex) {
      const frame = evaluateTapTileFrame(compiled, frameIndex);
      return tapTilePacketFromFrame({
        takeId: input.replay.takeId,
        frame,
        events: compiled.events,
        stateHash: tapTileStateHash(frame.gameState),
        fps: compiled.fps,
      });
    },
  };
}

export const tapTilePresentationAdapter: PresentationCompilerAdapter = {
  gameId: TAPTILE_TRAY_MATCH3_GAME_ID,
  compile(input: {
    project: GameProjectEnvelope;
    replay: GameReplayEnvelope;
    directorProfile: unknown;
    fps: number;
  }) {
    return compileTapTileFrameSource(input);
  },
};
