import {
  completeAgentRun,
  createEmptyGameReplay,
  type GameAgentAdapter,
  type GameAgentRunRequest,
  type GameAgentRunStatus,
} from '../../game-runtime';
import { GameRuntimeError } from '../../game-runtime/errors';
import {
  solveTapTileTake,
  type TapTileScenarioProfileId,
} from '../../taptile/gameplay/solver';
import { TAPTILE_SCENARIO_PROFILES } from '../../taptile/gameplay/solver/scenarioProfiles';
import { createDefaultTapTileProject, parseTapTileProjectV2, type TapTileProjectV2 } from '../../taptile/project';
import { tapTileTrayMatch3Definition } from './definition';
import { TAPTILE_TRAY_MATCH3_GAME_ID, TAPTILE_TRAY_MATCH3_MODULE_VERSION } from './manifest';
import { tapTileTrayMatch3Runtime } from './runtime';
import { replayEnvelopeFromTapTileTake } from './takeEnvelope';

const TAPTILE_AGENT_PROFILES = TAPTILE_SCENARIO_PROFILES.map((profile) => profile.id);

function isTapTileProfile(value: string): value is TapTileScenarioProfileId {
  return (TAPTILE_AGENT_PROFILES as readonly string[]).includes(value);
}

function optionNumber(options: Record<string, unknown> | undefined, key: string): number | undefined {
  const value = options?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function terminalFromSolve(
  actionCount: number,
  solveStatus: string,
): Exclude<GameAgentRunStatus, 'failed'> {
  if (actionCount === 0) return 'empty';
  return solveStatus === 'solved' ? 'solved' : 'partial';
}

export const tapTileTrayMatch3Agent: GameAgentAdapter = {
  gameId: TAPTILE_TRAY_MATCH3_GAME_ID,
  profiles: TAPTILE_AGENT_PROFILES,
  defaultConfig: () => createDefaultTapTileProject('hourglass'),
  run(request: GameAgentRunRequest) {
    const profile = request.profile ?? 'safe-win';
    if (!isTapTileProfile(profile)) {
      throw new GameRuntimeError(
        'UNKNOWN_PROFILE',
        `TapTile agent profile ${profile} is not registered.`,
        { details: { profile, profiles: TAPTILE_AGENT_PROFILES } },
      );
    }

    let project: TapTileProjectV2;
    try {
      project = parseTapTileProjectV2(request.config ?? createDefaultTapTileProject('hourglass'));
    } catch (error) {
      const replay = createEmptyGameReplay({
        gameId: TAPTILE_TRAY_MATCH3_GAME_ID,
        moduleVersion: TAPTILE_TRAY_MATCH3_MODULE_VERSION,
        seed: request.seed,
        initialStateHash: 'invalid-config',
      });
      return completeAgentRun(
        tapTileTrayMatch3Definition,
        request.config ?? createDefaultTapTileProject('hourglass'),
        replay,
        'failed',
        { diagnostic: error instanceof Error ? error.message : 'Config failed to parse.' },
      );
    }

    const initial = tapTileTrayMatch3Runtime.createInitialState(project, request.seed);
    const initialStateHash = tapTileTrayMatch3Runtime.hashState(initial);
    const beamWidth = optionNumber(request.options, 'beamWidth');
    const maxExpandedStates = optionNumber(request.options, 'maxExpandedStates');
    const solved = solveTapTileTake(initial.level, {
      profile,
      seed: request.seed,
      ...(request.maxMoves !== undefined ? { maxDepth: request.maxMoves } : {}),
      ...(beamWidth !== undefined ? { beamWidth } : {}),
      ...(maxExpandedStates !== undefined ? { maxExpandedStates } : {}),
    });

    if (solved.status === 'invalid-level' || !solved.take) {
      const replay = createEmptyGameReplay({
        gameId: TAPTILE_TRAY_MATCH3_GAME_ID,
        moduleVersion: TAPTILE_TRAY_MATCH3_MODULE_VERSION,
        seed: request.seed,
        initialStateHash,
      });
      const extra: { metrics: Record<string, unknown>; diagnostic: string } = {
        diagnostic: solved.diagnostic ?? 'TapTile solver did not produce a Take.',
        metrics: {
          expandedStates: solved.expandedStates,
          ...(solved.terminationReason !== undefined ? { terminationReason: solved.terminationReason } : {}),
          solveStatus: solved.status,
        },
      };
      return completeAgentRun(
        tapTileTrayMatch3Definition,
        project,
        replay,
        solved.status === 'invalid-level' ? 'failed' : terminalFromSolve(0, solved.status),
        extra,
      );
    }

    const replay = replayEnvelopeFromTapTileTake(solved.take, initialStateHash, request.seed);
    return completeAgentRun(
      tapTileTrayMatch3Definition,
      project,
      replay,
      terminalFromSolve(replay.actions.length, solved.status),
      {
        ...(solved.diagnostic !== undefined ? { diagnostic: solved.diagnostic } : {}),
        metrics: {
          expandedStates: solved.expandedStates,
          ...(solved.terminationReason !== undefined ? { terminationReason: solved.terminationReason } : {}),
          solveStatus: solved.status,
          ...(solved.metrics ? { solveMetrics: solved.metrics } : {}),
        },
      },
    );
  },
};
