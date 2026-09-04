import type {
  AssetManifest,
  TapTileAuthoringSettings,
  TapTileDirectorProjectSpec,
  TapTileLevelSpec,
  TapTileProductionSpec,
  TapTileProjectV2,
  TapTileRenderSpec,
  TapTileRuleProfileId,
  TapTileStageSpec,
  TapTileTake,
  TileVisualLibrary,
} from './types';
import { TAPTILE_PROJECT_FORMAT, TAPTILE_SCHEMA_VERSION } from './types';
import { isTapTileProjectV2, parseTapTileProjectV2 } from './validation';
import { migrateTapTileStackProjectV1 } from './migrateV1';
import { isStackProject } from '../stackModel';

export interface TapTileConfig {
  ruleProfileId: TapTileRuleProfileId;
  stage: TapTileStageSpec;
  assets: AssetManifest;
  visuals: TileVisualLibrary;
  level: TapTileLevelSpec;
  director: TapTileDirectorProjectSpec;
  render: TapTileRenderSpec;
  authoring: TapTileAuthoringSettings;
  production: TapTileProductionSpec;
}

export function tapTileConfigFromProject(project: TapTileProjectV2): TapTileConfig {
  return {
    ruleProfileId: project.ruleProfileId,
    stage: structuredClone(project.stage),
    assets: structuredClone(project.assets),
    visuals: structuredClone(project.visuals),
    level: structuredClone(project.level),
    director: structuredClone(project.director),
    render: structuredClone(project.render),
    authoring: structuredClone(project.authoring),
    production: structuredClone(project.production),
  };
}

export function tapTileProjectFromConfig(
  config: TapTileConfig,
  extras: {
    id: string;
    name: string;
    takes?: TapTileTake[];
    selectedTakeId?: string;
    revision?: number;
    createdAt?: string;
    updatedAt?: string;
  },
): TapTileProjectV2 {
  const createdAt = extras.createdAt ?? '1970-01-01T00:00:00.000Z';
  return {
    format: TAPTILE_PROJECT_FORMAT,
    schemaVersion: TAPTILE_SCHEMA_VERSION,
    id: extras.id,
    name: extras.name,
    revision: extras.revision ?? 1,
    createdAt,
    updatedAt: extras.updatedAt ?? createdAt,
    ruleProfileId: config.ruleProfileId,
    stage: structuredClone(config.stage),
    assets: structuredClone(config.assets),
    visuals: structuredClone(config.visuals),
    level: structuredClone(config.level),
    takes: extras.takes ? extras.takes.map((take) => structuredClone(take)) : [],
    ...(extras.selectedTakeId ? { selectedTakeId: extras.selectedTakeId } : {}),
    director: structuredClone(config.director),
    render: structuredClone(config.render),
    authoring: structuredClone(config.authoring),
    production: structuredClone(config.production),
  };
}

export function parseTapTileConfig(value: unknown): TapTileConfig {
  if (isTapTileProjectV2(value)) {
    return tapTileConfigFromProject(parseTapTileProjectV2(value));
  }
  if (isStackProject(value)) {
    return tapTileConfigFromProject(migrateTapTileStackProjectV1(value));
  }
  const source = value as Record<string, unknown> | null;
  if (source && typeof source === 'object' && !Array.isArray(source) && source.format === undefined) {
    return tapTileConfigFromProject(parseTapTileProjectV2({
      format: TAPTILE_PROJECT_FORMAT,
      schemaVersion: TAPTILE_SCHEMA_VERSION,
      id: typeof source.id === 'string' ? source.id : 'taptile-config',
      name: typeof source.name === 'string' ? source.name : 'TapTile Config',
      revision: typeof source.revision === 'number' ? source.revision : 1,
      createdAt: typeof source.createdAt === 'string' ? source.createdAt : '1970-01-01T00:00:00.000Z',
      updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : '1970-01-01T00:00:00.000Z',
      takes: [],
      ...source,
    }));
  }
  return tapTileConfigFromProject(parseTapTileProjectV2(value));
}
