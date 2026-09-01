import { makeAgentTake } from '../domain/gameEngine';
import type { GameSnapshot, Take } from '../domain/types';

/** Phase-1 deterministic machine player. It shares the same semantic action protocol as humans. */
export function createGreedyAgentTake(initial: GameSnapshot, maxMoves = 12): Take {
  return makeAgentTake(initial, maxMoves);
}
