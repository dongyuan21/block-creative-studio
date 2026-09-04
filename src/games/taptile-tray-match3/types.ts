import type { CompiledTapTileLevel, TapTileProjectV2 } from '../../taptile/project';
import type { TapTileGameState, TapTileTransition } from '../../taptile/gameplay';

export interface TapTileRuntimeAction {
  tileId: string;
}

export interface TapTileRuntimeState {
  project: TapTileProjectV2;
  level: CompiledTapTileLevel;
  game: TapTileGameState;
}

export interface TapTileRuntimeResolution {
  project: TapTileProjectV2;
  level: CompiledTapTileLevel;
  transition: TapTileTransition;
}
