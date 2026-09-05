import type { PresentationPacket } from '../../../game-runtime/presentationPacket';
import {
  assertBackendSupportsPacket,
  type RenderBackendAdapter,
  type RenderStage,
} from '../../../rendering/backendRegistry';
import type { PreparedRenderResources } from '../../../rendering/preparedRenderResources';
import { CRUSH_WOOD_PRESENTATION_SCHEMA_ID } from '../presentation';
import { CrushWoodCanvasScene } from './CrushWoodCanvasScene';

export const CRUSH_WOOD_CINEMATIC_BACKEND_ID = 'block-crush-drop.fixed-camera-cinematic';

export function createCrushWoodCinematicBackendAdapter(): RenderBackendAdapter {
  const adapter: RenderBackendAdapter = {
    id: CRUSH_WOOD_CINEMATIC_BACKEND_ID,
    renderer: 'fixed-camera-cinematic',
    supportedPresentationSchemas: [CRUSH_WOOD_PRESENTATION_SCHEMA_ID],
    letterboxFromDesign: false,
    createStage(canvas: HTMLCanvasElement, _resources: PreparedRenderResources): RenderStage {
      const scene = new CrushWoodCanvasScene(canvas);
      const draw = (packet: PresentationPacket): void => {
        assertBackendSupportsPacket(adapter, packet);
        scene.renderAt(packet);
      };
      return {
        resize: (width, height, pixelRatio) => scene.resize(width, height, pixelRatio),
        warmup: async (packet) => {
          assertBackendSupportsPacket(adapter, packet);
          await scene.warmup(packet);
        },
        renderAt: draw,
        captureStill: () => canvas,
        dispose: () => scene.dispose(),
      };
    },
  };
  return adapter;
}

export const crushWoodCinematicBackend = createCrushWoodCinematicBackendAdapter();
