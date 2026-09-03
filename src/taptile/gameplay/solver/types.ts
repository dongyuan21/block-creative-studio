import type { TapTileTake } from '../../project';
import type { TapTileAction } from '../types';
import type { TapTileTakeValidationResult } from '../take';

export type TapTileScenarioProfileId =
  | 'max-clear'
  | 'safe-win'
  | 'danger-rescue'
  | 'combo-heavy'
  | 'fast-clear'
  | 'intentional-fail';

export interface TapTileScenarioProfile {
  id: TapTileScenarioProfileId;
  name: string;
  description: string;
}

export interface SolveTapTileOptions {
  profile?: TapTileScenarioProfileId;
  seed?: number;
  beamWidth?: number;
  maxDepth?: number;
  maxExpandedStates?: number;
}

export interface TapTileSolveMetrics {
  clearedTileCount: number;
  theoreticalClearableTileCount: number;
  remainingBoardCount: number;
  trayOccupancy: number;
  peakTrayOccupancy: number;
  matchCount: number;
  unlockedCount: number;
  provedMaximum: boolean;
}

export interface SolveResult {
  status: 'solved' | 'partial' | 'not-found' | 'invalid-level';
  actions?: TapTileAction[];
  expandedStates: number;
  finalStateHash?: string;
  metrics?: TapTileSolveMetrics;
  diagnostic?: string;
}

export interface SolveTakeResult extends SolveResult {
  take?: TapTileTake;
  validation?: TapTileTakeValidationResult;
}
