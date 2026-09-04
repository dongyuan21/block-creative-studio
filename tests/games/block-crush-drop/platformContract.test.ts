import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createHeadlessPlatform } from '../../../src/bootstrap/gamePackage';
import { blockPlacementPackage } from '../../../src/games/block-placement/package';
import { compileFrameSourceFromDocument, validateStudioProjectDocumentV2 } from '../../../src/game-runtime/projectDocument';
import { catalogAcceptsEvent } from '../../../src/game-runtime/renderContract';
import { AssetRegistry } from '../../../src/headless/assetRegistry';
import type { EffectPackManifest, LookPackManifest } from '../../../src/headless/contracts';
import { compileVariantV2 } from '../../../src/headless/variantCompilerV2';
import { buildCreativeMasterV2 } from '../../../src/headless/creativeMasterV2';
import { createCalibrationCase } from '../../../src/headless/calibration';
import { createFrameRenderRequestV2, validateFrameRenderRequestV2 } from '../../../src/headless/frameRequestV2';
import { requireCaptureSuite } from '../../../src/capture/captureSuiteRegistry';
import { getDefaultCalibrationProfile, requireCalibrationProfile } from '../../../src/rendering/compositionRegistry';
import { requireRenderBackend } from '../../../src/rendering/backendRegistry';
import { assertPacketMatchesFrameSource, assertVideoRenderJobContract } from '../../../src/rendering/renderJob';
import { readyRenderResources } from '../../../src/rendering/preparedRenderResources';
import { bindPreparedResources } from '../../../src/rendering/resourcePolicy';
import { makeFixture, ref } from '../../headlessFixtures';
import {
  CRUSH_CALIBRATION_ID,
  CRUSH_COMPOSITION_ID,
  CRUSH_GAME_ID,
  CRUSH_MODULE_VERSION,
  CRUSH_PRESENTATION_SCHEMA_ID,
  crushCaptureSuite,
  crushCompositionProfile,
  crushDiagnosticBackend,
  crushRenderContract,
  createCrushDiagnosticDocument,
  fakeCrushPackage,
} from './fakeCrushPackage';

describe('fake block-crush-drop platform contract', () => {
  it('registers a second game without changing platform compiler exporter or studio shell', () => {
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

  it('walks package → registry → V2 validation → frame source → contract → effect → profiles → job', () => {
    const platform = createHeadlessPlatform([blockPlacementPackage, fakeCrushPackage]);
    expect(platform.games.require(CRUSH_GAME_ID).manifest.gameId).toBe(CRUSH_GAME_ID);
    expect(platform.renderContracts.require(crushRenderContract.id).gameId).toBe(CRUSH_GAME_ID);
    expect(platform.presentations.require(CRUSH_GAME_ID).gameId).toBe(CRUSH_GAME_ID);
    expect(requireCalibrationProfile(CRUSH_CALIBRATION_ID).rois.map((roi) => roi.id)).toEqual(['well', 'impact']);
    expect(getDefaultCalibrationProfile().gameId).toBe('block-placement');
    expect(requireCaptureSuite(CRUSH_GAME_ID).stills).toHaveLength(1);
    expect(requireRenderBackend(crushDiagnosticBackend.id).supportedPresentationSchemas).toEqual(
      crushDiagnosticBackend.supportedPresentationSchemas,
    );
    expect(crushCaptureSuite.stills).toHaveLength(1);

    const document = createCrushDiagnosticDocument();
    const validated = validateStudioProjectDocumentV2(document, platform.games);
    expect(validated.parsed.takes[0]?.actions).toEqual([{ column: 0 }]);

    const frameSource = compileFrameSourceFromDocument(document, platform, {
      takeId: 'drop-0',
      directorProfile: {},
      fps: 30,
    });
    expect(frameSource.gameId).toBe(CRUSH_GAME_ID);
    const packet0 = frameSource.evaluate(0);
    assertPacketMatchesFrameSource(packet0, frameSource, 0);
    expect(packet0.semanticEvents.some((item) => item.type === 'block-crush.impact')).toBe(true);

    expect(catalogAcceptsEvent(crushRenderContract, 'block-crush.collapse')).toBe(true);
    expect(catalogAcceptsEvent(crushRenderContract, 'line-clear')).toBe(false);

    const crushCase = createCalibrationCase({
      id: 'crush-roi',
      eventId: 'impact',
      eventType: 'block-crush.impact',
      targetFrame: 0,
      correspondence: 'isolated-presentation',
      calibrationProfileId: CRUSH_CALIBRATION_ID,
    });
    expect(crushCase.roi.map((roi) => roi.id)).toEqual(['well', 'impact']);
    expect(crushCase.compositionProfileId).toBe(CRUSH_COMPOSITION_ID);
    expect(getDefaultCalibrationProfile().rois.some((roi) => roi.id === 'tray')).toBe(true);
    expect(() => createCalibrationCase({
      id: 'missing-profile',
      eventId: 'impact',
      eventType: 'block-crush.impact',
      targetFrame: 0,
      correspondence: 'isolated-presentation',
    })).toThrow(/calibrationProfileId/);
    expect(() => createCalibrationCase({
      id: 'wrong-composition',
      eventId: 'impact',
      eventType: 'block-crush.impact',
      targetFrame: 0,
      correspondence: 'isolated-presentation',
      calibrationProfileId: CRUSH_CALIBRATION_ID,
      compositionProfileId: 'block-placement.composition.v1',
    })).toThrow(/does not match calibration/);

    const fixture = makeFixture();
    const crushEffect: EffectPackManifest = {
      ...(fixture.assets.find((item) => item.id === 'effect.copper-clear') as EffectPackManifest),
      id: 'effect.crush-impact',
      supportedEvents: ['block-crush.impact', 'block-crush.crush-resolved', 'block-crush.collapse'],
    };
    const look: LookPackManifest = {
      ...(fixture.assets.find((item) => item.id === 'look.copper') as LookPackManifest),
      id: 'look.crush',
      slots: {
        'tile.material': ref('material.copper', 'material-pack', 'b'),
        'clear.primary': { id: 'effect.crush-impact', version: '1.0.0', kind: 'effect-pack', contentHash: crushEffect.contentHash },
        'crush.board': ref('background.dark', 'background', 'f'),
      },
    };
    const assets = fixture.assets.filter((item) => item.id !== 'look.copper').concat(look, crushEffect);
    const master = buildCreativeMasterV2(document, platform.games, {
      id: 'master.crush',
      takeId: 'drop-0',
      renderContract: crushRenderContract,
      fps: 30,
      totalFrames: frameSource.totalFrames,
      semanticHash: 'fnv1a32:crush',
    });
    const recipe = {
      ...fixture.recipe,
      id: 'variant.crush',
      masterId: 'master.crush',
      lockMode: 'semantic' as const,
      lookPackRef: { id: 'look.crush', version: '1.0.0', kind: 'look-pack' as const, contentHash: look.contentHash },
    };
    const plan = compileVariantV2(master, recipe, new AssetRegistry(assets), crushRenderContract, {
      renderer: 'fixed-camera-cinematic',
      requireHashes: true,
    });
    expect(plan.slots['tile.material']).toBeDefined();
    expect(plan.slots['clear.primary']).toBeDefined();
    expect(plan.slots['crush.board']).toBeDefined();
    expect(plan.game.id).toBe(CRUSH_GAME_ID);

    const resources = readyRenderResources(plan.planHash, {
      slots: [
        { slotId: 'tile.material', uri: 'mem:tile', contentHash: 'sha256:b', readiness: 'ready' },
        { slotId: 'clear.primary', uri: 'mem:fx', contentHash: crushEffect.contentHash ?? 'sha256:c', readiness: 'ready' },
        { slotId: 'crush.board', uri: 'mem:board', contentHash: 'sha256:f', readiness: 'ready' },
      ],
    });
    const backend = requireRenderBackend(crushDiagnosticBackend.id);
    const resourcePolicy = bindPreparedResources({
      plan,
      resources,
      renderContract: crushRenderContract,
      backend,
    });
    assertVideoRenderJobContract({
      frameSource,
      backend,
      output: { width: 1080, height: 1920, fps: frameSource.fps, quality: 'preview' },
      projectName: 'crush',
      takeName: 'drop-0',
      resourcePolicy,
      plan,
      renderContract: crushRenderContract,
    });

    const request = createFrameRenderRequestV2({
      gameId: CRUSH_GAME_ID,
      moduleVersion: CRUSH_MODULE_VERSION,
      renderContract: crushRenderContract,
      presentationSchemaId: CRUSH_PRESENTATION_SCHEMA_ID,
      composition: crushCompositionProfile,
      planId: plan.id,
      planHash: plan.planHash,
      takeId: frameSource.takeId,
      frameIndex: 0,
      fps: frameSource.fps,
      renderer: backend.renderer,
      coordinateSpace: 'design',
    });
    expect(request.targetPixels).toEqual(crushCompositionProfile.designResolution);
    expect(request.passIds).toEqual(['crush-well']);
    expect(validateFrameRenderRequestV2(request, {
      renderContract: crushRenderContract,
      composition: crushCompositionProfile,
      renderer: backend.renderer,
    })).toEqual([]);
    expect(requireCaptureSuite(CRUSH_GAME_ID).stills[0]?.renderer).toBe(backend.renderer);
  });
});
