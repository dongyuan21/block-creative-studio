import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createHeadlessPlatform } from '../../../src/bootstrap/gamePackage';
import { requireCaptureSuite } from '../../../src/capture/captureSuiteRegistry';
import { compileFrameSourceFromDocument, validateStudioProjectDocumentV2 } from '../../../src/game-runtime/projectDocument';
import { catalogAcceptsEvent } from '../../../src/game-runtime/renderContract';
import { crushWoodCaptureSuite } from '../../../src/games/block-crush-drop/capture/suite';
import { blockCrushDropPackage } from '../../../src/games/block-crush-drop/package';
import {
  BLOCK_CRUSH_DROP_GAME_ID,
  BLOCK_CRUSH_DROP_MODULE_VERSION,
} from '../../../src/games/block-crush-drop/manifest';
import {
  CRUSH_WOOD_PRESENTATION_SCHEMA_ID,
  crushWoodPayloadFromPacket,
} from '../../../src/games/block-crush-drop/presentation';
import {
  createCrushWoodReferenceDocument,
  CRUSH_WOOD_REFERENCE_TAKE_ID,
} from '../../../src/games/block-crush-drop/project';
import {
  CRUSH_WOOD_CALIBRATION_PROFILE_ID,
} from '../../../src/games/block-crush-drop/profiles/calibration';
import { crushWoodCompositionProfile } from '../../../src/games/block-crush-drop/profiles/composition';
import { CRUSH_WOOD_CINEMATIC_BACKEND_ID } from '../../../src/games/block-crush-drop/render/cinematicBackendAdapter';
import { crushWoodRenderContract } from '../../../src/games/block-crush-drop/render/renderContract';
import { blockPlacementPackage } from '../../../src/games/block-placement/package';
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

describe('block-crush-drop platform contract', () => {
  it('keeps platform compiler, exporter, render job, capture, and Studio shell free of game branches', () => {
    const variantSource = readFileSync(resolve(process.cwd(), 'src/headless/variantCompilerV2.ts'), 'utf8');
    const exporterSource = readFileSync(resolve(process.cwd(), 'src/exporter/offlineVideoExporter.ts'), 'utf8');
    const shellSource = readFileSync(resolve(process.cwd(), 'src/studio/StudioShell.tsx'), 'utf8');
    const jobSource = readFileSync(resolve(process.cwd(), 'src/rendering/renderJob.ts'), 'utf8');
    const studioRegistrySource = readFileSync(resolve(process.cwd(), 'src/studio/gameStudioRegistry.ts'), 'utf8');
    const captureV2Source = readFileSync(resolve(process.cwd(), 'src/capture/v2/captureStill.ts'), 'utf8');
    expect(variantSource).not.toMatch(/block-placement\./);
    expect(variantSource).not.toMatch(/block-crush/);
    expect(exporterSource).not.toMatch(/block-crush/);
    expect(shellSource).not.toMatch(/block-crush/);
    expect(shellSource).not.toMatch(/vita-mahjong/);
    expect(jobSource).not.toMatch(/block-crush|block-placement/);
    expect(studioRegistrySource).not.toMatch(/block-crush|block-placement|vita-mahjong/);
    expect(captureV2Source).not.toMatch(/block-crush|block-placement|vita-mahjong/);
  });

  it('walks the real package through registry, V2 validation, frame source, variant plan, profiles, and render job', () => {
    const platform = createHeadlessPlatform([blockPlacementPackage, blockCrushDropPackage]);
    expect(platform.games.require(BLOCK_CRUSH_DROP_GAME_ID).manifest.moduleVersion).toBe(BLOCK_CRUSH_DROP_MODULE_VERSION);
    expect(platform.renderContracts.require(crushWoodRenderContract.id).gameId).toBe(BLOCK_CRUSH_DROP_GAME_ID);
    expect(platform.presentations.require(BLOCK_CRUSH_DROP_GAME_ID).gameId).toBe(BLOCK_CRUSH_DROP_GAME_ID);
    expect(requireCalibrationProfile(CRUSH_WOOD_CALIBRATION_PROFILE_ID).rois.map((roi) => roi.id)).toEqual([
      'well',
      'preview-queue',
      'impact-band',
      'score',
      'debris-envelope',
    ]);
    expect(getDefaultCalibrationProfile().gameId).toBe('block-placement');
    expect(requireCaptureSuite(BLOCK_CRUSH_DROP_GAME_ID).id).toBe(crushWoodCaptureSuite.id);
    expect(requireCaptureSuite(BLOCK_CRUSH_DROP_GAME_ID).stills).toHaveLength(6);

    const document = createCrushWoodReferenceDocument();
    const validated = validateStudioProjectDocumentV2(document, platform.games);
    expect(validated.parsed.takes[0]?.actions).toHaveLength(9);

    const frameSource = compileFrameSourceFromDocument(document, platform, {
      takeId: CRUSH_WOOD_REFERENCE_TAKE_ID,
      directorProfile: document.direction?.rhythm ?? {},
      fps: 30,
    });
    let crushFrame = -1;
    for (let frame = 0; frame < frameSource.totalFrames; frame += 1) {
      if (crushWoodPayloadFromPacket(frameSource.evaluate(frame)).phase === 'crush') {
        crushFrame = frame;
        break;
      }
    }
    expect(crushFrame).toBeGreaterThan(0);
    const packet = frameSource.evaluate(crushFrame);
    assertPacketMatchesFrameSource(packet, frameSource, crushFrame);
    expect(packet.semanticEvents.some((item) => item.type === 'block-crush.crush-resolved')).toBe(true);
    expect(catalogAcceptsEvent(crushWoodRenderContract, 'block-crush.collapse')).toBe(true);
    expect(catalogAcceptsEvent(crushWoodRenderContract, 'line-clear')).toBe(false);

    const crushCase = createCalibrationCase({
      id: 'crush-fracture-roi',
      eventId: 'crush-resolved',
      eventType: 'block-crush.crush-resolved',
      targetFrame: crushFrame,
      correspondence: 'isolated-presentation',
      calibrationProfileId: CRUSH_WOOD_CALIBRATION_PROFILE_ID,
    });
    expect(crushCase.roi.map((roi) => roi.id)).toEqual([
      'well',
      'preview-queue',
      'impact-band',
      'score',
      'debris-envelope',
    ]);
    expect(crushCase.compositionProfileId).toBe(crushWoodCompositionProfile.id);

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
    const crushEffect: EffectPackManifest = {
      ...(fixture.assets.find((item) => item.id === 'effect.copper-clear') as EffectPackManifest),
      id: 'effect.crush-wood.fracture',
      supportedEvents: crushWoodRenderContract.eventCatalog.map((event) => event.type),
    };
    const look: LookPackManifest = {
      ...(fixture.assets.find((item) => item.id === 'look.copper') as LookPackManifest),
      id: document.production.lookPackRef.id,
      version: document.production.lookPackRef.version,
      slots: {
        'tile.material': ref('material.copper', 'material-pack', 'b'),
        'clear.primary': {
          id: crushEffect.id,
          version: crushEffect.version,
          kind: 'effect-pack',
          contentHash: crushEffect.contentHash,
        },
        'crush.board': ref('background.dark', 'background', 'f'),
      },
    };
    const assets = fixture.assets
      .filter((item) => !['layout.vertical', 'camera.fixed', 'look.copper'].includes(item.id))
      .concat(layout, camera, look, crushEffect);
    const master = buildCreativeMasterV2(document, platform.games, {
      id: 'master.crush-wood',
      takeId: CRUSH_WOOD_REFERENCE_TAKE_ID,
      renderContract: crushWoodRenderContract,
      fps: 30,
      totalFrames: frameSource.totalFrames,
      semanticHash: frameSource.frameSourceHash,
    });
    const plan = compileVariantV2(
      master,
      {
        ...fixture.recipe,
        id: 'variant.crush-wood',
        masterId: 'master.crush-wood',
        lockMode: 'semantic',
        lookPackRef: {
          id: look.id,
          version: look.version,
          kind: 'look-pack',
          contentHash: look.contentHash,
        },
      },
      new AssetRegistry(assets),
      crushWoodRenderContract,
      { renderer: 'fixed-camera-cinematic', requireHashes: true },
    );
    expect(plan.slots['tile.material']).toBeDefined();
    expect(plan.slots['clear.primary']).toBeDefined();
    expect(plan.slots['crush.board']).toBeDefined();
    expect(plan.game.id).toBe(BLOCK_CRUSH_DROP_GAME_ID);

    const backend = requireRenderBackend(CRUSH_WOOD_CINEMATIC_BACKEND_ID);
    const resources = readyRenderResources(plan.planHash, {
      slots: [
        { slotId: 'tile.material', uri: 'mem:tile', contentHash: 'sha256:b', readiness: 'ready' },
        { slotId: 'clear.primary', uri: 'mem:fx', contentHash: crushEffect.contentHash ?? 'sha256:c', readiness: 'ready' },
        { slotId: 'crush.board', uri: 'mem:board', contentHash: 'sha256:f', readiness: 'ready' },
      ],
    });
    const resourcePolicy = bindPreparedResources({
      plan,
      resources,
      renderContract: crushWoodRenderContract,
      backend,
    });
    assertVideoRenderJobContract({
      frameSource,
      backend,
      output: { width: 1080, height: 1920, fps: frameSource.fps, quality: 'preview' },
      projectName: 'crush-wood',
      takeName: CRUSH_WOOD_REFERENCE_TAKE_ID,
      resourcePolicy,
      plan,
      renderContract: crushWoodRenderContract,
    });

    const request = createFrameRenderRequestV2({
      gameId: BLOCK_CRUSH_DROP_GAME_ID,
      moduleVersion: BLOCK_CRUSH_DROP_MODULE_VERSION,
      renderContract: crushWoodRenderContract,
      presentationSchemaId: CRUSH_WOOD_PRESENTATION_SCHEMA_ID,
      composition: crushWoodCompositionProfile,
      planId: plan.id,
      planHash: plan.planHash,
      takeId: frameSource.takeId,
      frameIndex: crushFrame,
      fps: frameSource.fps,
      renderer: backend.renderer,
      coordinateSpace: 'video',
    });
    expect(request.targetPixels).toEqual({ width: 1080, height: 1920 });
    expect(request.passIds).toEqual([
      'crush-background',
      'crush-well',
      'crush-fragments',
      'crush-hud',
    ]);
    expect(validateFrameRenderRequestV2(request, {
      renderContract: crushWoodRenderContract,
      composition: crushWoodCompositionProfile,
      renderer: backend.renderer,
    })).toEqual([]);
  });
});
