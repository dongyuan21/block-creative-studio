import type { AnyGameDefinition } from './contracts';
import { GameRegistryError } from './errors';
import type { GameReplayEnvelope } from './replayEnvelope';
import { validateGameReplay, type GameReplayValidationResult } from './replayValidation';

export interface GameAgentRunRequest {
  config?: unknown;
  seed: number;
  profile?: string;
  maxMoves?: number;
  options?: Record<string, unknown>;
}

export type GameAgentRunStatus = 'solved' | 'partial' | 'empty' | 'failed';

export interface GameAgentRunResult {
  replay: GameReplayEnvelope;
  validation: GameReplayValidationResult;
  status: GameAgentRunStatus;
  metrics?: Record<string, unknown>;
  diagnostic?: string;
}

export interface GameAgentAdapter {
  readonly gameId: string;
  readonly profiles: readonly string[];
  defaultConfig(): unknown;
  run(request: GameAgentRunRequest): GameAgentRunResult | Promise<GameAgentRunResult>;
}

export function completeAgentRun(
  definition: AnyGameDefinition,
  config: unknown,
  replay: GameReplayEnvelope,
  terminal: GameAgentRunStatus,
  extra: { metrics?: Record<string, unknown>; diagnostic?: string } = {},
): GameAgentRunResult {
  const validation = validateGameReplay(definition, config, replay);
  const result: GameAgentRunResult = {
    replay,
    validation,
    status: validation.valid ? terminal : 'failed',
  };
  if (extra.metrics !== undefined) result.metrics = extra.metrics;
  if (extra.diagnostic !== undefined) result.diagnostic = extra.diagnostic;
  else if (!validation.valid && validation.issues[0]?.message) {
    result.diagnostic = validation.issues[0].message;
  }
  return result;
}

export class GameAgentRegistry {
  private readonly adapters = new Map<string, GameAgentAdapter>();

  register(adapter: GameAgentAdapter): void {
    if (this.adapters.has(adapter.gameId)) {
      throw new GameRegistryError(
        'DUPLICATE_AGENT',
        `Agent adapter for ${adapter.gameId} is already registered.`,
        { details: { gameId: adapter.gameId } },
      );
    }
    this.adapters.set(adapter.gameId, adapter);
  }

  get(gameId: string): GameAgentAdapter | undefined {
    return this.adapters.get(gameId);
  }

  require(gameId: string): GameAgentAdapter {
    const found = this.adapters.get(gameId);
    if (!found) {
      throw new GameRegistryError(
        'UNKNOWN_AGENT',
        `No agent adapter is registered for ${gameId}.`,
        { details: { gameId } },
      );
    }
    return found;
  }

  has(gameId: string): boolean {
    return this.adapters.has(gameId);
  }

  list(): Array<{ gameId: string; profiles: readonly string[] }> {
    return [...this.adapters.values()].map((adapter) => ({
      gameId: adapter.gameId,
      profiles: adapter.profiles,
    }));
  }

  unregister(gameId: string): void {
    this.adapters.delete(gameId);
  }
}
