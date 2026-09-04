import { GameSchemaError } from '../../../game-runtime/errors';
import {
  GAME_PROJECT_CONTRACT,
  GAME_PROJECT_CONTRACT_VERSION,
  STUDIO_PROJECT_V2_FORMAT,
  STUDIO_PROJECT_V2_VERSION,
  type ProjectMigrationReport,
  type StudioProjectDocumentV2,
} from '../../../game-runtime/projectEnvelope';
import { validateStudioProjectDocumentV2 } from '../../../game-runtime/projectDocument';
import { GameRegistry } from '../../../game-runtime/gameRegistry';
import { stableHash } from '../../../headless/stableHash';
import { tapTileTakeFromReplayEnvelope, tapTileTakeToReplayEnvelope } from '../gameplay/take/envelope';
import { tapTileTrayMatch3Definition } from '../definition';
import {
  TAPTILE_CONFIG_SCHEMA_ID,
  TAPTILE_STATE_SCHEMA_ID,
  TAPTILE_TRAY_MATCH3_GAME_ID,
  TAPTILE_TRAY_MATCH3_MODULE_VERSION,
  TAPTILE_TRAY_MATCH3_RULESET_ID,
  TAPTILE_TRAY_MATCH3_RULESET_VERSION,
} from '../manifest';
import {
  parseTapTileConfig,
  tapTileConfigFromProject,
  tapTileProjectFromConfig,
} from '../project/config';
import {
  isTapTileProjectV2,
  migrateTapTileStackProjectV1,
  parseTapTileProjectV2,
  type TapTileProjectV2,
  type TapTileTake,
} from '../project';
import { tapTileRuntimeStateSchema } from '../schemas';
import { isStackProject } from '../stackModel';
import { hashTapTileRuntimeState, tapTileTrayMatch3Runtime } from '../runtime';

export const TAPTILE_DEFAULT_PRODUCTION = {
  layoutProfileRef: {
    id: 'layout.taptile-vertical',
    version: '1.0.0',
    kind: 'ui-theme' as const,
    contentHash: 'fnv1a32:taptile-layout-v1',
  },
  cameraProfileRef: {
    id: 'camera.fixed',
    version: '1.0.0',
    kind: 'camera-profile' as const,
    contentHash: 'fnv1a32:taptile-camera-v1',
  },
  lookPackRef: {
    id: 'look.taptile',
    version: '1.0.0',
    kind: 'look-pack' as const,
    contentHash: 'fnv1a32:taptile-look-v1',
  },
};

export function migrateTapTileProjectToStudioV2(project: TapTileProjectV2): StudioProjectDocumentV2 {
  const config = tapTileConfigFromProject(project);
  const seed = project.director.seed;
  const state = tapTileTrayMatch3Runtime.createInitialState(config, seed);
  const stateHash = hashTapTileRuntimeState(state);
  return {
    format: STUDIO_PROJECT_V2_FORMAT,
    version: STUDIO_PROJECT_V2_VERSION,
    id: project.id,
    name: project.name,
    game: {
      contract: GAME_PROJECT_CONTRACT,
      contractVersion: GAME_PROJECT_CONTRACT_VERSION,
      game: {
        id: TAPTILE_TRAY_MATCH3_GAME_ID,
        moduleVersion: TAPTILE_TRAY_MATCH3_MODULE_VERSION,
        rulesetId: TAPTILE_TRAY_MATCH3_RULESET_ID,
        rulesetVersion: TAPTILE_TRAY_MATCH3_RULESET_VERSION,
      },
      config: { schemaId: TAPTILE_CONFIG_SCHEMA_ID, data: config },
      initialState: {
        schemaId: TAPTILE_STATE_SCHEMA_ID,
        data: tapTileRuntimeStateSchema.serialize(state),
        stateHash,
      },
    },
    production: {
      ...TAPTILE_DEFAULT_PRODUCTION,
      output: {
        width: project.render.width,
        height: project.render.height,
        fps: project.render.fps,
        quality: project.render.quality,
      },
    },
    takes: project.takes.map((take) => tapTileTakeToReplayEnvelope({
      take,
      seed,
      initialStateHash: stateHash,
    })),
    direction: {
      rhythm: structuredClone(project.director.profiles[project.director.selectedProfileId] ?? project.director),
      style: {
        selectedProfileId: project.director.selectedProfileId,
        actionOverrides: structuredClone(project.director.actionOverrides),
        selectedTakeId: project.selectedTakeId,
        revision: project.revision,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    },
  };
}

export function tapTileProjectFromStudioV2(document: StudioProjectDocumentV2): TapTileProjectV2 {
  if (document.game.game.id !== TAPTILE_TRAY_MATCH3_GAME_ID) {
    throw new GameSchemaError(
      'INVALID_VALUE',
      `Studio document game ${document.game.game.id} is not ${TAPTILE_TRAY_MATCH3_GAME_ID}.`,
      { path: '$.game.game.id' },
    );
  }
  const config = parseTapTileConfig(document.game.config.data);
  const state = tapTileRuntimeStateSchema.parse(document.game.initialState.data);
  const style = document.direction?.style as {
    selectedProfileId?: string;
    actionOverrides?: TapTileProjectV2['director']['actionOverrides'];
    selectedTakeId?: string;
    revision?: number;
    createdAt?: string;
    updatedAt?: string;
  } | undefined;
  const takes: TapTileTake[] = document.takes.map((replay) => tapTileTakeFromReplayEnvelope(replay, {
    levelHash: state.level.levelHash,
    finalStateHash: document.game.initialState.stateHash,
  }));
  if (style?.selectedProfileId) config.director.selectedProfileId = style.selectedProfileId;
  if (style?.actionOverrides) config.director.actionOverrides = structuredClone(style.actionOverrides);
  config.director.seed = document.takes[0]?.seed ?? state.seed;
  return tapTileProjectFromConfig(config, {
    id: document.id,
    name: document.name,
    takes,
    ...(style?.selectedTakeId ? { selectedTakeId: style.selectedTakeId } : {}),
    ...(style?.revision !== undefined ? { revision: style.revision } : {}),
    ...(style?.createdAt ? { createdAt: style.createdAt } : {}),
    ...(style?.updatedAt ? { updatedAt: style.updatedAt } : {}),
  });
}

export function reportTapTileMigration(
  source: { format: string; version: string; project: TapTileProjectV2 },
  document: StudioProjectDocumentV2,
): ProjectMigrationReport {
  const actionCount = document.takes.reduce((count, take) => count + take.actions.length, 0);
  const interactionCount = document.takes.reduce((count, take) => count + take.interactions.length, 0);
  return {
    sourceFormat: source.format,
    sourceVersion: source.version,
    sourceHash: stableHash(source.project),
    targetFormat: document.format,
    targetVersion: document.version,
    targetHash: stableHash(document),
    gameId: document.game.game.id,
    moduleVersion: document.game.game.moduleVersion,
    rulesetVersion: document.game.game.rulesetVersion,
    actionCount,
    interactionCount,
    warnings: [
      'TapTile Studio autosave still writes taptile-director-project.',
      'Production profile refs are the builtin layout.taptile-vertical / camera.fixed / look.taptile identities.',
    ],
  };
}

export function isTapTileStudioDocument(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const source = value as { format?: unknown; game?: { game?: { id?: unknown } } };
  return source.format === STUDIO_PROJECT_V2_FORMAT && source.game?.game?.id === TAPTILE_TRAY_MATCH3_GAME_ID;
}

function tapTileRegistry(): GameRegistry {
  const games = new GameRegistry();
  games.register(tapTileTrayMatch3Definition);
  return games;
}

export function parseTapTileIncomingProject(value: unknown): TapTileProjectV2 {
  if (isTapTileProjectV2(value)) return parseTapTileProjectV2(value);
  if (isStackProject(value)) return migrateTapTileStackProjectV1(value);
  if (isTapTileStudioDocument(value)) {
    return tapTileProjectFromStudioV2(validateStudioProjectDocumentV2(value, tapTileRegistry()));
  }
  throw new GameSchemaError('INVALID_VALUE', 'Not a TapTile stack, director, or studio project document.', {
    path: '$.format',
  });
}

export function migrateTapTileUnknownToStudioV2(value: unknown): {
  document: StudioProjectDocumentV2;
  report: ProjectMigrationReport;
  project: TapTileProjectV2;
} {
  if (isTapTileStudioDocument(value)) {
    const document = validateStudioProjectDocumentV2(value, tapTileRegistry());
    const project = tapTileProjectFromStudioV2(document);
    return {
      document,
      project,
      report: reportTapTileMigration(
        { format: STUDIO_PROJECT_V2_FORMAT, version: STUDIO_PROJECT_V2_VERSION, project },
        document,
      ),
    };
  }
  const project = isTapTileProjectV2(value)
    ? parseTapTileProjectV2(value)
    : isStackProject(value)
      ? migrateTapTileStackProjectV1(value)
      : (() => {
        throw new GameSchemaError('INVALID_VALUE', 'Not a TapTile project.', { path: '$.format' });
      })();
  const document = migrateTapTileProjectToStudioV2(project);
  const sourceFormat = isTapTileProjectV2(value) ? project.format : 'taptile-stack-studio';
  const sourceVersion = isTapTileProjectV2(value) ? project.schemaVersion : '1.0.0';
  return {
    document,
    project,
    report: reportTapTileMigration({ format: sourceFormat, version: sourceVersion, project }, document),
  };
}
