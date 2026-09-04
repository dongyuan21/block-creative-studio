import type { GamePackageRegistration } from '../../bootstrap/gamePackage';
import { tapTileTrayMatch3Definition } from './definition';
import { TAPTILE_TRAY_MATCH3_GAME_ID } from './manifest';

export const tapTileTrayMatch3Package: GamePackageRegistration = {
  definition: tapTileTrayMatch3Definition,
  studioGameId: TAPTILE_TRAY_MATCH3_GAME_ID,
};
