import type { TapTileTake, TapTileTakeAction } from '../../project';
import {
  GAME_REPLAY_CONTRACT,
  GAME_REPLAY_CONTRACT_VERSION,
  type GameReplayEnvelope,
} from '../../../../game-runtime/replayEnvelope';
import {
  TAPTILE_ACTION_SCHEMA_ID,
  TAPTILE_TRAY_MATCH3_GAME_ID,
  TAPTILE_TRAY_MATCH3_MODULE_VERSION,
  TAPTILE_TRAY_MATCH3_RULESET_ID,
} from '../../manifest';

function replayActor(actor: TapTileTakeAction['actor']): 'human' | 'agent' {
  return actor === 'human' ? 'human' : 'agent';
}

export function tapTileTakeToReplayEnvelope(input: {
  take: TapTileTake;
  seed: number;
  initialStateHash: string;
}): GameReplayEnvelope {
  const { take, seed, initialStateHash } = input;
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
      actor: replayActor(action.actor),
      schemaId: TAPTILE_ACTION_SCHEMA_ID,
      action: { tileId: action.tileId },
    })),
    interactions: [
      {
        id: `take-meta-${take.id}`,
        modality: 'system',
        startFrame: 0,
        endFrame: 0,
        metadata: {
          name: take.name,
          createdAt: take.createdAt,
          levelHash: take.levelHash,
          result: take.result,
          finalStateHash: take.finalStateHash,
        },
      },
      ...take.actions.map((action) => ({
        id: `interaction-${action.id}`,
        modality: 'tap' as const,
        startFrame: action.startedAtFrame,
        endFrame: action.startedAtFrame + Math.max(1, action.durationFrames),
        committedActionId: action.id,
        ...(action.pointerPath ? { samples: action.pointerPath.map((sample) => ({ ...sample })) } : {}),
        metadata: { actor: action.actor, type: action.type },
      })),
    ],
  };
}

export function tapTileTakeFromReplayEnvelope(
  replay: GameReplayEnvelope,
  fallback: { levelHash: string; finalStateHash: string },
): TapTileTake {
  const meta = replay.interactions.find((item) => item.id === `take-meta-${replay.takeId}`)?.metadata ?? {};
  const actionsById = new Map(replay.actions.map((item) => [item.id, item]));
  const actionInteractions = replay.interactions.filter((item) => item.committedActionId && actionsById.has(item.committedActionId));
  return {
    id: replay.takeId,
    name: typeof meta.name === 'string' ? meta.name : replay.takeId,
    createdAt: typeof meta.createdAt === 'string' ? meta.createdAt : '1970-01-01T00:00:00.000Z',
    levelHash: typeof meta.levelHash === 'string' ? meta.levelHash : fallback.levelHash,
    ruleProfileId: TAPTILE_TRAY_MATCH3_RULESET_ID,
    actions: replay.actions.map((item) => {
      const interaction = actionInteractions.find((candidate) => candidate.committedActionId === item.id);
      const tileId = (item.action as { tileId?: unknown }).tileId;
      const actor = interaction?.metadata?.actor;
      return {
        id: item.id,
        type: 'tap' as const,
        actor: actor === 'human' || actor === 'agent' || actor === 'script' ? actor : item.actor,
        tileId: typeof tileId === 'string' ? tileId : '',
        startedAtFrame: interaction?.startFrame ?? 0,
        durationFrames: Math.max(1, (interaction?.endFrame ?? 1) - (interaction?.startFrame ?? 0)),
        ...(interaction?.samples ? { pointerPath: interaction.samples.map((sample) => ({ ...sample })) } : {}),
      };
    }),
    result: meta.result === 'won' || meta.result === 'lost' || meta.result === 'unfinished'
      ? meta.result
      : 'unfinished',
    finalStateHash: typeof meta.finalStateHash === 'string' ? meta.finalStateHash : fallback.finalStateHash,
  };
}
