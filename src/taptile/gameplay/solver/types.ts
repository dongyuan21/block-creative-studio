import type { TapTileTake } from '../../project';
import type { TapTileAction } from '../types';
import type { TapTileTakeValidationResult } from '../take';

export type TapTileScenarioProfileId =
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
}

export interface SolveResult {
  status: 'solved' | 'not-found' | 'invalid-level';
  actions?: TapTileAction[];
  expandedStates: number;
  finalStateHash?: string;
  diagnostic?: string;
}

export interface SolveTakeResult extends SolveResult {
  take?: TapTileTake;
  validation?: TapTileTakeValidationResult;
}
