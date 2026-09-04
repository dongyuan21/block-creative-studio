import type { RuntimeAssetBindings } from '../../../assets/runtimeAssetBindings';
import type { StyleSpec } from '../../../domain/types';
import type { PresentationPacket } from '../../../game-runtime/presentationPacket';
import { Reference2DScene } from '../../../reference2d/Reference2DScene';
import {
  assertBackendSupportsPacket,
  type RenderBackendAdapter,
  type RenderStage,
} from '../../../rendering/backendRegistry';
import type { PreparedRenderResources } from '../../../rendering/preparedRenderResources';
import { blockPlacementCompositionProfile } from '../profiles/composition';
import {
  BLOCK_PLACEMENT_PRESENTATION_SCHEMA_ID,
  blockPlacementFrameFromPacket,
} from '../presentation/legacyPresentationAdapter';

function isRuntimeAssetBindings(value: unknown): value is RuntimeAssetBindings {
  return value !== null && typeof value === 'object' && 'revision' in value;
}

export function createBlockPlacementReferenceBackendAdapter(style: StyleSpec): RenderBackendAdapter {
  const adapter: RenderBackendAdapter = {
    id: 'block-placement.reference-2d',
    renderer: 'reference-2d',
    supportedPresentationSchemas: [BLOCK_PLACEMENT_PRESENTATION_SCHEMA_ID],
    letterboxFromDesign: true,
    designResolution: {
      width: blockPlacementCompositionProfile.designResolution.width,
      height: blockPlacementCompositionProfile.designResolution.height,
    },
    createStage(canvas: HTMLCanvasElement, resources: PreparedRenderResources): RenderStage {
      const scene = new Reference2DScene(canvas, { quality: 'cinematic' });
      if (isRuntimeAssetBindings(resources.runtimeAssets)) {
        scene.setRuntimeAssets(resources.runtimeAssets);
      }
      const draw = (packet: PresentationPacket, mode: 'warmup' | 'frame'): Promise<void> | void => {
        assertBackendSupportsPacket(adapter, packet);
        const frame = blockPlacementFrameFromPacket(packet);
        return mode === 'warmup' ? scene.warmup(frame, style) : scene.renderAt(frame, style);
      };
      return {
        resize: (width, height, pixelRatio) => scene.resize(width, height, pixelRatio),
        warmup: async (packet) => {
          await draw(packet, 'warmup');
        },
        renderAt: (packet) => {
          draw(packet, 'frame');
        },
        captureStill: () => scene.captureNativeFrame({ requireAssets: true }),
        dispose: () => scene.dispose(),
      };
    },
  };
  return adapter;
}
