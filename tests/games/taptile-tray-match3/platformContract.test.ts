import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createHeadlessPlatform } from '../../../src/bootstrap/gamePackage';
import { requireCaptureSuite } from '../../../src/capture/captureSuiteRegistry';
import { compileFrameSourceFromDocument, validateStudioProjectDocumentV2 } from '../../../src/game-runtime/projectDocument';
import { catalogAcceptsEvent } from '../../../src/game-runtime/renderContract';
import { tapTileCaptureSuite } from '../../../src/games/taptile-tray-match3/capture/suite';
import { tapTileTrayMatch3Package } from '../../../src/games/taptile-tray-match3/package';
import {
  TAPTILE_TRAY_MATCH3_GAME_ID,
  TAPTILE_TRAY_MATCH3_MODULE_VERSION,
} from '../../../src/games/taptile-tray-match3/manifest';
import {
  TAPTILE_PRESENTATION_SCHEMA_ID,
  tapTilePayloadFromPacket,
} from '../../../src/games/taptile-tray-match3/presentation';
import {
  createTapTileDocument,
  createTapTileReferenceDocument,
  TAPTILE_GATE_TAP_IDS,
  TAPTILE_REFERENCE_TAKE_ID,
} from '../../../src/games/taptile-tray-match3/project';
import { TAPTILE_CALIBRATION_PROFILE_ID } from '../../../src/games/taptile-tray-match3/profiles/calibration';
import { tapTileCompositionProfile } from '../../../src/games/taptile-tray-match3/profiles/composition';
import { TAPTILE_CINEMATIC_BACKEND_ID } from '../../../src/games/taptile-tray-match3/render/cinematicBackendAdapter';
import { tapTileRenderContract } from '../../../src/games/taptile-tray-match3/render/renderContract';
import { blockPlacementPackage } from '../../../src/games/block-placement/package';
import { createDefaultTapTileProject } from '../../../src/taptile/project';
import { AssetRegistry } from '../../../src/headless/assetRegistry';
import { createCalibrationCase } from '../../../src/headless/calibration';
import { buildCreativeMasterV2 } from '../../../src/headless/creativeMasterV2';
import type { AssetManifest, EffectPackManifest, LookPackManifest } from '../../../src/headless/contracts';
import { createFrameRenderRequestV2, validateFrameRenderRequestV2 } from '../../../src/headless/frameRequestV2';
import { compileVariantV2 } from '../../../src/headless/variantCompilerV2';
import { requireRenderBackend } from '../../../src/rendering/backendRegistry';
import { getDefaultCalibrationProfile, requireCalibrationProfile } from '../../../src/rendering/compositionRegistry';
import { readyRenderResources } from '../../../src/rendering/preparedRenderResources';
import { assertPacketMatchesFrameSource, assertVideoRenderJobContract } from '../../../src/rendering/renderJob';
import { bindPreparedResources } from '../../../src/rendering/resourcePolicy';
import { makeFixture, ref } from '../../headlessFixtures';

describe('taptile-tray-match3 platform contract', () => {
  it('keeps platform compiler, exporter, render job, capture, and Studio shell free of game branches', () => {
    const variantSource = readFileSync(resolve(process.cwd(), 'src/headless/variantCompilerV2.ts'), 'utf8');
    const exporterSource = readFileSync(resolve(process.cwd(), 'src/exporter/offlineVideoExporter.ts'), 'utf8');
    const shellSource = readFileSync(resolve(process.cwd(), 'src/studio/StudioShell.tsx'), 'utf8');
    const jobSource = readFileSync(resolve(process.cwd(), 'src/rendering/renderJob.ts'), 'utf8');
    const studioRegistrySource = readFileSync(resolve(process.cwd(), 'src/studio/gameStudioRegistry.ts'), 'utf8');
    const captureV2Source = readFileSync(resolve(process.cwd(), 'src/capture/v2/captureStill.ts'), 'utf8');
    expect(variantSource).not.toMatch(/taptile-tray-match3/);
    expect(exporterSource).not.toMatch(/taptile-tray-match3/);
    expect(shellSource).not.toMatch(/taptile-tray-match3|TapTileGameState/);
    expect(jobSource).not.toMatch(/taptile-tray-match3|block-placement/);
    expect(studioRegistrySource).not.toMatch(/taptile-tray-match3|block-placement|vita-mahjong/);
    expect(captureV2Source).not.toMatch(/taptile-tray-match3|block-placement|vita-mahjong/);
  });

  it('walks the real package through registry, V2 validation, frame source, variant plan, profiles, and render job', () => {
    const platform = createHeadlessPlatform([blockPlacementPackage, tapTileTrayMatch3Package]);
    expect(platform.games.require(TAPTILE_TRAY_MATCH3_GAME_ID).manifest.moduleVersion).toBe(TAPTILE_TRAY_MATCH3_MODULE_VERSION);
    expect(platform.renderContracts.require(tapTileRenderContract.id).gameId).toBe(TAPTILE_TRAY_MATCH3_GAME_ID);
    expect(platform.presentations.require(TAPTILE_TRAY_MATCH3_GAME_ID).gameId).toBe(TAPTILE_TRAY_MATCH3_GAME_ID);
    expect(requireCalibrationProfile(TAPTILE_CALIBRATION_PROFILE_ID).rois.map((roi) => roi.id)).toEqual([
      'tray',
      'board',
      'hud',
      'match-burst',
      'pointer-envelope',
    ]);
    expect(getDefaultCalibrationProfile().gameId).toBe('block-placement');
    expect(requireCaptureSuite(TAPTILE_TRAY_MATCH3_GAME_ID).id).toBe(tapTileCaptureSuite.id);
    expect(requireCaptureSuite(TAPTILE_TRAY_MATCH3_GAME_ID).stills).toHaveLength(5);

    const emptyDocument = createTapTileDocument(createDefaultTapTileProject('hourglass'), { includeGateTake: false, takes: [] });
    expect(emptyDocument.takes).toHaveLength(0);
    expect(() => compileFrameSourceFromDocument(emptyDocument, platform, {
      takeId: TAPTILE_REFERENCE_TAKE_ID,
      directorProfile: emptyDocument.direction?.rhythm ?? {},
      fps: 30,
    })).toThrow(/take director-gate-take is not in the document/);

    const document = createTapTileReferenceDocument();
    const validated = validateStudioProjectDocumentV2(document, platform.games);
    expect(validated.parsed.takes[0]?.actions).toHaveLength(TAPTILE_GATE_TAP_IDS.length);

    const frameSource = compileFrameSourceFromDocument(document, platform, {
      takeId: TAPTILE_REFERENCE_TAKE_ID,
      directorProfile: document.direction?.rhythm ?? {},
      fps: 30,
    });
    let matchFrame = -1;
    for (let frame = 0; frame < frameSource.totalFrames; frame += 1) {
      if (frameSource.evaluate(frame).semanticEvents.some((event) => event.type === 'match.resolved')) {
        matchFrame = frame;
        break;
      }
    }
    expect(matchFrame).toBeGreaterThan(0);
    const packet = frameSource.evaluate(matchFrame);
    assertPacketMatchesFrameSource(packet, frameSource, matchFrame);
    expect(packet.payloadSchemaId).toBe(TAPTILE_PRESENTATION_SCHEMA_ID);
    expect(tapTilePayloadFromPacket(packet).frame.effects.some((effect) => effect.kind === 'match')).toBe(true);
    expect(catalogAcceptsEvent(tapTileRenderContract, 'tile.fly-to-tray')).toBe(true);
    expect(catalogAcceptsEvent(tapTileRenderContract, 'line-clear')).toBe(false);

    const matchCase = createCalibrationCase({
      id: 'taptile-match-roi',
      eventId: 'match-resolved',
      eventType: 'match.resolved',
      targetFrame: matchFrame,
      correspondence: 'isolated-presentation',
      calibrationProfileId: TAPTILE_CALIBRATION_PROFILE_ID,
    });
    expect(matchCase.roi.map((roi) => roi.id)).toEqual([
      'tray',
      'board',
      'hud',
      'match-burst',
      'pointer-envelope',
    ]);
    expect(matchCase.compositionProfileId).toBe(tapTileCompositionProfile.id);

    const fixture = makeFixture();
    const layout: AssetManifest = {
      ...(fixture.assets.find((item) => item.id === 'layout.vertical') as AssetManifest),
      id: document.production.layoutProfileRef.id,
      version: document.production.layoutProfileRef.version,
    };
    const camera: AssetManifest = {
      ...(fixture.assets.find((item) => item.id === 'camera.fixed') as AssetManifest),
      id: document.production.cameraProfileRef.id,
      version: document.production.cameraProfileRef.version,
    };
    const matchEffect: EffectPackManifest = {
      ...(fixture.assets.find((item) => item.id === 'effect.copper-clear') as EffectPackManifest),
      id: 'effect.taptile.match',
      supportedEvents: tapTileRenderContract.eventCatalog.map((event) => event.type),
    };
    const look: LookPackManifest = {
      ...(fixture.assets.find((item) => item.id === 'look.copper') as LookPackManifest),
      id: document.production.lookPackRef.id,
      version: document.production.lookPackRef.version,
      slots: {
        'tile.material': ref('material.copper', 'material-pack', 'b'),
        'clear.primary': {
          id: matchEffect.id,
          version: matchEffect.version,
          kind: 'effect-pack',
          contentHash: matchEffect.contentHash,
        },
        'taptile.board': ref('background.dark', 'background', 'f'),
      },
    };
    const assets = fixture.assets
      .filter((item) => !['layout.vertical', 'camera.fixed', 'look.copper'].includes(item.id))
      .concat(layout, camera, look, matchEffect);
    const master = buildCreativeMasterV2(document, platform.games, {
      id: 'master.taptile',
      takeId: TAPTILE_REFERENCE_TAKE_ID,
      renderContract: tapTileRenderContract,
      fps: 30,
      totalFrames: frameSource.totalFrames,
      semanticHash: frameSource.frameSourceHash,
    });
    const plan = compileVariantV2(
      master,
      {
        ...fixture.recipe,
        id: 'variant.taptile',
        masterId: 'master.taptile',
        lockMode: 'semantic',
        lookPackRef: {
          id: look.id,
          version: look.version,
          kind: 'look-pack',
          contentHash: look.contentHash,
        },
      },
      new AssetRegistry(assets),
      tapTileRenderContract,
      { renderer: 'fixed-camera-cinematic', requireHashes: true },
    );
    expect(plan.slots['tile.material']).toBeDefined();
    expect(plan.slots['clear.primary']).toBeDefined();
    expect(plan.slots['taptile.board']).toBeDefined();
    expect(plan.game.id).toBe(TAPTILE_TRAY_MATCH3_GAME_ID);

    const backend = requireRenderBackend(TAPTILE_CINEMATIC_BACKEND_ID);
    const resources = readyRenderResources(plan.planHash, {
      slots: [
        { slotId: 'tile.material', uri: 'mem:tile', contentHash: 'sha256:b', readiness: 'ready' },
        { slotId: 'clear.primary', uri: 'mem:fx', contentHash: matchEffect.contentHash ?? 'sha256:c', readiness: 'ready' },
        { slotId: 'taptile.board', uri: 'mem:board', contentHash: 'sha256:f', readiness: 'ready' },
      ],
    });
    const resourcePolicy = bindPreparedResources({
      plan,
      resources,
      renderContract: tapTileRenderContract,
      backend,
    });
    assertVideoRenderJobContract({
      frameSource,
      backend,
      output: { width: 1080, height: 1920, fps: frameSource.fps, quality: 'preview' },
      projectName: 'taptile',
      takeName: TAPTILE_REFERENCE_TAKE_ID,
      resourcePolicy,
      plan,
      renderContract: tapTileRenderContract,
    });

    const request = createFrameRenderRequestV2({
      gameId: TAPTILE_TRAY_MATCH3_GAME_ID,
      moduleVersion: TAPTILE_TRAY_MATCH3_MODULE_VERSION,
      renderContract: tapTileRenderContract,
      presentationSchemaId: TAPTILE_PRESENTATION_SCHEMA_ID,
      composition: tapTileCompositionProfile,
      planId: plan.id,
      planHash: plan.planHash,
      takeId: frameSource.takeId,
      frameIndex: matchFrame,
      fps: frameSource.fps,
      renderer: backend.renderer,
      coordinateSpace: 'video',
    });
    expect(request.targetPixels).toEqual({ width: 1080, height: 1920 });
    expect(request.passIds).toEqual([
      'taptile-background',
      'taptile-board',
      'taptile-tray',
      'taptile-vfx',
      'taptile-hud',
    ]);
    expect(validateFrameRenderRequestV2(request, {
      renderContract: tapTileRenderContract,
      composition: tapTileCompositionProfile,
      renderer: backend.renderer,
    })).toEqual([]);
  });
});
