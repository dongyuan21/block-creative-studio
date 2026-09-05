import { TapTileStackStudio } from '../../../taptile/TapTileStackStudio';
import './tapTileWorkspace.css';

/**
 * TapTile owns its game rules, editor and director implementation. This shell
 * mounts that workspace inside the shared Studio chrome (Toolbar, asset-panel,
 * inspector-panel, timeline) without reaching into StudioShell.
 */
export function TapTileWorkspace() {
  return <TapTileStackStudio />;
}
