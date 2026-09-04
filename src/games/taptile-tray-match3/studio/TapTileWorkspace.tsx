import { TapTileStackStudio } from './TapTileStackStudio';

/**
 * TapTile workspace hosted by StudioShell. Game switching uses the platform
 * market session; this module does not reach into other game packages.
 */
export function TapTileWorkspace() {
  return <TapTileStackStudio />;
}
