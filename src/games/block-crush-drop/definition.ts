import type { GameDefinition } from '../../game-runtime/contracts';
import { blockCrushDropManifest } from './manifest';
import { crushWoodRuntime } from './runtime';
import { crushWoodSchemas } from './schemas';
import type { CrushWoodAction, CrushWoodConfig, CrushWoodResolution, CrushWoodState } from './types';

export const blockCrushDropDefinition: GameDefinition<
  CrushWoodConfig,
  CrushWoodState,
  CrushWoodAction,
  CrushWoodResolution
> = {
  manifest: blockCrushDropManifest,
  schemas: crushWoodSchemas,
  runtime: crushWoodRuntime,
};
