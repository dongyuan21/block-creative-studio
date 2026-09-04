import { STUDIO_PROJECT_V2_FORMAT } from '../game-runtime/projectEnvelope';
import { migrateUnknownProjectToV2 as migrateBlockPlacementUnknownToV2 } from '../games/block-placement/migrations/blockPlacementV1';
import {
  isTapTileStudioDocument,
  migrateTapTileUnknownToStudioV2,
} from '../games/taptile-tray-match3/migrations/tapTileV2';
import { isTapTileProjectV2 } from '../games/taptile-tray-match3/project';
import { isStackProject } from '../games/taptile-tray-match3/stackModel';

export function migrateUnknownProjectToV2(value: unknown) {
  const format = value && typeof value === 'object' && !Array.isArray(value)
    ? (value as { format?: unknown }).format
    : undefined;
  if (
    format === 'taptile-director-project'
    || format === 'taptile-stack-studio'
    || isTapTileProjectV2(value)
    || isStackProject(value)
    || isTapTileStudioDocument(value)
  ) {
    const migrated = migrateTapTileUnknownToStudioV2(value);
    return { document: migrated.document, report: migrated.report };
  }
  if (format === STUDIO_PROJECT_V2_FORMAT) {
    const gameId = (value as { game?: { game?: { id?: unknown } } }).game?.game?.id;
    if (gameId === 'taptile-tray-match3') {
      const migrated = migrateTapTileUnknownToStudioV2(value);
      return { document: migrated.document, report: migrated.report };
    }
  }
  return migrateBlockPlacementUnknownToV2(value);
}
