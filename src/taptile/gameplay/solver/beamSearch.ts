import type { CompiledTapTileLevel } from '../../project';
import { applyTapAction, createInitialTapTileGameState, playableTapTileIds } from '../engine';
import { tapTileStateHash } from '../stateHash';
import type { TapTileAction, TapTileGameState } from '../types';
import { scoreSolverCandidate } from './scoring';
import { seededPathRank } from './seededOrder';
import type { SolveResult, SolveTapTileOptions, TapTileScenarioProfileId } from './types';

interface Candidate {
  state: TapTileGameState;
  actions: TapTileAction[];
  matchCount: number;
  unlockedCount: number;
  consecutiveMatches: number;
  maxConsecutiveMatches: number;
  sawWarning: boolean;
  recoveredAfterWarning: boolean;
  score: number;
  tieBreak: number;
}

function isGoal(candidate: Candidate, profile: TapTileScenarioProfileId): boolean {
  if (profile === 'intentional-fail') return candidate.state.status === 'lost';
  if (candidate.state.status !== 'won') return false;
  if (profile === 'danger-rescue') return candidate.sawWarning && candidate.recoveredAfterWarning;
  return true;
}

function scenarioStateKey(candidate: Candidate, profile: TapTileScenarioProfileId): string {
  if (profile === 'danger-rescue') {
    return `${tapTileStateHash(candidate.state)}:${candidate.sawWarning ? 1 : 0}:${candidate.recoveredAfterWarning ? 1 : 0}`;
  }
  if (profile === 'combo-heavy') return `${tapTileStateHash(candidate.state)}:${candidate.consecutiveMatches}`;
  return tapTileStateHash(candidate.state);
}

export function solveTapTileLevel(
  level: CompiledTapTileLevel,
  options: SolveTapTileOptions = {},
): SolveResult {
  const profile = options.profile ?? 'safe-win';
  const seed = options.seed ?? 1;
  const beamWidth = Math.max(1, Math.floor(options.beamWidth ?? 600));
  const maxDepth = Math.max(0, Math.floor(options.maxDepth ?? level.initialBoardIds.length));
  if (!level.validation.valid) {
    const first = level.validation.issues.find((issue) => issue.severity === 'error');
    return {
      status: 'invalid-level',
      expandedStates: 0,
      diagnostic: first ? `${first.code}: ${first.message}` : '关卡未通过编译校验。',
    };
  }

  const initialState = createInitialTapTileGameState(level);
  let frontier: Candidate[] = [{
    state: initialState,
    actions: [],
    matchCount: 0,
    unlockedCount: 0,
    consecutiveMatches: 0,
    maxConsecutiveMatches: 0,
    sawWarning: false,
    recoveredAfterWarning: false,
    score: 0,
    tieBreak: seededPathRank(seed, []),
  }];
  const seen = new Set<string>([scenarioStateKey(frontier[0]!, profile)]);
  let expandedStates = 0;
  let deepest = 0;

  for (let depth = 0; depth < maxDepth; depth += 1) {
    const expanded: Candidate[] = [];
    for (const candidate of frontier) {
      const playableIds = [...playableTapTileIds(level, candidate.state)].sort((left, right) => left.localeCompare(right));
      for (const tileId of playableIds) {
        const action: TapTileAction = {
          id: `agent-${candidate.actions.length + 1}-${tileId}`,
          type: 'tap',
          actor: 'agent',
          tileId,
        };
        const transition = applyTapAction(level, candidate.state, action);
        expandedStates += 1;
        if (!transition.accepted) continue;
        const matched = transition.matchedTileIds.length > 0;
        const warnedNow = transition.events.some((event) => event.type === 'tray.warning');
        const sawWarning = candidate.sawWarning || warnedNow;
        const recoveredAfterWarning = candidate.recoveredAfterWarning
          || (candidate.sawWarning && matched && transition.after.trayIds.length < 6);
        const consecutiveMatches = matched ? candidate.consecutiveMatches + 1 : 0;
        const actions = [...candidate.actions, action];
        const next: Candidate = {
          state: transition.after,
          actions,
          matchCount: candidate.matchCount + (matched ? 1 : 0),
          unlockedCount: candidate.unlockedCount + transition.newlyUnlockedTileIds.length,
          consecutiveMatches,
          maxConsecutiveMatches: Math.max(candidate.maxConsecutiveMatches, consecutiveMatches),
          sawWarning,
          recoveredAfterWarning,
          score: 0,
          tieBreak: seededPathRank(seed, actions.map((item) => item.tileId)),
        };
        next.score = scoreSolverCandidate(level, profile, { ...next, depth: depth + 1 });
        if (isGoal(next, profile)) {
          return {
            status: 'solved',
            actions: next.actions,
            expandedStates,
            finalStateHash: tapTileStateHash(next.state),
            diagnostic: profile === 'danger-rescue'
              ? '已触发 6/7 警告、完成恢复并通关。'
              : profile === 'intentional-fail'
                ? '已生成第 7 格失败路径。'
                : `已用 ${next.actions.length} 个语义动作达到目标。`,
          };
        }
        if (next.state.status !== 'playing') continue;
        const key = scenarioStateKey(next, profile);
        if (seen.has(key)) continue;
        seen.add(key);
        expanded.push(next);
      }
    }
    deepest = depth + 1;
    expanded.sort((left, right) => right.score - left.score
      || left.tieBreak - right.tieBreak
      || left.actions.map((action) => action.tileId).join('|').localeCompare(right.actions.map((action) => action.tileId).join('|')));
    frontier = expanded.slice(0, beamWidth);
    if (frontier.length === 0) break;
  }

  return {
    status: 'not-found',
    expandedStates,
    diagnostic: `Beam Search 在深度 ${deepest}/${maxDepth}、宽度 ${beamWidth} 内未找到目标；这不等于数学上无解。`,
  };
}
