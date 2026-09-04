import { TapTileStackStudio } from '../../../taptile/TapTileStackStudio';

function openBlockPlacement(): void {
  const button = [...document.querySelectorAll<HTMLButtonElement>('.game-market-card')]
    .find((candidate) => candidate.textContent?.includes('Block Placement'));
  button?.click();
}

/**
 * TapTile owns its game rules, editor and director implementation. This shell
 * only adapts the legacy standalone workspace to the platform registry; it
 * deliberately does not reach into game-runtime, rendering or StudioShell.
 */
export function TapTileWorkspace() {
  return <TapTileStackStudio onOpenBlockStudio={openBlockPlacement} />;
}
