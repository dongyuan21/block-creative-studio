import type { GameDefinition } from '../../game-runtime/contracts';
import type { GameSnapshot, GameTransition, PlacementAction } from '../../domain/types';
import { blockPlacementLegacyRuntime } from './legacyRuntime';
import { blockPlacementManifest } from './manifest';
import { blockPlacementSchemas, type BlockPlacementConfig } from './schemas';

export const blockPlacementDefinition: GameDefinition<
  BlockPlacementConfig,
  GameSnapshot,
  PlacementAction,
  GameTransition
> = {
  manifest: blockPlacementManifest,
  schemas: blockPlacementSchemas,
  runtime: blockPlacementLegacyRuntime,
};
