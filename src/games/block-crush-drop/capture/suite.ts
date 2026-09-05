import type { CaptureSuite } from '../../../capture/captureSuite';
import { BLOCK_CRUSH_DROP_GAME_ID } from '../manifest';

export interface CrushWoodCaptureStillSpec {
  id: string;
  role: 'after' | 'diagnostic';
  renderer: 'fixed-camera-cinematic';
  frame: 'idle' | 'fall' | 'impact' | 'crush' | 'collapse' | 'outcome';
}

export interface CrushWoodCaptureVideoSpec {
  id: string;
  renderer: 'fixed-camera-cinematic';
  takeId: 'reference-serpentine-clear';
}

export const CRUSH_WOOD_STILL_SPECS: readonly CrushWoodCaptureStillSpec[] = [
  { id: 'crush-wood-idle', role: 'after', renderer: 'fixed-camera-cinematic', frame: 'idle' },
  { id: 'crush-wood-fall', role: 'after', renderer: 'fixed-camera-cinematic', frame: 'fall' },
  { id: 'crush-wood-impact', role: 'after', renderer: 'fixed-camera-cinematic', frame: 'impact' },
  { id: 'crush-wood-fracture', role: 'after', renderer: 'fixed-camera-cinematic', frame: 'crush' },
  { id: 'crush-wood-collapse', role: 'after', renderer: 'fixed-camera-cinematic', frame: 'collapse' },
  { id: 'crush-wood-outcome', role: 'after', renderer: 'fixed-camera-cinematic', frame: 'outcome' },
];

export const crushWoodCaptureSuite: CaptureSuite<CrushWoodCaptureStillSpec, CrushWoodCaptureVideoSpec> = {
  id: 'block-crush-drop.capture.v1',
  gameId: BLOCK_CRUSH_DROP_GAME_ID,
  stills: CRUSH_WOOD_STILL_SPECS,
  videos: [{
    id: 'crush-wood-reference-video',
    renderer: 'fixed-camera-cinematic',
    takeId: 'reference-serpentine-clear',
  }],
};
