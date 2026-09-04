import type { PresentationPacket } from '../../../game-runtime/presentationPacket';
import {
  assertBackendSupportsPacket,
  type RenderBackendAdapter,
} from '../../../rendering/backendRegistry';
import { tapTileCompositionProfile } from '../profiles/composition';
import { TAPTILE_PRESENTATION_SCHEMA_ID } from '../presentation/presentationAdapter';

export function createTapTileDiagnosticBackend(): RenderBackendAdapter {
  const adapter: RenderBackendAdapter = {
    id: 'taptile-tray-match3.diagnostic',
    renderer: 'reference-2d',
    supportedPresentationSchemas: [TAPTILE_PRESENTATION_SCHEMA_ID],
    letterboxFromDesign: true,
    designResolution: {
      width: tapTileCompositionProfile.designResolution.width,
      height: tapTileCompositionProfile.designResolution.height,
    },
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
        renderAt(packet: PresentationPacket) {
          assertBackendSupportsPacket(adapter, packet);
          const context = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
          if (!context) return;
          const width = canvas.width || tapTileCompositionProfile.videoResolution.width;
          const height = canvas.height || tapTileCompositionProfile.videoResolution.height;
          context.fillStyle = packet.identity.frameIndex === 0 ? '#1c2740' : '#24345a';
          context.fillRect(0, 0, width, height);
          const playfield = tapTileCompositionProfile.playfield;
          context.fillStyle = '#0f1728';
          context.fillRect(playfield.x, playfield.y, playfield.width, playfield.height);
          context.fillStyle = '#6b74ff';
          context.fillRect(30, 215, 1020, 170);
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

export const tapTileDiagnosticBackend = createTapTileDiagnosticBackend();
