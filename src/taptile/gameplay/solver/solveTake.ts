import { stableHash, type CompiledTapTileLevel, type TapTileTakeAction } from '../../project';
import { applyTapAction, createInitialTapTileGameState } from '../engine';
import { createTapTileTake, validateTapTileTake } from '../take';
import { solveTapTileLevel } from './beamSearch';
import type { SolveTakeResult, SolveTapTileOptions } from './types';

export function solveTapTileTake(
  level: CompiledTapTileLevel,
  options: SolveTapTileOptions = {},
): SolveTakeResult {
  const solved = solveTapTileLevel(level, options);
  if (solved.status !== 'solved' || !solved.actions) return solved;
  let state = createInitialTapTileGameState(level);
  for (const action of solved.actions) {
    const transition = applyTapAction(level, state, action);
    if (!transition.accepted) {
      return {
        status: 'not-found',
        expandedStates: solved.expandedStates,
        diagnostic: `Solver 内部重放在 ${action.tileId} 被正式引擎拒绝。`,
      };
    }
    state = transition.after;
  }
  const profile = options.profile ?? 'safe-win';
  const seed = options.seed ?? 1;
  const takeActions: TapTileTakeAction[] = solved.actions.map((action, index) => ({
    ...action,
    actor: 'agent',
    startedAtFrame: index * 2,
    durationFrames: 1,
  }));
  const identity = stableHash({ levelHash: level.levelHash, profile, seed, actions: takeActions.map((action) => action.tileId) }, 'agent-take');
  const take = createTapTileTake(level, takeActions, state, {
    id: identity,
    name: `Agent · ${profile} · seed ${seed}`,
    createdAt: '1970-01-01T00:00:00.000Z',
  });
  const validation = validateTapTileTake(level, take);
  if (!validation.valid) {
    return {
      status: 'not-found',
      expandedStates: solved.expandedStates,
      diagnostic: validation.issues[0]?.message ?? 'Agent Take 未通过正式引擎重放。',
      validation,
    };
  }
  return { ...solved, take, validation };
}
