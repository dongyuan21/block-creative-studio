import type { GameDefinition } from '../../game-runtime/contracts';
import type { TapTileProjectV2 } from '../../taptile/project';
import { tapTileTrayMatch3Manifest } from './manifest';
import { tapTileTrayMatch3Runtime } from './runtime';
import { tapTileTrayMatch3Schemas } from './schemas';
import type {
  TapTileRuntimeAction,
  TapTileRuntimeResolution,
  TapTileRuntimeState,
} from './types';

export const tapTileTrayMatch3Definition: GameDefinition<
  TapTileProjectV2,
  TapTileRuntimeState,
  TapTileRuntimeAction,
  TapTileRuntimeResolution
> = {
  manifest: tapTileTrayMatch3Manifest,
  schemas: tapTileTrayMatch3Schemas,
  runtime: tapTileTrayMatch3Runtime,
};
