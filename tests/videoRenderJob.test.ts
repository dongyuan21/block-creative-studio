import { describe, expect, it } from 'vitest';
import type { CompiledFrameSource } from '../src/game-runtime/frameSource';
import {
  PRESENTATION_PACKET_CONTRACT,
  PRESENTATION_PACKET_CONTRACT_VERSION,
  type PresentationPacket,
} from '../src/game-runtime/presentationPacket';
import {
  RenderBackendError,
  assertBackendSupportsPacket,
  type RenderBackendAdapter,
} from '../src/rendering/backendRegistry';

function packet(schema: string, frameIndex = 0): PresentationPacket {
  return {
    contract: PRESENTATION_PACKET_CONTRACT,
    contractVersion: PRESENTATION_PACKET_CONTRACT_VERSION,
    identity: {
      gameId: 'dummy',
      moduleVersion: '0.0.1',
      takeId: 'dummy-take',
      frameIndex,
      fps: 30,
      totalFrames: 2,
      stateHash: `fnv1a32:${frameIndex}`,
      presentationHash: `fnv1a32:p${frameIndex}`,
    },
    semanticEvents: [],
    feedback: { cameraPunch: 0 },
    payloadSchemaId: schema,
    payload: { index: frameIndex },
  };
}

describe('video render job inputs', () => {
  it('lets a dummy backend consume a frame source without Block types', () => {
    const frames: number[] = [];
    const backend: RenderBackendAdapter = {
      id: 'dummy.job',
      renderer: 'dummy',
      supportedPresentationSchemas: ['bcs.dummy.presentation-frame.v1'],
      letterboxFromDesign: false,
      createStage() {
        return {
          resize() {},
          async warmup(next) {
            this.renderAt(next);
          },
          renderAt(next) {
            assertBackendSupportsPacket(backend, next);
            frames.push(next.identity.frameIndex);
          },
          dispose() {},
        };
      },
    };
    const frameSource: CompiledFrameSource = {
      gameId: 'dummy',
      takeId: 'dummy-take',
      fps: 30,
      totalFrames: 2,
      frameSourceHash: 'fnv1a32:source',
      evaluate: (index) => packet('bcs.dummy.presentation-frame.v1', index),
    };
    const stage = backend.createStage({} as HTMLCanvasElement, { revision: 'job' });
    for (let index = 0; index < frameSource.totalFrames; index += 1) {
      const next = frameSource.evaluate(index);
      assertBackendSupportsPacket(backend, next);
      stage.renderAt(next);
    }
    expect(frames).toEqual([0, 1]);
    stage.dispose();
  });

  it('rejects an unsupported schema before any dummy pixels are produced', () => {
    const backend: RenderBackendAdapter = {
      id: 'dummy.reject',
      renderer: 'dummy',
      supportedPresentationSchemas: ['bcs.dummy.presentation-frame.v1'],
      letterboxFromDesign: false,
      createStage() {
        return {
          resize() {},
          async warmup() {},
          renderAt() {
            throw new Error('should not render');
          },
          dispose() {},
        };
      },
    };
    expect(() => assertBackendSupportsPacket(backend, packet('bcs.other.presentation-frame.v1'))).toThrow(
      RenderBackendError,
    );
  });
});
