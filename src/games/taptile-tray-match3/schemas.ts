import type { RuntimeSchema } from '../../game-runtime/contracts';
import {
  compileTapTileLevel,
  type TapTileGameState,
} from '../../taptile/gameplay';
import {
  parseTapTileProjectV2,
  type TapTileProjectV2,
} from '../../taptile/project';
import type { TapTileRuntimeAction, TapTileRuntimeState } from './types';

function object(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${path} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${path} must be a non-empty string.`);
  }
  return value;
}

function integer(value: unknown, path: string, minimum = 0): number {
  if (!Number.isInteger(value) || (value as number) < minimum) {
    throw new Error(`${path} must be an integer >= ${minimum}.`);
  }
  return value as number;
}

function stringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${path} must be a string array.`);
  }
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
    throw new Error('state.game.status must be playing, won, or lost.');
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

export const TAPTILE_CONFIG_SCHEMA_ID = 'taptile-tray-match3.project' as const;
export const TAPTILE_STATE_SCHEMA_ID = 'taptile-tray-match3.state' as const;
export const TAPTILE_ACTION_SCHEMA_ID = 'taptile-tray-match3.action' as const;

export const tapTileProjectSchema: RuntimeSchema<TapTileProjectV2> = {
  id: TAPTILE_CONFIG_SCHEMA_ID,
  version: '2.0.0',
  parse: parseTapTileProjectV2,
  serialize: (value) => structuredClone(value),
};

export const tapTileRuntimeStateSchema: RuntimeSchema<TapTileRuntimeState> = {
  id: TAPTILE_STATE_SCHEMA_ID,
  version: '1.0.0',
  parse(value) {
    const source = object(value, 'state');
    const project = parseTapTileProjectV2(source.project);
    const level = compileTapTileLevel(project);
    if (!level.validation.valid) {
      throw new Error(`state.project cannot compile: ${level.validation.issues
        .filter((issue) => issue.severity === 'error')
        .map((issue) => `${issue.code}: ${issue.message}`)
        .join('; ')}`);
    }
    return { project, level, game: parseGameState(source.game) };
  },
  serialize(value) {
    return {
      project: structuredClone(value.project),
      game: structuredClone(value.game),
    };
  },
};

export const tapTileRuntimeActionSchema: RuntimeSchema<TapTileRuntimeAction> = {
  id: TAPTILE_ACTION_SCHEMA_ID,
  version: '1.0.0',
  parse(value) {
    const source = object(value, 'action');
    return { tileId: string(source.tileId, 'action.tileId') };
  },
  serialize: (value) => ({ tileId: value.tileId }),
};

export const tapTileTrayMatch3Schemas = {
  config: tapTileProjectSchema,
  state: tapTileRuntimeStateSchema,
  action: tapTileRuntimeActionSchema,
};
