import { TapTileStackStudio } from '../../../taptile/TapTileStackStudio';

/**
 * TapTile owns its game rules, editor and director implementation. This shell
 * only mounts that workspace inside the shared Studio chrome; it does not
 * reach into game-runtime, rendering or StudioShell.
 */
export function TapTileWorkspace() {
  return <TapTileStackStudio />;
}
