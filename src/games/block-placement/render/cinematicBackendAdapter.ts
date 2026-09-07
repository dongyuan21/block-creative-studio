import type { RuntimeAssetBindings } from '../../../assets/runtimeAssetBindings';
import type { StyleSpec } from '../../../domain/types';
import type { PresentationPacket } from '../../../game-runtime/presentationPacket';
import { StudioScene } from './BlockPlacementCinematicScene';
import {
  lookPackIdFromRuntimeAssets,
  resolveBlockPlacementCinematicStyle,
} from './cinematicLooks';
import {
  assertBackendSupportsPacket,
  type RenderBackendAdapter,
  type RenderStage,
} from '../../../rendering/backendRegistry';
import type { PreparedRenderResources } from '../../../rendering/preparedRenderResources';
import {
  BLOCK_PLACEMENT_PRESENTATION_SCHEMA_ID,
  blockPlacementFrameFromPacket,
} from '../presentation/legacyPresentationAdapter';

export const BLOCK_PLACEMENT_CINEMATIC_BACKEND_ID = 'block-placement.fixed-camera-cinematic';
export {
  lookPackIdFromRuntimeAssets,
  resolveBlockPlacementCinematicStyle,
} from './cinematicLooks';

function isRuntimeAssetBindings(value: unknown): value is RuntimeAssetBindings {
  return value !== null && typeof value === 'object' && 'revision' in value;
}

function createPlacementStage(
  canvas: HTMLCanvasElement,
  resources: PreparedRenderResources,
  style: StyleSpec,
  adapter: RenderBackendAdapter,
): RenderStage {
  const scene = new StudioScene(canvas, { quality: 'cinematic' });
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
    dispose: () => scene.dispose(),
  };
}

function placementCinematicAdapter(
  resolveStyle: (resources: PreparedRenderResources) => StyleSpec,
): RenderBackendAdapter {
  const adapter: RenderBackendAdapter = {
    id: BLOCK_PLACEMENT_CINEMATIC_BACKEND_ID,
    renderer: 'fixed-camera-cinematic',
    supportedPresentationSchemas: [BLOCK_PLACEMENT_PRESENTATION_SCHEMA_ID],
    letterboxFromDesign: false,
    createStage(canvas: HTMLCanvasElement, resources: PreparedRenderResources): RenderStage {
      return createPlacementStage(canvas, resources, resolveStyle(resources), adapter);
    },
  };
  return adapter;
}

export function createBlockPlacementCinematicBackendAdapter(style: StyleSpec): RenderBackendAdapter {
  return placementCinematicAdapter(() => style);
}

export const blockPlacementCinematicBackend = placementCinematicAdapter((resources) => (
  resolveBlockPlacementCinematicStyle(lookPackIdFromRuntimeAssets(resources.runtimeAssets))
));
