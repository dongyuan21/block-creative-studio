import {
  GAME_PROJECT_CONTRACT,
  GAME_PROJECT_CONTRACT_VERSION,
  STUDIO_PROJECT_V2_FORMAT,
  STUDIO_PROJECT_V2_VERSION,
  type StudioProjectDocumentV2,
} from '../../game-runtime/projectEnvelope';
import {
  GAME_REPLAY_CONTRACT,
  GAME_REPLAY_CONTRACT_VERSION,
  type GameReplayEnvelope,
} from '../../game-runtime/replayEnvelope';
import type { CompiledFrameSource } from '../../game-runtime/frameSource';
import { createCrushWoodReferenceConfig, CRUSH_WOOD_REFERENCE_ACTIONS } from './levels';
import {
  BLOCK_CRUSH_DROP_GAME_ID,
  BLOCK_CRUSH_DROP_MODULE_VERSION,
  BLOCK_CRUSH_DROP_RULESET_ID,
} from './manifest';
import {
  compileCrushWoodActionTracks,
  crushWoodPresentationAdapter,
  DEFAULT_CRUSH_WOOD_DIRECTOR_PROFILE,
} from './presentation';
import { crushWoodRuntime, hashCrushWoodState } from './runtime';
import {
  CRUSH_WOOD_ACTION_SCHEMA_ID,
  CRUSH_WOOD_CONFIG_SCHEMA_ID,
  CRUSH_WOOD_STATE_SCHEMA_ID,
} from './schemas';
import type { CrushWoodConfig, CrushWoodDirectorProfile, CrushWoodSkinId } from './types';

export const CRUSH_WOOD_REFERENCE_TAKE_ID = 'reference-serpentine-clear';

export function createCrushWoodReferenceReplay(
  initialStateHash: string,
  seed = 29_980,
): GameReplayEnvelope {
  return {
    contract: GAME_REPLAY_CONTRACT,
    contractVersion: GAME_REPLAY_CONTRACT_VERSION,
    gameId: BLOCK_CRUSH_DROP_GAME_ID,
    moduleVersion: BLOCK_CRUSH_DROP_MODULE_VERSION,
    takeId: CRUSH_WOOD_REFERENCE_TAKE_ID,
    initialStateHash,
    seed,
    actions: CRUSH_WOOD_REFERENCE_ACTIONS.map((action, index) => ({
      id: `drop-${index + 1}`,
      actor: 'agent' as const,
      schemaId: CRUSH_WOOD_ACTION_SCHEMA_ID,
      action: { ...action },
    })),
    interactions: CRUSH_WOOD_REFERENCE_ACTIONS.map((_, index) => ({
      id: `interaction-drop-${index + 1}`,
      modality: 'system' as const,
      startFrame: index * 74,
      endFrame: index * 74 + 1,
      committedActionId: `drop-${index + 1}`,
      metadata: { source: 'reference-video-reconstruction' },
    })),
  };
}

export interface CrushWoodDocumentOptions {
  name?: string;
  seed?: number;
  directorProfile?: CrushWoodDirectorProfile;
  quality?: 'preview' | 'standard' | 'cinematic';
  takes?: GameReplayEnvelope[];
  id?: string;
}

export function createCrushWoodDocument(
  config: CrushWoodConfig,
  options: CrushWoodDocumentOptions = {},
): StudioProjectDocumentV2 {
  const seed = options.seed ?? 29_980;
  const initialState = crushWoodRuntime.createInitialState(config, seed);
  const initialStateHash = hashCrushWoodState(initialState);
  const takes = (options.takes ?? [createCrushWoodReferenceReplay(initialStateHash, seed)])
    .map((take) => ({ ...take, initialStateHash }));
  return {
    format: STUDIO_PROJECT_V2_FORMAT,
    version: STUDIO_PROJECT_V2_VERSION,
    id: options.id ?? `crush-wood-${config.skinId}`,
    name: options.name ?? `Crush Wooood · ${config.skinId}`,
    game: {
      contract: GAME_PROJECT_CONTRACT,
      contractVersion: GAME_PROJECT_CONTRACT_VERSION,
      game: {
        id: BLOCK_CRUSH_DROP_GAME_ID,
        moduleVersion: BLOCK_CRUSH_DROP_MODULE_VERSION,
        rulesetId: BLOCK_CRUSH_DROP_RULESET_ID,
        rulesetVersion: BLOCK_CRUSH_DROP_MODULE_VERSION,
      },
      config: {
        schemaId: CRUSH_WOOD_CONFIG_SCHEMA_ID,
        data: config,
      },
      initialState: {
        schemaId: CRUSH_WOOD_STATE_SCHEMA_ID,
        data: initialState,
        stateHash: initialStateHash,
      },
    },
    production: {
      layoutProfileRef: { id: 'layout.crush-wood.vertical-9x16', version: '1.0.0', kind: 'ui-theme' },
      cameraProfileRef: { id: 'camera.crush-wood.reference-fixed', version: '1.0.0', kind: 'camera-profile' },
      lookPackRef: { id: `look.crush-wood.${config.skinId}`, version: '1.0.0', kind: 'look-pack' },
      output: { width: 1080, height: 1920, fps: 30, quality: options.quality ?? 'cinematic' },
    },
    takes,
    direction: {
      rhythm: { ...(options.directorProfile ?? DEFAULT_CRUSH_WOOD_DIRECTOR_PROFILE) },
      style: { skinId: config.skinId, camera: 'reference-fixed', fracture: 'wood-chips' },
    },
  };
}

export type CrushWoodReferenceDocumentOptions = CrushWoodDocumentOptions;

export function createCrushWoodReferenceDocument(
  skinId: CrushWoodSkinId = 'golden-embossed',
  options: CrushWoodReferenceDocumentOptions = {},
): StudioProjectDocumentV2 {
  return createCrushWoodDocument(createCrushWoodReferenceConfig(skinId), options);
}

export function compileCrushWoodReferenceFrameSource(
  skinId: CrushWoodSkinId = 'golden-embossed',
  directorProfile: CrushWoodDirectorProfile = DEFAULT_CRUSH_WOOD_DIRECTOR_PROFILE,
  fps = 30,
): CompiledFrameSource {
  return compileCrushWoodStudioSession(skinId, { directorProfile, fps }).frameSource;
}

export function compileCrushWoodStudioSession(
  skinId: CrushWoodSkinId = 'golden-embossed',
  options: CrushWoodReferenceDocumentOptions & { fps?: number } = {},
) {
  const fps = options.fps ?? 30;
  const directorProfile = options.directorProfile ?? DEFAULT_CRUSH_WOOD_DIRECTOR_PROFILE;
  const document = createCrushWoodReferenceDocument(skinId, { ...options, directorProfile });
  const replay = document.takes[0];
  if (!replay) throw new Error('Crush Wood reference document must contain one take.');
  const input = {
    project: document.game,
    replay,
    directorProfile,
    fps,
  };
  return {
    document,
    frameSource: crushWoodPresentationAdapter.compile(input),
    tracks: compileCrushWoodActionTracks(input),
  };
}

export function compileCrushWoodTake(
  document: StudioProjectDocumentV2,
  takeId: string | undefined,
  directorProfile: CrushWoodDirectorProfile = DEFAULT_CRUSH_WOOD_DIRECTOR_PROFILE,
  fps = 30,
) {
  const replay = (takeId ? document.takes.find((take) => take.takeId === takeId) : document.takes[0]) ?? document.takes[0];
  if (!replay) throw new Error('Crush Wood document has no take to compile.');
  const input = {
    project: document.game,
    replay,
    directorProfile,
    fps,
  };
  return {
    frameSource: crushWoodPresentationAdapter.compile(input),
    tracks: compileCrushWoodActionTracks(input),
    replay,
  };
}
