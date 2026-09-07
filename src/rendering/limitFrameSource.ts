import type { CompiledFrameSource } from '../game-runtime/frameSource';
import { RenderBackendError } from './backendRegistry';

export function limitCompiledFrameSource(
  source: CompiledFrameSource,
  maxFrames: number,
): CompiledFrameSource {
  if (!Number.isInteger(maxFrames) || maxFrames <= 0) {
    throw new RenderBackendError('MAX_FRAMES_INVALID', 'maxFrames must be a positive integer.', '$.maxFrames');
  }
  if (maxFrames >= source.totalFrames) return source;
  return {
    gameId: source.gameId,
    takeId: source.takeId,
    fps: source.fps,
    totalFrames: maxFrames,
    frameSourceHash: source.frameSourceHash,
    evaluate(frameIndex: number) {
      if (frameIndex < 0 || frameIndex >= maxFrames) {
        throw new RangeError(`frame ${frameIndex} is outside limited source 0..${maxFrames - 1}`);
      }
      const packet = source.evaluate(frameIndex);
      return {
        ...packet,
        identity: {
          ...packet.identity,
          totalFrames: maxFrames,
        },
      };
    },
  };
}
