import type { GameDefinition } from '../../game-runtime/contracts';
import type { TapTileConfig } from './project/config';
import { tapTileTrayMatch3Manifest } from './manifest';
import { tapTileTrayMatch3Runtime } from './runtime';
import { tapTileTrayMatch3Schemas } from './schemas';
import type {
  TapTileRuntimeAction,
  TapTileRuntimeResolution,
  TapTileRuntimeState,
} from './types';

export const tapTileTrayMatch3Definition: GameDefinition<
  TapTileConfig,
  TapTileRuntimeState,
  TapTileRuntimeAction,
  TapTileRuntimeResolution
> = {
  manifest: tapTileTrayMatch3Manifest,
  schemas: tapTileTrayMatch3Schemas,
  runtime: tapTileTrayMatch3Runtime,
};
