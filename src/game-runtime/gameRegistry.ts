import type { AnyGameDefinition, GameDefinition, GameManifest } from './contracts';
import { GameRegistryError } from './errors';
import { SchemaRegistry } from './schemaRegistry';

export function gameKey(gameId: string, moduleVersion: string): string {
  return `${gameId}@${moduleVersion}`;
}

export class GameRegistry {
  readonly schemas: SchemaRegistry;
  private readonly games = new Map<string, AnyGameDefinition>();

  constructor(schemas = new SchemaRegistry()) {
    this.schemas = schemas;
  }

  register<Config, State, Action, Resolution>(
    definition: GameDefinition<Config, State, Action, Resolution>,
  ): void {
    const key = gameKey(definition.manifest.gameId, definition.manifest.moduleVersion);
    if (this.games.has(key)) {
      throw new GameRegistryError(
        'DUPLICATE_GAME',
        `Game ${key} is already registered.`,
        { details: { gameId: definition.manifest.gameId, moduleVersion: definition.manifest.moduleVersion } },
      );
    }
    this.schemas.register(definition.schemas.config);
    this.schemas.register(definition.schemas.state);
    this.schemas.register(definition.schemas.action);
    this.games.set(key, definition);
  }

  get<Config, State, Action, Resolution>(
    gameId: string,
    moduleVersion?: string,
  ): GameDefinition<Config, State, Action, Resolution> {
    if (moduleVersion !== undefined) {
      const found = this.games.get(gameKey(gameId, moduleVersion));
      if (!found) {
        throw new GameRegistryError(
          'UNKNOWN_GAME',
          `Game ${gameKey(gameId, moduleVersion)} is not registered.`,
          { details: { gameId, moduleVersion } },
        );
      }
      return found as GameDefinition<Config, State, Action, Resolution>;
    }

    const matches = [...this.games.values()].filter((item) => item.manifest.gameId === gameId);
    if (matches.length === 0) {
      throw new GameRegistryError('UNKNOWN_GAME', `Game ${gameId} is not registered.`, { details: { gameId } });
    }
    if (matches.length > 1) {
      throw new GameRegistryError(
        'AMBIGUOUS_GAME',
        `Game ${gameId} has multiple registered versions; pass moduleVersion.`,
        { details: { gameId, versions: matches.map((item) => item.manifest.moduleVersion) } },
      );
    }
    return matches[0] as GameDefinition<Config, State, Action, Resolution>;
  }

  has(gameId: string, moduleVersion?: string): boolean {
    if (moduleVersion !== undefined) return this.games.has(gameKey(gameId, moduleVersion));
    return [...this.games.values()].some((item) => item.manifest.gameId === gameId);
  }

  list(): GameManifest[] {
    return [...this.games.values()].map((item) => item.manifest);
  }
}
