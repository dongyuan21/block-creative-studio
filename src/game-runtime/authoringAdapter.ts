import { GameRegistryError } from './errors';
import type { GameReplayEnvelope } from './replayEnvelope';
import type { StudioProjectDocumentV2 } from './projectEnvelope';

export interface GameCatalogOption {
  id: string;
  label: string;
  notes?: string;
}

export interface GameAuthoringCatalog {
  gameId: string;
  templates: readonly GameCatalogOption[];
  skins: readonly GameCatalogOption[];
}

export interface GameAuthoringScaffoldRequest {
  template?: string;
  skin?: string;
  seed: number;
  name?: string;
}

export interface GameAuthoringScaffoldResult {
  config: unknown;
  skinId: string;
  templateId: string;
  catalog: GameAuthoringCatalog;
  notes: readonly string[];
}

export interface GameAuthoringSkinResult {
  config: unknown;
  skinId: string;
  notes: readonly string[];
}

export interface GameAuthoringDocumentRequest {
  config: unknown;
  seed: number;
  takes?: readonly GameReplayEnvelope[];
  skin?: string;
  name?: string;
  quality?: 'preview' | 'standard' | 'cinematic';
}

export interface GameAuthoringAdapter {
  readonly gameId: string;
  catalog(): GameAuthoringCatalog;
  scaffold(request: GameAuthoringScaffoldRequest): GameAuthoringScaffoldResult;
  applySkin(config: unknown, skinId: string): GameAuthoringSkinResult;
  emitDocument(request: GameAuthoringDocumentRequest): StudioProjectDocumentV2;
}

export function requireCatalogOption(
  kind: 'template' | 'skin',
  value: string | undefined,
  options: readonly GameCatalogOption[],
  fallback: string,
): string {
  const selected = value ?? fallback;
  if (options.some((item) => item.id === selected)) return selected;
  throw new GameRegistryError(
    kind === 'template' ? 'UNKNOWN_TEMPLATE' : 'UNKNOWN_SKIN',
    `Unknown ${kind} ${selected}.`,
    { details: { selected, available: options.map((item) => item.id) } },
  );
}

export class GameAuthoringRegistry {
  private readonly adapters = new Map<string, GameAuthoringAdapter>();

  register(adapter: GameAuthoringAdapter): void {
    if (this.adapters.has(adapter.gameId)) {
      throw new GameRegistryError(
        'DUPLICATE_AUTHORING',
        `Authoring adapter for ${adapter.gameId} is already registered.`,
        { details: { gameId: adapter.gameId } },
      );
    }
    this.adapters.set(adapter.gameId, adapter);
  }

  get(gameId: string): GameAuthoringAdapter | undefined {
    return this.adapters.get(gameId);
  }

  require(gameId: string): GameAuthoringAdapter {
    const found = this.adapters.get(gameId);
    if (!found) {
      throw new GameRegistryError(
        'UNKNOWN_AUTHORING',
        `No authoring adapter is registered for ${gameId}.`,
        { details: { gameId } },
      );
    }
    return found;
  }

  has(gameId: string): boolean {
    return this.adapters.has(gameId);
  }

  list(): GameAuthoringCatalog[] {
    return [...this.adapters.values()].map((adapter) => adapter.catalog());
  }

  unregister(gameId: string): void {
    this.adapters.delete(gameId);
  }
}
