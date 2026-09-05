import {
  GAME_PROJECT_CONTRACT,
  GAME_PROJECT_CONTRACT_VERSION,
  STUDIO_PROJECT_V2_FORMAT,
  STUDIO_PROJECT_V2_VERSION,
  type StudioProjectDocumentV2,
} from '../../game-runtime/projectEnvelope';
import type { GameReplayEnvelope } from '../../game-runtime/replayEnvelope';
import type { CompiledFrameSource } from '../../game-runtime/frameSource';
import {
  applyTapAction,
  compileTapTileLevel,
  createInitialTapTileGameState,
} from '../../taptile/gameplay';
import { createTapTileTake } from '../../taptile/gameplay/take';
import {
  createDefaultTapTileProject,
  DEFAULT_DIRECTOR_PROFILES,
  type TapTileDirectorProfile,
  type TapTileProjectV2,
  type TapTileTake,
  type TapTileTakeAction,
} from '../../taptile/project';
import {
  TAPTILE_TRAY_MATCH3_GAME_ID,
  TAPTILE_TRAY_MATCH3_MODULE_VERSION,
  TAPTILE_TRAY_MATCH3_RULESET_ID,
} from './manifest';
import { tapTilePresentationAdapter, resolveTapTileDirectorProfile } from './presentation';
import { tapTileTrayMatch3Runtime } from './runtime';
import {
  TAPTILE_ACTION_SCHEMA_ID,
  TAPTILE_CONFIG_SCHEMA_ID,
  TAPTILE_STATE_SCHEMA_ID,
  tapTileRuntimeStateSchema,
} from './schemas';
import { replayEnvelopeFromTapTileTake } from './takeEnvelope';

export const TAPTILE_REFERENCE_TAKE_ID = 'director-gate-take';

export const TAPTILE_GATE_TAP_IDS = [
  'hourglass-43',
  'hourglass-44',
  'hourglass-45',
  'hourglass-46',
  'hourglass-47',
  'hourglass-48',
] as const;

export function createTapTileGateTake(project: TapTileProjectV2): TapTileTake {
  const level = compileTapTileLevel(project);
  let state = createInitialTapTileGameState(level);
  const actions: TapTileTakeAction[] = [];
  for (const [index, tileId] of TAPTILE_GATE_TAP_IDS.entries()) {
    const action = { id: `director-${index}`, type: 'tap' as const, actor: 'script' as const, tileId };
    const transition = applyTapAction(level, state, action);
    if (!transition.accepted) {
      throw new Error(`TapTile gate take cannot tap ${tileId}: ${transition.rejectReason ?? 'unknown'}.`);
    }
    state = transition.after;
    actions.push({ ...action, startedAtFrame: index * 3, durationFrames: 1 });
  }
  return createTapTileTake(level, actions, state, {
    id: TAPTILE_REFERENCE_TAKE_ID,
    name: 'Director Gate fixture',
    createdAt: '1970-01-01T00:00:00.000Z',
  });
}

export interface TapTileDocumentOptions {
  name?: string;
  seed?: number;
  directorProfile?: TapTileDirectorProfile;
  quality?: 'preview' | 'standard' | 'cinematic';
  takes?: GameReplayEnvelope[];
  includeGateTake?: boolean;
  id?: string;
}

export function createTapTileDocument(
  project: TapTileProjectV2,
  options: TapTileDocumentOptions = {},
): StudioProjectDocumentV2 {
  const seed = options.seed ?? project.director.seed;
  const initialState = tapTileTrayMatch3Runtime.createInitialState(project, seed);
  const initialStateHash = tapTileTrayMatch3Runtime.hashState(initialState);
  const directorProfile = options.directorProfile
    ?? project.director.profiles[project.director.selectedProfileId]
    ?? DEFAULT_DIRECTOR_PROFILES['human-natural']!;
  const sourceTakes = options.takes ?? (
    project.takes.length > 0
      ? project.takes.map((take) => replayEnvelopeFromTapTileTake(take, initialStateHash, seed))
      : options.includeGateTake === false
        ? []
        : [replayEnvelopeFromTapTileTake(createTapTileGateTake(project), initialStateHash, seed)]
  );
  const takes = sourceTakes.map((take) => ({ ...take, initialStateHash }));
  return {
    format: STUDIO_PROJECT_V2_FORMAT,
    version: STUDIO_PROJECT_V2_VERSION,
    id: options.id ?? `taptile-${project.authoring.templateId}`,
    name: options.name ?? project.name,
    game: {
      contract: GAME_PROJECT_CONTRACT,
      contractVersion: GAME_PROJECT_CONTRACT_VERSION,
      game: {
        id: TAPTILE_TRAY_MATCH3_GAME_ID,
        moduleVersion: TAPTILE_TRAY_MATCH3_MODULE_VERSION,
        rulesetId: TAPTILE_TRAY_MATCH3_RULESET_ID,
        rulesetVersion: TAPTILE_TRAY_MATCH3_MODULE_VERSION,
      },
      config: {
        schemaId: TAPTILE_CONFIG_SCHEMA_ID,
        data: project,
      },
      initialState: {
        schemaId: TAPTILE_STATE_SCHEMA_ID,
        data: tapTileRuntimeStateSchema.serialize(initialState),
        stateHash: initialStateHash,
      },
    },
    production: {
      layoutProfileRef: { id: 'layout.taptile.vertical-9x16', version: '1.0.0', kind: 'ui-theme' },
      cameraProfileRef: { id: 'camera.taptile.reference-fixed', version: '1.0.0', kind: 'camera-profile' },
      lookPackRef: { id: `look.taptile.${project.visuals.selectedThemeId}`, version: '1.0.0', kind: 'look-pack' },
      output: { width: 1080, height: 1920, fps: 30, quality: options.quality ?? project.render.quality },
    },
    takes,
    direction: {
      rhythm: { ...directorProfile },
      style: {
        themeId: project.visuals.selectedThemeId,
        sceneTheme: project.authoring.sceneTheme,
        material: project.authoring.material,
      },
    },
  };
}

export function createTapTileReferenceDocument(
  templateId: TapTileProjectV2['authoring']['templateId'] = 'hourglass',
  options: TapTileDocumentOptions = {},
): StudioProjectDocumentV2 {
  return createTapTileDocument(createDefaultTapTileProject(templateId), options);
}

export function compileTapTileStudioSession(
  templateId: TapTileProjectV2['authoring']['templateId'] = 'hourglass',
  options: TapTileDocumentOptions & { fps?: number } = {},
) {
  const fps = options.fps ?? 30;
  const document = createTapTileReferenceDocument(templateId, options);
  const replay = document.takes[0];
  if (!replay) throw new Error('TapTile reference document must contain one take.');
  const directorProfile = resolveTapTileDirectorProfile(
    document.game.config.data as TapTileProjectV2,
    options.directorProfile ?? document.direction?.rhythm ?? {},
  );
  return {
    document,
    frameSource: tapTilePresentationAdapter.compile({
      project: document.game,
      replay,
      directorProfile,
      fps,
    }),
    replay,
  };
}

export function compileTapTileDocumentTake(
  document: StudioProjectDocumentV2,
  takeId: string | undefined,
  directorProfile: unknown = document.direction?.rhythm ?? {},
  fps = 30,
): { frameSource: CompiledFrameSource; replay: GameReplayEnvelope } {
  const replay = (takeId ? document.takes.find((take) => take.takeId === takeId) : document.takes[0]) ?? document.takes[0];
  if (!replay) throw new Error('TapTile document has no take to compile.');
  return {
    frameSource: tapTilePresentationAdapter.compile({
      project: document.game,
      replay,
      directorProfile,
      fps,
    }),
    replay,
  };
}

export { TAPTILE_ACTION_SCHEMA_ID };
