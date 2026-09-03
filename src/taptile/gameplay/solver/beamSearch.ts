import type { CompiledTapTileLevel } from '../../project';
import { applyTapAction, createInitialTapTileGameState, playableTapTileIds } from '../engine';
import { tapTileStateHash } from '../stateHash';
import type { TapTileAction, TapTileGameState } from '../types';
import { scoreSolverCandidate } from './scoring';
import { seededPathRank } from './seededOrder';
import type {
  SolveResult,
  SolveTapTileOptions,
  TapTileScenarioProfileId,
  TapTileSolveMetrics,
} from './types';

interface Candidate {
  state: TapTileGameState;
  actions: TapTileAction[];
  matchCount: number;
  unlockedCount: number;
  consecutiveMatches: number;
  maxConsecutiveMatches: number;
  sawWarning: boolean;
  recoveredAfterWarning: boolean;
  peakTrayOccupancy: number;
  score: number;
  tieBreak: number;
}

function clearableCountForTileIds(level: CompiledTapTileLevel, tileIds: readonly string[]): number {
  const counts = new Map<string, number>();
  for (const tileId of tileIds) {
    const matchKey = level.tiles[tileId]?.matchKey;
    if (!matchKey) continue;
    counts.set(matchKey, (counts.get(matchKey) ?? 0) + 1);
  }
  return [...counts.values()].reduce((total, count) => total + Math.floor(count / 3) * 3, 0);
}

export function theoreticalTapTileClearableCount(level: CompiledTapTileLevel): number {
  return clearableCountForTileIds(level, level.initialBoardIds);
}

function candidateClearUpperBound(level: CompiledTapTileLevel, candidate: Candidate): number {
  return candidate.state.clearedIds.length
    + clearableCountForTileIds(level, [...candidate.state.boardIds, ...candidate.state.trayIds]);
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

function maxClearBestOrder(left: Candidate, right: Candidate): number {
  const statusRank = (candidate: Candidate): number => candidate.state.status === 'won' ? 2 : candidate.state.status === 'playing' ? 1 : 0;
  return right.state.clearedIds.length - left.state.clearedIds.length
    || statusRank(right) - statusRank(left)
    || left.state.trayIds.length - right.state.trayIds.length
    || left.peakTrayOccupancy - right.peakTrayOccupancy
    || left.actions.length - right.actions.length
    || right.unlockedCount - left.unlockedCount
    || right.maxConsecutiveMatches - left.maxConsecutiveMatches
    || left.tieBreak - right.tieBreak
    || left.actions.map((action) => action.tileId).join('|').localeCompare(right.actions.map((action) => action.tileId).join('|'));
}

function metricsForCandidate(
  candidate: Candidate,
  theoreticalClearableTileCount: number,
): TapTileSolveMetrics {
  const clearedTileCount = candidate.state.clearedIds.length;
  return {
    clearedTileCount,
    theoreticalClearableTileCount,
    remainingBoardCount: candidate.state.boardIds.length,
    trayOccupancy: candidate.state.trayIds.length,
    peakTrayOccupancy: candidate.peakTrayOccupancy,
    matchCount: candidate.matchCount,
    unlockedCount: candidate.unlockedCount,
    provedMaximum: clearedTileCount >= theoreticalClearableTileCount,
  };
}

function resultForCandidate(
  candidate: Candidate,
  status: 'solved' | 'partial',
  expandedStates: number,
  theoreticalClearableTileCount: number,
  diagnostic: string,
): SolveResult {
  return {
    status,
    actions: candidate.actions,
    expandedStates,
    finalStateHash: tapTileStateHash(candidate.state),
    metrics: metricsForCandidate(candidate, theoreticalClearableTileCount),
    diagnostic,
  };
}

export function solveTapTileLevel(
  level: CompiledTapTileLevel,
  options: SolveTapTileOptions = {},
): SolveResult {
  const profile = options.profile ?? 'safe-win';
  const seed = options.seed ?? 1;
  const beamWidth = Math.max(1, Math.floor(options.beamWidth ?? 600));
  const maxDepth = Math.max(0, Math.floor(options.maxDepth ?? level.initialBoardIds.length));
  const requestedStateBudget = options.maxExpandedStates ?? 250_000;
  const maxExpandedStates = Number.isFinite(requestedStateBudget)
    ? Math.max(1, Math.floor(requestedStateBudget))
    : Number.MAX_SAFE_INTEGER;
  if (!level.validation.valid) {
    const first = level.validation.issues.find((issue) => issue.severity === 'error');
    return {
      status: 'invalid-level',
      expandedStates: 0,
      diagnostic: first ? `${first.code}: ${first.message}` : '关卡未通过编译校验。',
    };
  }

  const theoreticalClearableTileCount = theoreticalTapTileClearableCount(level);
  if (profile === 'max-clear' && theoreticalClearableTileCount === 0) {
    return {
      status: 'not-found',
      expandedStates: 0,
      diagnostic: '当前匹配数量无法组成任何三消。',
    };
  }
  const initialState = createInitialTapTileGameState(level);
  const initialCandidate: Candidate = {
    state: initialState,
    actions: [],
    matchCount: 0,
    unlockedCount: 0,
    consecutiveMatches: 0,
    maxConsecutiveMatches: 0,
    sawWarning: false,
    recoveredAfterWarning: false,
    peakTrayOccupancy: 0,
    score: 0,
    tieBreak: seededPathRank(seed, []),
  };
  let frontier: Candidate[] = [initialCandidate];
  const seen = new Map<string, number>([[scenarioStateKey(initialCandidate, profile), 0]]);
  let bestMaxClearCandidate = initialCandidate;
  let expandedStates = 0;
  let deepest = 0;
  let budgetExhausted = false;

  search:
  for (let depth = 0; depth < maxDepth; depth += 1) {
    const expanded: Candidate[] = [];
    for (const candidate of frontier) {
      if (profile === 'max-clear'
        && candidateClearUpperBound(level, candidate) < bestMaxClearCandidate.state.clearedIds.length) continue;
      const playableIds = [...playableTapTileIds(level, candidate.state)].sort((left, right) => left.localeCompare(right));
      for (const tileId of playableIds) {
        if (expandedStates >= maxExpandedStates) {
          budgetExhausted = true;
          break search;
        }
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
          peakTrayOccupancy: Math.max(candidate.peakTrayOccupancy, transition.trayAfterInsert.length),
          score: 0,
          tieBreak: seededPathRank(seed, actions.map((item) => item.tileId)),
        };
        next.score = scoreSolverCandidate(level, profile, { ...next, depth: depth + 1 });
        deepest = Math.max(deepest, depth + 1);

        if (profile === 'max-clear'
          && next.state.status !== 'lost'
          && maxClearBestOrder(next, bestMaxClearCandidate) < 0) {
          bestMaxClearCandidate = next;
        }

        if (isGoal(next, profile)) {
          const diagnostic = profile === 'danger-rescue'
            ? '已触发 6/7 警告、完成恢复并通关。'
            : profile === 'intentional-fail'
              ? '已生成第 7 格失败路径。'
              : profile === 'max-clear'
                ? `已消除全部 ${next.state.clearedIds.length} 张牌并通关。`
                : `已用 ${next.actions.length} 个语义动作达到目标。`;
          return resultForCandidate(next, 'solved', expandedStates, theoreticalClearableTileCount, diagnostic);
        }
        if (next.state.status !== 'playing') continue;
        const key = scenarioStateKey(next, profile);
        const previousPeak = seen.get(key);
        if (previousPeak !== undefined && (profile !== 'max-clear' || previousPeak <= next.peakTrayOccupancy)) continue;
        seen.set(key, next.peakTrayOccupancy);
        expanded.push(next);
      }
    }

    if (profile === 'max-clear'
      && theoreticalClearableTileCount > 0
      && bestMaxClearCandidate.state.clearedIds.length >= theoreticalClearableTileCount) {
      return resultForCandidate(
        bestMaxClearCandidate,
        'partial',
        expandedStates,
        theoreticalClearableTileCount,
        `已达到按匹配数量计算的理论上限：消除 ${theoreticalClearableTileCount}/${level.initialBoardIds.length} 张。`,
      );
    }

    if (profile === 'max-clear') {
      expanded.sort((left, right) => candidateClearUpperBound(level, right) - candidateClearUpperBound(level, left)
        || right.state.clearedIds.length - left.state.clearedIds.length
        || right.score - left.score
        || left.tieBreak - right.tieBreak
        || left.actions.map((action) => action.tileId).join('|').localeCompare(right.actions.map((action) => action.tileId).join('|')));
    } else {
      expanded.sort((left, right) => right.score - left.score
        || left.tieBreak - right.tieBreak
        || left.actions.map((action) => action.tileId).join('|').localeCompare(right.actions.map((action) => action.tileId).join('|')));
    }
    frontier = expanded.slice(0, beamWidth);
    if (frontier.length === 0) break;
  }

  if (profile === 'max-clear' && bestMaxClearCandidate.state.clearedIds.length > 0) {
    const metrics = metricsForCandidate(bestMaxClearCandidate, theoreticalClearableTileCount);
    const qualifier = metrics.provedMaximum ? '已达到理论上限' : budgetExhausted ? '状态预算已用完' : '搜索已结束';
    return resultForCandidate(
      bestMaxClearCandidate,
      'partial',
      expandedStates,
      theoreticalClearableTileCount,
      `${qualifier}；返回当前最佳安全轨迹，消除 ${metrics.clearedTileCount}/${level.initialBoardIds.length} 张（理论上限 ${theoreticalClearableTileCount}）。`,
    );
  }

  const budgetText = budgetExhausted ? `，已用完 ${maxExpandedStates} 个展开状态预算` : '';
  return {
    status: 'not-found',
    expandedStates,
    diagnostic: `Beam Search 在深度 ${deepest}/${maxDepth}、宽度 ${beamWidth} 内未找到目标${budgetText}；这不等于数学上无解。`,
  };
}
