import type { RuntimeSchema } from '../../../src/game-runtime/contracts';
import type { GameDefinition, GameRuntime } from '../../../src/game-runtime/contracts';
import { GameRuntimeError, GameSchemaError } from '../../../src/game-runtime/errors';
import type { PresentationCompilerAdapter, CompiledFrameSource } from '../../../src/game-runtime/frameSource';
import {
  PRESENTATION_PACKET_CONTRACT,
  PRESENTATION_PACKET_CONTRACT_VERSION,
  presentationHashIdentity,
} from '../../../src/game-runtime/presentationPacket';
import type { GameRenderContract } from '../../../src/game-runtime/renderContract';
import { GAME_RENDER_CONTRACT, GAME_RENDER_CONTRACT_VERSION } from '../../../src/game-runtime/renderContract';
import type { CalibrationProfile } from '../../../src/game-runtime/calibrationProfile';
import { stableHash } from '../../../src/headless/stableHash';
import type { CompositionProfile } from '../../../src/rendering/composition';
import type { RenderBackendAdapter } from '../../../src/rendering/backendRegistry';
import { assertBackendSupportsPacket } from '../../../src/rendering/backendRegistry';
import type { CaptureSuite } from '../../../src/capture/captureSuite';
import type { GamePackageRegistration } from '../../../src/bootstrap/gamePackage';
import {
  GAME_PROJECT_CONTRACT,
  GAME_PROJECT_CONTRACT_VERSION,
  STUDIO_PROJECT_V2_FORMAT,
  STUDIO_PROJECT_V2_VERSION,
} from '../../../src/game-runtime/projectEnvelope';
import { GAME_REPLAY_CONTRACT, GAME_REPLAY_CONTRACT_VERSION } from '../../../src/game-runtime/replayEnvelope';
import { ref } from '../../headlessFixtures';

export const CRUSH_GAME_ID = 'block-crush-drop';
export const CRUSH_MODULE_VERSION = '0.0.1';
export const CRUSH_PRESENTATION_SCHEMA_ID = 'bcs.block-crush.presentation-frame.v1';
export const CRUSH_RENDER_CONTRACT_ID = 'bcs.render.block-crush-drop';
export const CRUSH_COMPOSITION_ID = 'block-crush-drop.composition.diag';
export const CRUSH_CALIBRATION_ID = 'block-crush-drop.calibration.diag';
export const CRUSH_CONFIG_SCHEMA_ID = 'bcs.runtime.block-crush-drop.config';
export const CRUSH_STATE_SCHEMA_ID = 'bcs.runtime.block-crush-drop.state';
export const CRUSH_ACTION_SCHEMA_ID = 'bcs.runtime.block-crush-drop.action';

export interface CrushConfig {
  columns: number;
  rows: number;
}

export interface CrushState {
  columns: number;
  rows: number;
  cells: Array<Array<string | null>>;
  score: number;
  status: 'playing' | 'game-over';
}

export interface CrushAction {
  column: number;
}

export interface CrushResolution {
  before: CrushState;
  after: CrushState;
  action: CrushAction;
  crushed: boolean;
}

function fail(path: string, detail: string): never {
  throw new GameSchemaError('INVALID_VALUE', `${path}: ${detail}`, { path });
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'must be an object');
  return value as Record<string, unknown>;
}

function integer(value: unknown, path: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    fail(path, `must be an integer between ${min} and ${max}`);
  }
  return value;
}

export const crushConfigSchema: RuntimeSchema<CrushConfig> = {
  id: CRUSH_CONFIG_SCHEMA_ID,
  version: CRUSH_MODULE_VERSION,
  parse(value) {
    const source = record(value, '$');
    return {
      columns: integer(source.columns, '$.columns', 2, 16),
      rows: integer(source.rows, '$.rows', 2, 16),
    };
  },
  serialize: (value) => structuredClone(value),
};

export const crushStateSchema: RuntimeSchema<CrushState> = {
  id: CRUSH_STATE_SCHEMA_ID,
  version: CRUSH_MODULE_VERSION,
  parse(value) {
    const source = record(value, '$');
    const columns = integer(source.columns, '$.columns', 2, 16);
    const rows = integer(source.rows, '$.rows', 2, 16);
    if (!Array.isArray(source.cells) || source.cells.length !== rows) fail('$.cells', `must have ${rows} rows`);
    const cells = source.cells.map((rowValue, row) => {
      if (!Array.isArray(rowValue) || rowValue.length !== columns) fail(`$.cells[${row}]`, `must have ${columns} columns`);
      return rowValue.map((cell) => (cell === null || typeof cell === 'string' ? cell : fail('$.cells', 'invalid cell')));
    });
    const status = source.status === 'playing' || source.status === 'game-over'
      ? source.status
      : fail('$.status', 'must be playing or game-over');
    return {
      columns,
      rows,
      cells,
      score: integer(source.score, '$.score', 0, 1_000_000),
      status,
    };
  },
  serialize: (value) => structuredClone(value),
};

export const crushActionSchema: RuntimeSchema<CrushAction> = {
  id: CRUSH_ACTION_SCHEMA_ID,
  version: CRUSH_MODULE_VERSION,
  parse(value) {
    const source = record(value, '$');
    return { column: integer(source.column, '$.column', 0, 15) };
  },
  serialize: (value) => structuredClone(value),
};

export function hashCrushState(state: CrushState): string {
  return stableHash(state);
}

export const crushRuntime: GameRuntime<CrushConfig, CrushState, CrushAction, CrushResolution> = {
  createInitialState(config) {
    return {
      columns: config.columns,
      rows: config.rows,
      cells: Array.from({ length: config.rows }, () => Array.from({ length: config.columns }, () => null)),
      score: 0,
      status: 'playing',
    };
  },
  hashState: hashCrushState,
  listLegalActions(state) {
    if (state.status !== 'playing') return [];
    return state.cells[0]!.map((cell, column) => (cell === null ? { column } : null)).filter(
      (item): item is CrushAction => item !== null,
    );
  },
  resolve(state, action) {
    if (state.status !== 'playing') {
      throw new GameRuntimeError('ILLEGAL_ACTION', 'Game is over.', { details: action });
    }
    const top = state.cells[0]?.[action.column];
    if (top !== null && top !== undefined) {
      throw new GameRuntimeError('ILLEGAL_ACTION', `Column ${action.column} is full.`, { details: action });
    }
    let row = state.rows - 1;
    while (row >= 0 && state.cells[row]![action.column] !== null) row -= 1;
    const nextCells = state.cells.map((line) => [...line]);
    nextCells[Math.max(row, 0)]![action.column] = 'gem';
    const crushed = nextCells.every((line) => line.every((cell) => cell !== null));
    const after: CrushState = {
      ...state,
      cells: nextCells,
      score: state.score + 1,
      status: crushed ? 'game-over' : 'playing',
    };
    return { before: state, after, action, crushed };
  },
  stateAfter(resolution) {
    return resolution.after;
  },
};

export const crushDefinition: GameDefinition<CrushConfig, CrushState, CrushAction, CrushResolution> = {
  manifest: {
    gameId: CRUSH_GAME_ID,
    moduleVersion: CRUSH_MODULE_VERSION,
    displayName: 'crash wooooood!',
    topology: 'grid-2d',
    rulesetId: 'crush-diag',
    rulesetVersion: CRUSH_MODULE_VERSION,
  },
  schemas: {
    config: crushConfigSchema,
    state: crushStateSchema,
    action: crushActionSchema,
  },
  runtime: crushRuntime,
};

export const crushRenderContract: GameRenderContract = {
  contract: GAME_RENDER_CONTRACT,
  contractVersion: GAME_RENDER_CONTRACT_VERSION,
  id: CRUSH_RENDER_CONTRACT_ID,
  version: CRUSH_MODULE_VERSION,
  gameId: CRUSH_GAME_ID,
  eventCatalog: [
    { type: 'block-crush.impact', category: 'commit', tags: ['drop'] },
    { type: 'block-crush.crush-resolved', category: 'resolve', tags: ['clear'] },
    { type: 'block-crush.collapse', category: 'reconfigure', tags: ['collapse'] },
  ],
  backends: {
    'fixed-camera-cinematic': {
      supportedPresentationSchemas: [CRUSH_PRESENTATION_SCHEMA_ID],
      requiredSlots: [
        { slotId: 'tile.material', acceptedKinds: ['material-pack'], required: true, role: 'tile-material' },
        { slotId: 'clear.primary', acceptedKinds: ['effect-pack'], required: true, role: 'clear-primary' },
        { slotId: 'crush.board', acceptedKinds: ['board-skin', 'background'], required: true },
      ],
      passes: [{ id: 'crush-well', order: 0, required: true }],
    },
  },
};

export const crushCompositionProfile: CompositionProfile = {
  id: CRUSH_COMPOSITION_ID,
  version: CRUSH_MODULE_VERSION,
  gameId: CRUSH_GAME_ID,
  designResolution: { width: 720, height: 1280 },
  videoResolution: { width: 1080, height: 1920 },
  playfield: { x: 40, y: 200, width: 640, height: 640 },
};

export const crushCalibrationProfile: CalibrationProfile = {
  id: CRUSH_CALIBRATION_ID,
  version: CRUSH_MODULE_VERSION,
  gameId: CRUSH_GAME_ID,
  compositionProfileId: CRUSH_COMPOSITION_ID,
  rois: [
    { id: 'well', x: 40, y: 200, width: 640, height: 640 },
    { id: 'impact', x: 40, y: 840, width: 640, height: 120 },
  ],
};

export const crushPresentationAdapter: PresentationCompilerAdapter = {
  gameId: CRUSH_GAME_ID,
  compile(input) {
    const initial = crushStateSchema.parse(input.project.initialState.data);
    let cursor = initial;
    const hashes = [crushRuntime.hashState(cursor)];
    for (const [stepIndex, envelope] of input.replay.actions.entries()) {
      const action = crushActionSchema.parse(envelope.action);
      cursor = crushRuntime.stateAfter(crushRuntime.resolve(cursor, action, { seed: input.replay.seed, stepIndex }));
      hashes.push(crushRuntime.hashState(cursor));
    }
    const totalFrames = Math.max(input.replay.actions.length, 1);
    const frameSourceHash = stableHash({ gameId: CRUSH_GAME_ID, takeId: input.replay.takeId, hashes, fps: input.fps });
    const source: CompiledFrameSource = {
      gameId: CRUSH_GAME_ID,
      takeId: input.replay.takeId,
      fps: input.fps,
      totalFrames,
      frameSourceHash,
      evaluate(frameIndex) {
        const clamped = Math.min(Math.max(frameIndex, 0), totalFrames - 1);
        const stateHash = hashes[Math.min(clamped, hashes.length - 1)] ?? hashes[0]!;
        const semanticEvents = clamped === 0
          ? [{ id: 'impact-0', type: 'block-crush.impact', category: 'commit' as const, tags: ['drop'], entityIds: [] }]
          : [{ id: `crush-${clamped}`, type: 'block-crush.crush-resolved', category: 'resolve' as const, tags: ['clear'], entityIds: [] }];
        const payload = { frame: clamped, stateHash };
        return {
          contract: PRESENTATION_PACKET_CONTRACT,
          contractVersion: PRESENTATION_PACKET_CONTRACT_VERSION,
          identity: {
            gameId: CRUSH_GAME_ID,
            moduleVersion: CRUSH_MODULE_VERSION,
            takeId: input.replay.takeId,
            frameIndex: clamped,
            fps: input.fps,
            totalFrames,
            stateHash,
            presentationHash: stableHash(presentationHashIdentity({
              frameIndex: clamped,
              fps: input.fps,
              totalFrames,
              payload,
              semanticEvents,
              cameraPunch: 0,
            })),
          },
          semanticEvents,
          feedback: { cameraPunch: 0 },
          payloadSchemaId: CRUSH_PRESENTATION_SCHEMA_ID,
          payload,
        };
      },
    };
    return source;
  },
};

export function createCrushDiagnosticBackend(): RenderBackendAdapter {
  const frames: number[] = [];
  const adapter: RenderBackendAdapter = {
    id: 'block-crush-drop.diagnostic',
    renderer: 'fixed-camera-cinematic',
    supportedPresentationSchemas: [CRUSH_PRESENTATION_SCHEMA_ID],
    letterboxFromDesign: false,
    createStage(canvas) {
      return {
        resize(width, height) {
          if ('width' in canvas) {
            canvas.width = width;
            canvas.height = height;
          }
        },
        async warmup(packet) {
          this.renderAt(packet);
        },
        renderAt(packet) {
          assertBackendSupportsPacket(adapter, packet);
          frames.push(packet.identity.frameIndex);
          const context = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
          if (!context) return;
          context.fillStyle = packet.identity.frameIndex === 0 ? '#e85a2a' : '#2a6ae8';
          context.fillRect(0, 0, canvas.width || 1, canvas.height || 1);
          context.fillStyle = '#f4f1ea';
          context.fillRect(40, 200, 640, 640);
        },
        captureStill() {
          return canvas;
        },
        dispose() {},
      };
    },
  };
  return adapter;
}

export const crushDiagnosticBackend = createCrushDiagnosticBackend();

export const crushCaptureSuite: CaptureSuite = {
  id: 'block-crush-drop.diag',
  gameId: CRUSH_GAME_ID,
  stills: [{ id: 'crush-idle', role: 'diagnostic', renderer: 'fixed-camera-cinematic' }],
  videos: [{ id: 'crush-drop', renderer: 'fixed-camera-cinematic' }],
};

export const fakeCrushPackage: GamePackageRegistration = {
  definition: crushDefinition,
  presentation: crushPresentationAdapter,
  renderContract: crushRenderContract,
  compositions: [crushCompositionProfile],
  calibrations: [crushCalibrationProfile],
  backends: [crushDiagnosticBackend],
  captureSuite: crushCaptureSuite,
  studioGameId: CRUSH_GAME_ID,
};

export function createCrushDiagnosticDocument() {
  const config = { columns: 2, rows: 2 };
  const initial = crushRuntime.createInitialState(config, 1);
  return {
    format: STUDIO_PROJECT_V2_FORMAT,
    version: STUDIO_PROJECT_V2_VERSION,
    id: 'crush.diag',
    name: 'Crush Diagnostic',
    game: {
      contract: GAME_PROJECT_CONTRACT,
      contractVersion: GAME_PROJECT_CONTRACT_VERSION,
      game: {
        id: CRUSH_GAME_ID,
        moduleVersion: CRUSH_MODULE_VERSION,
        rulesetId: 'crush-diag',
        rulesetVersion: CRUSH_MODULE_VERSION,
      },
      config: { schemaId: CRUSH_CONFIG_SCHEMA_ID, data: config },
      initialState: {
        schemaId: CRUSH_STATE_SCHEMA_ID,
        data: initial,
        stateHash: hashCrushState(initial),
      },
    },
    production: {
      layoutProfileRef: ref('layout.vertical', 'ui-theme', 'd'),
      cameraProfileRef: ref('camera.fixed', 'camera-profile', 'e'),
      lookPackRef: ref('look.crush', 'look-pack', '8'),
      output: { width: 1080, height: 1920, fps: 30, quality: 'preview' as const },
    },
    takes: [
      {
        contract: GAME_REPLAY_CONTRACT,
        contractVersion: GAME_REPLAY_CONTRACT_VERSION,
        gameId: CRUSH_GAME_ID,
        moduleVersion: CRUSH_MODULE_VERSION,
        takeId: 'drop-0',
        initialStateHash: hashCrushState(initial),
        seed: 1,
        actions: [
          {
            id: 'drop-col-0',
            actor: 'agent' as const,
            schemaId: CRUSH_ACTION_SCHEMA_ID,
            action: { column: 0 },
          },
        ],
        interactions: [
          {
            id: 'tap-0',
            modality: 'tap' as const,
            startFrame: 0,
            endFrame: 8,
            committedActionId: 'drop-col-0',
            samples: [{ frameOffset: 0, x: 0.2, y: 0.4 }],
          },
        ],
      },
    ],
  };
}
