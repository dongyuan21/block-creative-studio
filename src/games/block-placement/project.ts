import { RHYTHM_PRESETS } from '../../director/rhythmPresets';
import {
  GAME_PROJECT_CONTRACT,
  GAME_PROJECT_CONTRACT_VERSION,
  STUDIO_PROJECT_V2_FORMAT,
  STUDIO_PROJECT_V2_VERSION,
  type StudioProjectDocumentV2,
} from '../../game-runtime/projectEnvelope';
import type { GameReplayEnvelope } from '../../game-runtime/replayEnvelope';
import { blockPlacementDefinition } from './definition';
import { hashBlockPlacementState } from './legacyRuntime';
import { BLOCK_PLACEMENT_DEFAULT_PRODUCTION } from './migrations/blockPlacementV1';
import {
  BLOCK_PLACEMENT_CONFIG_SCHEMA_ID,
  BLOCK_PLACEMENT_GAME_ID,
  BLOCK_PLACEMENT_MODULE_VERSION,
  BLOCK_PLACEMENT_RULESET_ID,
  BLOCK_PLACEMENT_RULESET_VERSION,
  BLOCK_PLACEMENT_STATE_SCHEMA_ID,
} from './manifest';
import { parseBlockPlacementConfig, type BlockPlacementConfig } from './schemas';

export const BLOCK_PLACEMENT_LOOK_COPPER = 'look.copper';

export interface BlockPlacementDocumentOptions {
  name?: string;
  seed?: number;
  takes?: readonly GameReplayEnvelope[];
  lookId?: string;
  quality?: 'preview' | 'standard' | 'cinematic';
  id?: string;
}

function lookPackRef(lookId: string) {
  if (lookId === BLOCK_PLACEMENT_LOOK_COPPER) return BLOCK_PLACEMENT_DEFAULT_PRODUCTION.lookPackRef;
  return { id: lookId, version: '1.0.0' as const, kind: 'look-pack' as const };
}

export function createBlockPlacementDocument(
  config: BlockPlacementConfig,
  options: BlockPlacementDocumentOptions = {},
): StudioProjectDocumentV2 {
  const parsed = parseBlockPlacementConfig(config);
  const seed = options.seed ?? 1;
  const initialState = blockPlacementDefinition.runtime.createInitialState(parsed, seed);
  const initialStateHash = hashBlockPlacementState(initialState);
  const lookId = options.lookId ?? BLOCK_PLACEMENT_LOOK_COPPER;
  const takes = (options.takes ?? []).map((take) => ({ ...take, initialStateHash }));
  return {
    format: STUDIO_PROJECT_V2_FORMAT,
    version: STUDIO_PROJECT_V2_VERSION,
    id: options.id ?? `block-placement-${lookId.replace(/^look\./u, '')}`,
    name: options.name ?? 'Block Placement',
    game: {
      contract: GAME_PROJECT_CONTRACT,
      contractVersion: GAME_PROJECT_CONTRACT_VERSION,
      game: {
        id: BLOCK_PLACEMENT_GAME_ID,
        moduleVersion: BLOCK_PLACEMENT_MODULE_VERSION,
        rulesetId: BLOCK_PLACEMENT_RULESET_ID,
        rulesetVersion: BLOCK_PLACEMENT_RULESET_VERSION,
      },
      config: {
        schemaId: BLOCK_PLACEMENT_CONFIG_SCHEMA_ID,
        data: parsed,
      },
      initialState: {
        schemaId: BLOCK_PLACEMENT_STATE_SCHEMA_ID,
        data: initialState,
        stateHash: initialStateHash,
      },
    },
    production: {
      ...BLOCK_PLACEMENT_DEFAULT_PRODUCTION,
      lookPackRef: lookPackRef(lookId),
      output: { width: 1080, height: 1920, fps: 30, quality: options.quality ?? 'standard' },
    },
    takes,
    direction: {
      rhythm: structuredClone(RHYTHM_PRESETS['human-natural']),
      style: { lookId },
    },
  };
}
