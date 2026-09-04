import { describe, expect, it } from 'vitest';
import { createFrameRenderRequest, validateFrameRenderRequest } from '../src/headless/frameRequest';
import { createFrameRenderRequestV2, validateFrameRenderRequestV2 } from '../src/headless/frameRequestV2';
import { REFERENCE_PASS_ORDER } from '../src/headless/contracts';
import { blockPlacementCompositionProfile } from '../src/games/block-placement/profiles/composition';
import { blockPlacementRenderContract } from '../src/games/block-placement/render/renderContract';
import { crushCompositionProfile, crushRenderContract } from './games/block-crush-drop/fakeCrushPackage';

describe('frame render request V1 vs V2', () => {
  it('keeps the V1 request bound to the default composition and Block pass list', () => {
    const request = createFrameRenderRequest({
      planId: 'plan',
      planHash: 'fnv1a32:plan',
      takeId: 'take',
      takeHash: 'fnv1a32:take',
      frameIndex: 0,
      fps: 30,
      renderer: 'reference-2d',
    });
    expect(request.enabledPasses).toEqual([...REFERENCE_PASS_ORDER]);
    expect(validateFrameRenderRequest(request)).toEqual([]);
  });

  it('derives V2 pixels from the requested composition and rejects foreign passes', () => {
    const request = createFrameRenderRequestV2({
      gameId: crushRenderContract.gameId,
      moduleVersion: crushRenderContract.version,
      renderContract: crushRenderContract,
      presentationSchemaId: crushRenderContract.backends['fixed-camera-cinematic']!.supportedPresentationSchemas[0]!,
      composition: crushCompositionProfile,
      planId: 'plan.crush',
      planHash: 'fnv1a32:crush',
      takeId: 'drop-0',
      frameIndex: 0,
      fps: 30,
      renderer: 'fixed-camera-cinematic',
      coordinateSpace: 'video',
    });
    expect(request.targetPixels).toEqual(crushCompositionProfile.videoResolution);
    expect(request.passIds).toEqual(['crush-well']);
    expect(validateFrameRenderRequestV2(request, {
      renderContract: crushRenderContract,
      composition: crushCompositionProfile,
      renderer: 'fixed-camera-cinematic',
    })).toEqual([]);
    expect(validateFrameRenderRequestV2({ ...request, passIds: ['board', 'tray'] }, {
      renderContract: crushRenderContract,
      composition: crushCompositionProfile,
      renderer: 'fixed-camera-cinematic',
    }).some((issue) => issue.code === 'FRAME_PASS_UNKNOWN')).toBe(true);
    expect(validateFrameRenderRequestV2(request, {
      renderContract: blockPlacementRenderContract,
      composition: blockPlacementCompositionProfile,
      renderer: 'fixed-camera-cinematic',
    }).length).toBeGreaterThan(0);
  });
});
