import type { AnyGameDefinition } from './contracts';
import { GameRuntimeError, GameSchemaError } from './errors';
import type { GameReplayEnvelope } from './replayEnvelope';

export interface GameReplayValidationIssue {
  code: string;
  message: string;
  actionIndex?: number;
  actionId?: string;
  details?: unknown;
}

export interface GameReplayValidationResult {
  valid: boolean;
  issues: readonly GameReplayValidationIssue[];
  initialStateHash: string;
  finalStateHash: string;
  actionCount: number;
}

function issueMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function sameAction(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Replay every semantic action through the registered runtime. Illegal moves,
 * schema mismatches, and hash drift all become machine-readable issues — the
 * same proof TapTile already required of its native Take validator.
 */
export function validateGameReplay(
  definition: AnyGameDefinition,
  config: unknown,
  replay: GameReplayEnvelope,
): GameReplayValidationResult {
  const issues: GameReplayValidationIssue[] = [];
  const actionSchemaId = definition.schemas.action.id;
  const replayActionSchemaId = definition.schemas.replayAction?.id;

  if (replay.gameId !== definition.manifest.gameId) {
    issues.push({
      code: 'REPLAY_GAME_MISMATCH',
      message: `Take gameId ${replay.gameId} does not match ${definition.manifest.gameId}.`,
    });
  }
  if (replay.moduleVersion !== definition.manifest.moduleVersion) {
    issues.push({
      code: 'REPLAY_MODULE_MISMATCH',
      message: `Take moduleVersion ${replay.moduleVersion} does not match ${definition.manifest.moduleVersion}.`,
    });
  }

  let parsedConfig: unknown;
  try {
    parsedConfig = definition.schemas.config.parse(config);
  } catch (error) {
    issues.push({
      code: 'INVALID_CONFIG',
      message: issueMessage(error, 'Config failed to parse against the game schema.'),
      details: error instanceof GameSchemaError ? error.details : undefined,
    });
    return { valid: false, issues, initialStateHash: '', finalStateHash: '', actionCount: replay.actions.length };
  }

  let state: unknown;
  try {
    state = definition.runtime.createInitialState(parsedConfig, replay.seed);
  } catch (error) {
    issues.push({
      code: 'INITIAL_STATE_FAILED',
      message: issueMessage(error, 'Runtime could not create the initial state.'),
      details: error instanceof GameRuntimeError ? error.details : undefined,
    });
    return { valid: false, issues, initialStateHash: '', finalStateHash: '', actionCount: replay.actions.length };
  }

  const initialStateHash = definition.runtime.hashState(state);
  if (initialStateHash !== replay.initialStateHash) {
    issues.push({
      code: 'TAKE_INITIAL_HASH_MISMATCH',
      message: `Recorded initialStateHash is ${replay.initialStateHash}; replay produced ${initialStateHash}.`,
    });
  }

  for (const [index, envelope] of replay.actions.entries()) {
    if (envelope.schemaId !== actionSchemaId && envelope.schemaId !== replayActionSchemaId) {
      issues.push({
        code: 'ACTION_SCHEMA_MISMATCH',
        actionIndex: index,
        actionId: envelope.id,
        message: `Action schema ${envelope.schemaId} is not ${actionSchemaId}.`,
      });
    }

    let parsedAction: unknown;
    try {
      parsedAction = definition.schemas.action.parse(envelope.action);
    } catch (semanticError) {
      try {
        if (!definition.schemas.replayAction) throw semanticError;
        const full = definition.schemas.replayAction.parse(envelope.action) as {
          pieceId?: string;
          anchor?: { row: number; col: number };
        };
        parsedAction = definition.schemas.action.parse({
          pieceId: full.pieceId,
          anchor: full.anchor,
        });
      } catch (error) {
        issues.push({
          code: 'INVALID_ACTION',
          actionIndex: index,
          actionId: envelope.id,
          message: issueMessage(error, `Action ${index} failed to parse.`),
        });
        return {
          valid: false,
          issues,
          initialStateHash,
          finalStateHash: definition.runtime.hashState(state),
          actionCount: replay.actions.length,
        };
      }
    }

    const legal = definition.runtime.listLegalActions?.(state);
    if (legal && !legal.some((candidate) => sameAction(candidate, parsedAction))) {
      issues.push({
        code: 'ILLEGAL_ACTION',
        actionIndex: index,
        actionId: envelope.id,
        message: `Action ${index} (${envelope.id}) is not in the legal set for this state.`,
        details: { action: parsedAction },
      });
      return {
        valid: false,
        issues,
        initialStateHash,
        finalStateHash: definition.runtime.hashState(state),
        actionCount: replay.actions.length,
      };
    }

    try {
      const resolution = definition.runtime.resolve(state, parsedAction, {
        seed: replay.seed,
        stepIndex: index,
      });
      state = definition.runtime.stateAfter(resolution);
    } catch (error) {
      issues.push({
        code: error instanceof GameRuntimeError ? error.code : 'RESOLVE_FAILED',
        actionIndex: index,
        actionId: envelope.id,
        message: issueMessage(error, `Action ${index} was rejected by the official runtime.`),
        details: error instanceof GameRuntimeError ? error.details : undefined,
      });
      return {
        valid: false,
        issues,
        initialStateHash,
        finalStateHash: definition.runtime.hashState(state),
        actionCount: replay.actions.length,
      };
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    initialStateHash,
    finalStateHash: definition.runtime.hashState(state),
    actionCount: replay.actions.length,
  };
}
