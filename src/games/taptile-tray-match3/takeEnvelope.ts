import { GameRuntimeError } from '../../game-runtime/errors';
import {
  GAME_REPLAY_CONTRACT,
  GAME_REPLAY_CONTRACT_VERSION,
  type GameReplayEnvelope,
} from '../../game-runtime/replayEnvelope';
import { applyTapAction, createInitialTapTileGameState } from '../../taptile/gameplay';
import { createTapTileTake } from '../../taptile/gameplay/take';
import type { CompiledTapTileLevel, TapTileTake, TapTileTakeAction } from '../../taptile/project';
import { TAPTILE_TRAY_MATCH3_GAME_ID, TAPTILE_TRAY_MATCH3_MODULE_VERSION } from './manifest';
import { TAPTILE_ACTION_SCHEMA_ID, tapTileRuntimeActionSchema } from './schemas';

export function replayEnvelopeFromTapTileTake(
  take: TapTileTake,
  initialStateHash: string,
  seed: number,
): GameReplayEnvelope {
  return {
    contract: GAME_REPLAY_CONTRACT,
    contractVersion: GAME_REPLAY_CONTRACT_VERSION,
    gameId: TAPTILE_TRAY_MATCH3_GAME_ID,
    moduleVersion: TAPTILE_TRAY_MATCH3_MODULE_VERSION,
    takeId: take.id,
    initialStateHash,
    seed,
    actions: take.actions.map((action) => ({
      id: action.id,
      actor: action.actor === 'human' ? 'human' : 'agent',
      schemaId: TAPTILE_ACTION_SCHEMA_ID,
      action: { tileId: action.tileId },
    })),
    interactions: take.actions.map((action) => ({
      id: `interaction-${action.id}`,
      modality: 'tap' as const,
      startFrame: action.startedAtFrame,
      endFrame: action.startedAtFrame + Math.max(1, action.durationFrames),
      committedActionId: action.id,
      ...(action.pointerPath ? { samples: action.pointerPath.map((point) => ({ ...point })) } : {}),
      metadata: { source: 'taptile-take' },
    })),
  };
}

export function tapTileTakeFromReplay(
  level: CompiledTapTileLevel,
  replay: GameReplayEnvelope,
): TapTileTake {
  let state = createInitialTapTileGameState(level);
  const actions: TapTileTakeAction[] = [];
  for (const [index, envelope] of replay.actions.entries()) {
    const parsed = tapTileRuntimeActionSchema.parse(envelope.action);
    const interaction = replay.interactions.find((item) => item.committedActionId === envelope.id);
    const action: TapTileTakeAction = {
      id: envelope.id,
      type: 'tap',
      actor: envelope.actor === 'human' ? 'human' : 'agent',
      tileId: parsed.tileId,
      startedAtFrame: interaction?.startFrame ?? index,
      durationFrames: Math.max(1, (interaction?.endFrame ?? index + 1) - (interaction?.startFrame ?? index)),
      ...(interaction?.samples ? { pointerPath: interaction.samples.map((point) => ({ ...point })) } : {}),
    };
    const transition = applyTapAction(level, state, {
      id: action.id,
      type: 'tap',
      actor: action.actor,
      tileId: action.tileId,
    });
    if (!transition.accepted) {
      throw new GameRuntimeError(
        'ILLEGAL_ACTION',
        `TapTile replay ${replay.takeId} action ${action.id} is not legal: ${transition.rejectReason ?? 'unknown'}.`,
        { details: { tileId: action.tileId, rejectReason: transition.rejectReason } },
      );
    }
    state = transition.after;
    actions.push(action);
  }
  return createTapTileTake(level, actions, state, {
    id: replay.takeId,
    name: replay.takeId,
    createdAt: '1970-01-01T00:00:00.000Z',
  });
}
