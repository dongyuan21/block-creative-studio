import type { CompiledTapTileLevel, TapTileProjectV2 } from './project';
import type { TapTileConfig } from './project/config';
import type { TapTileGameState, TapTileTransition } from './gameplay';

export interface TapTileRuntimeAction {
  tileId: string;
}

export interface TapTileRuntimeState {
  seed: number;
  config: TapTileConfig;
  level: CompiledTapTileLevel;
  game: TapTileGameState;
}

export interface TapTileRuntimeResolution {
  seed: number;
  config: TapTileConfig;
  level: CompiledTapTileLevel;
  transition: TapTileTransition;
}

export type { TapTileProjectV2, TapTileConfig };
