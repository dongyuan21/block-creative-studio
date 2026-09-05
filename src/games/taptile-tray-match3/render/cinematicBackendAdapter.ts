import type { PresentationPacket } from '../../../game-runtime/presentationPacket';
import {
  assertBackendSupportsPacket,
  type RenderBackendAdapter,
  type RenderStage,
} from '../../../rendering/backendRegistry';
import type { PreparedRenderResources } from '../../../rendering/preparedRenderResources';
import { compileTapTileLevel } from '../../../taptile/gameplay';
import {
  collectTapTileDrawableAssetIds,
  TapTileAssetCache,
} from '../../../taptile/render/AssetCache';
import { renderTapTilePresentationFrame } from '../../../taptile/render/CanvasRenderer';
import { TAPTILE_PRESENTATION_SCHEMA_ID, tapTilePayloadFromPacket } from '../presentation';

export const TAPTILE_CINEMATIC_BACKEND_ID = 'taptile-tray-match3.fixed-camera-cinematic';

export function createTapTileCinematicBackendAdapter(): RenderBackendAdapter {
  const adapter: RenderBackendAdapter = {
    id: TAPTILE_CINEMATIC_BACKEND_ID,
    renderer: 'fixed-camera-cinematic',
    supportedPresentationSchemas: [TAPTILE_PRESENTATION_SCHEMA_ID],
    letterboxFromDesign: false,
    createStage(canvas: HTMLCanvasElement, _resources: PreparedRenderResources): RenderStage {
      let assets: TapTileAssetCache | null = null;
      const draw = (packet: PresentationPacket): void => {
        assertBackendSupportsPacket(adapter, packet);
        const payload = tapTilePayloadFromPacket(packet);
        const cache = assets ?? new TapTileAssetCache(payload.project, {
          image: async () => {
            throw new Error('ASSET_IMAGE_ENVIRONMENT_UNAVAILABLE');
          },
        });
        renderTapTilePresentationFrame(canvas, payload.frame, {
          project: payload.project,
          level: compileTapTileLevel(payload.project),
          assets: cache,
        });
      };
      return {
        resize: (width, height, pixelRatio) => {
          const ratio = Math.max(1, pixelRatio ?? 1);
          canvas.width = Math.max(1, Math.round(width * ratio));
          canvas.height = Math.max(1, Math.round(height * ratio));
        },
        warmup: async (packet) => {
          assertBackendSupportsPacket(adapter, packet);
          const payload = tapTilePayloadFromPacket(packet);
          assets?.dispose();
          assets = new TapTileAssetCache(payload.project);
          if (typeof Image === 'undefined') return;
          try {
            await assets.preload(collectTapTileDrawableAssetIds(payload.project));
          } catch {
            // Headless Node has no Image decoder; procedural fallback still paints.
          }
        },
        renderAt: draw,
        captureStill: () => canvas,
        dispose: () => {
          assets?.dispose();
          assets = null;
        },
      };
    },
  };
  return adapter;
}

export const tapTileCinematicBackend = createTapTileCinematicBackendAdapter();
