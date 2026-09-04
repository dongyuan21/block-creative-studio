import type { RuntimeSchema } from '../../game-runtime/contracts';
import { GameSchemaError } from '../../game-runtime/errors';
import { compileTapTileLevel, type TapTileGameState } from './gameplay';
import {
  parseTapTileConfig,
  tapTileProjectFromConfig,
  type TapTileConfig,
} from './project/config';
import { TapTileProjectValidationError } from './project';
import type { TapTileRuntimeAction, TapTileRuntimeState } from './types';
import {
  TAPTILE_ACTION_SCHEMA_ID,
  TAPTILE_CONFIG_SCHEMA_ID,
  TAPTILE_STATE_SCHEMA_ID,
  TAPTILE_TRAY_MATCH3_SCHEMA_VERSION,
} from './manifest';

function fail(path: string, detail: string, code = 'INVALID_VALUE'): never {
  throw new GameSchemaError(code, `${path}: ${detail}`, { path });
}

function object(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'must be an object');
  return value as Record<string, unknown>;
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) fail(path, 'must be a non-empty string');
  return value;
}

function integer(value: unknown, path: string, minimum = 0): number {
  if (!Number.isInteger(value) || (value as number) < minimum) fail(path, `must be an integer >= ${minimum}`);
  return value as number;
}

function stringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) fail(path, 'must be a string array');
  return [...value] as string[];
}

function blockerCounts(value: unknown, path: string): Record<string, number> {
  const source = object(value, path);
  return Object.fromEntries(Object.entries(source).map(([id, count]) => [
    id,
    integer(count, `${path}.${id}`, 0),
  ]));
}

function parseGameState(value: unknown): TapTileGameState {
  const source = object(value, 'state.game');
  const status = string(source.status, 'state.game.status');
  if (!['playing', 'won', 'lost'].includes(status)) {
    fail('state.game.status', 'must be playing, won, or lost');
  }
  return {
    status: status as TapTileGameState['status'],
    turn: integer(source.turn, 'state.game.turn', 0),
    boardIds: stringArray(source.boardIds, 'state.game.boardIds'),
    trayIds: stringArray(source.trayIds, 'state.game.trayIds'),
    clearedIds: stringArray(source.clearedIds, 'state.game.clearedIds'),
    activeBlockerCount: blockerCounts(source.activeBlockerCount, 'state.game.activeBlockerCount'),
  };
}

function compileConfig(config: TapTileConfig) {
  const project = tapTileProjectFromConfig(config, { id: 'runtime', name: 'runtime' });
  const level = compileTapTileLevel(project);
  const errors = level.validation.issues.filter((issue) => issue.severity === 'error');
  if (errors.length > 0) {
    fail('config', errors.map((issue) => `${issue.code}: ${issue.message}`).join('; '));
  }
  return level;
}

function parseConfig(value: unknown): TapTileConfig {
  try {
    return parseTapTileConfig(value);
  } catch (error) {
    if (error instanceof TapTileProjectValidationError || error instanceof GameSchemaError) {
      throw new GameSchemaError('INVALID_VALUE', error.message, { path: 'config' });
    }
    throw error;
  }
}

export const tapTileConfigSchema: RuntimeSchema<TapTileConfig> = {
  id: TAPTILE_CONFIG_SCHEMA_ID,
  version: TAPTILE_TRAY_MATCH3_SCHEMA_VERSION,
  parse: parseConfig,
  serialize: (value) => structuredClone(value),
};

export const tapTileRuntimeStateSchema: RuntimeSchema<TapTileRuntimeState> = {
  id: TAPTILE_STATE_SCHEMA_ID,
  version: TAPTILE_TRAY_MATCH3_SCHEMA_VERSION,
  parse(value) {
    const source = object(value, 'state');
    const config = parseConfig(source.config ?? source.project);
    const level = compileConfig(config);
    return {
      seed: integer(source.seed ?? 1, 'state.seed', 0),
      config,
      level,
      game: parseGameState(source.game),
    };
  },
  serialize(value) {
    return {
      seed: value.seed,
      config: structuredClone(value.config),
      game: structuredClone(value.game),
    };
  },
};

export const tapTileRuntimeActionSchema: RuntimeSchema<TapTileRuntimeAction> = {
  id: TAPTILE_ACTION_SCHEMA_ID,
  version: TAPTILE_TRAY_MATCH3_SCHEMA_VERSION,
  parse(value) {
    const source = object(value, 'action');
    return { tileId: string(source.tileId, 'action.tileId') };
  },
  serialize: (value) => ({ tileId: value.tileId }),
};

export const tapTileTrayMatch3Schemas = {
  config: tapTileConfigSchema,
  state: tapTileRuntimeStateSchema,
  action: tapTileRuntimeActionSchema,
};
