import { describe, expect, it } from 'vitest';
import { createHeadlessPlatform } from '../src/bootstrap/gamePackage';
import { migrateUnknownProjectToV2 } from '../src/bootstrap/projectMigrate';
import { validateStudioProjectDocumentV2 } from '../src/game-runtime/projectDocument';
import { STUDIO_PROJECT_V2_FORMAT } from '../src/game-runtime/projectEnvelope';
import { GameRegistry } from '../src/game-runtime/gameRegistry';
import {
  TAPTILE_ACTION_SCHEMA_ID,
  TAPTILE_CONFIG_SCHEMA_ID,
  TAPTILE_STATE_SCHEMA_ID,
  TAPTILE_TRAY_MATCH3_GAME_ID,
  createDefaultTapTileConfig,
  createDefaultTapTileProject,
  hashTapTileRuntimeState,
  migrateTapTileProjectToStudioV2,
  tapTileConfigFromProject,
  tapTileProjectFromStudioV2,
  tapTileTakeToReplayEnvelope,
  tapTileTakeFromReplayEnvelope,
  tapTileTrayMatch3Definition,
  tapTileTrayMatch3Package,
  type TapTileRuntimeAction,
  type TapTileRuntimeResolution,
  type TapTileRuntimeState,
} from '../src/games/taptile-tray-match3';
import { TAPTILE_PRESENTATION_SCHEMA_ID } from '../src/games/taptile-tray-match3/presentation/presentationAdapter';
import { TAPTILE_RENDER_CONTRACT_ID } from '../src/games/taptile-tray-match3/render/renderContract';
import { TAPTILE_COMPOSITION_PROFILE_ID } from '../src/games/taptile-tray-match3/profiles/composition';
import { TAPTILE_CALIBRATION_PROFILE_ID } from '../src/games/taptile-tray-match3/profiles/calibration';
import { createTapTileTake } from '../src/games/taptile-tray-match3/gameplay/take';
import { compileTapTileLevel, createInitialTapTileGameState, tapTileStateHash } from '../src/games/taptile-tray-match3/gameplay';
import { getCaptureSuite } from '../src/capture/captureSuiteRegistry';
import { getCalibrationProfile, getCompositionProfile } from '../src/rendering/compositionRegistry';
import { getRenderBackend } from '../src/rendering/backendRegistry';

describe('TapTile platform package', () => {
  it('registers the full GamePackage surface', () => {
    const platform = createHeadlessPlatform([tapTileTrayMatch3Package]);
    expect(platform.games.has(TAPTILE_TRAY_MATCH3_GAME_ID)).toBe(true);
    expect(platform.presentations.has(TAPTILE_TRAY_MATCH3_GAME_ID)).toBe(true);
    expect(platform.renderContracts.has(TAPTILE_RENDER_CONTRACT_ID, '1.0.0')).toBe(true);
    expect(getCompositionProfile(TAPTILE_COMPOSITION_PROFILE_ID)?.gameId).toBe(TAPTILE_TRAY_MATCH3_GAME_ID);
    expect(getCalibrationProfile(TAPTILE_CALIBRATION_PROFILE_ID)?.gameId).toBe(TAPTILE_TRAY_MATCH3_GAME_ID);
    expect(getCaptureSuite(TAPTILE_TRAY_MATCH3_GAME_ID)?.id).toBe('taptile-tray-match3.capture.v1');
    expect(getRenderBackend('taptile-tray-match3.diagnostic')?.renderer).toBe('reference-2d');
    expect(platform.games.require(TAPTILE_TRAY_MATCH3_GAME_ID).schemas.config.id).toBe(TAPTILE_CONFIG_SCHEMA_ID);
    expect(platform.games.require(TAPTILE_TRAY_MATCH3_GAME_ID).schemas.state.id).toBe(TAPTILE_STATE_SCHEMA_ID);
    expect(platform.games.require(TAPTILE_TRAY_MATCH3_GAME_ID).schemas.action.id).toBe(TAPTILE_ACTION_SCHEMA_ID);
  });

  it('stores seed on runtime state and includes it in the state hash', () => {
    const definition = tapTileTrayMatch3Definition;
    const config = createDefaultTapTileConfig('hourglass');
    const a = definition.runtime.createInitialState(config, 73);
    const b = definition.runtime.createInitialState(config, 99);
    expect(a.seed).toBe(73);
    expect(b.seed).toBe(99);
    expect(a.game).toEqual(b.game);
    expect(hashTapTileRuntimeState(a)).not.toBe(hashTapTileRuntimeState(b));
  });

  it('migrates a native TapTile project into Studio Project V2 and round-trips', () => {
    const native = createDefaultTapTileProject('hourglass');
    const document = migrateTapTileProjectToStudioV2(native);
    expect(document.format).toBe(STUDIO_PROJECT_V2_FORMAT);
    expect(document.game.game.id).toBe(TAPTILE_TRAY_MATCH3_GAME_ID);
    expect(document.game.config.schemaId).toBe(TAPTILE_CONFIG_SCHEMA_ID);
    const games = new GameRegistry();
    games.register(tapTileTrayMatch3Definition);
    const validated = validateStudioProjectDocumentV2(document, games);
    expect(validated.game.initialState.stateHash).toBe(document.game.initialState.stateHash);
    const restored = tapTileProjectFromStudioV2(document);
    expect(restored.level.tileInstances).toHaveLength(native.level.tileInstances.length);
    expect(restored.director.seed).toBe(native.director.seed);
    const migrated = migrateUnknownProjectToV2(native);
    expect(migrated.document.game.game.id).toBe(TAPTILE_TRAY_MATCH3_GAME_ID);
    expect(migrated.report.gameId).toBe(TAPTILE_TRAY_MATCH3_GAME_ID);
  });

  it('converts takes through GameReplayEnvelope and compiles a presentation frame source', () => {
    const platform = createHeadlessPlatform([tapTileTrayMatch3Package]);
    const project = createDefaultTapTileProject('hourglass');
    const config = tapTileConfigFromProject(project);
    const runtime = platform.games.require<
      typeof config,
      TapTileRuntimeState,
      TapTileRuntimeAction,
      TapTileRuntimeResolution
    >(TAPTILE_TRAY_MATCH3_GAME_ID).runtime;
    const state = runtime.createInitialState(config, 7);
    const legal = runtime.listLegalActions?.(state)[0];
    expect(legal).toBeDefined();
    const resolution = runtime.resolve(state, legal!, { seed: 7, stepIndex: 0 });
    const after = runtime.stateAfter(resolution);
    const level = compileTapTileLevel(project);
    const take = createTapTileTake(level, [{
      id: 'tap-0',
      type: 'tap',
      actor: 'agent',
      tileId: legal!.tileId,
      startedAtFrame: 0,
      durationFrames: 8,
    }], after.game, { id: 'take-0', name: 'First tap' });
    const replay = tapTileTakeToReplayEnvelope({
      take,
      seed: 7,
      initialStateHash: runtime.hashState(state),
    });
    expect(replay.actions[0]?.schemaId).toBe(TAPTILE_ACTION_SCHEMA_ID);
    expect(tapTileTakeFromReplayEnvelope(replay, {
      levelHash: level.levelHash,
      finalStateHash: tapTileStateHash(createInitialTapTileGameState(level)),
    }).actions[0]?.tileId).toBe(legal!.tileId);

    const document = migrateTapTileProjectToStudioV2({ ...project, takes: [take], director: { ...project.director, seed: 7 } });
    const source = platform.presentations.require(TAPTILE_TRAY_MATCH3_GAME_ID).compile({
      project: document.game,
      replay: document.takes[0]!,
      directorProfile: document.direction?.rhythm,
      fps: 30,
    });
    expect(source.totalFrames).toBeGreaterThan(0);
    const packet = source.evaluate(0);
    expect(packet.payloadSchemaId).toBe(TAPTILE_PRESENTATION_SCHEMA_ID);
    expect(packet.identity.gameId).toBe(TAPTILE_TRAY_MATCH3_GAME_ID);
    expect(packet.identity.frameIndex).toBeGreaterThanOrEqual(0);
  });
});
