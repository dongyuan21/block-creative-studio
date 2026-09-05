import type { CaptureSuite } from '../../../capture/captureSuite';
import { TAPTILE_TRAY_MATCH3_GAME_ID } from '../manifest';

export interface TapTileCaptureStillSpec {
  id: string;
  role: 'after' | 'diagnostic';
  renderer: 'fixed-camera-cinematic';
  frame: 'idle' | 'tap' | 'flight' | 'match' | 'outcome';
}

export interface TapTileCaptureVideoSpec {
  id: string;
  renderer: 'fixed-camera-cinematic';
  takeId: 'director-gate-take';
}

export const TAPTILE_STILL_SPECS: readonly TapTileCaptureStillSpec[] = [
  { id: 'taptile-idle', role: 'after', renderer: 'fixed-camera-cinematic', frame: 'idle' },
  { id: 'taptile-tap', role: 'after', renderer: 'fixed-camera-cinematic', frame: 'tap' },
  { id: 'taptile-flight', role: 'after', renderer: 'fixed-camera-cinematic', frame: 'flight' },
  { id: 'taptile-match', role: 'after', renderer: 'fixed-camera-cinematic', frame: 'match' },
  { id: 'taptile-outcome', role: 'after', renderer: 'fixed-camera-cinematic', frame: 'outcome' },
];

export const tapTileCaptureSuite: CaptureSuite<TapTileCaptureStillSpec, TapTileCaptureVideoSpec> = {
  id: 'taptile-tray-match3.capture.v1',
  gameId: TAPTILE_TRAY_MATCH3_GAME_ID,
  stills: TAPTILE_STILL_SPECS,
  videos: [{
    id: 'taptile-gate-video',
    renderer: 'fixed-camera-cinematic',
    takeId: 'director-gate-take',
  }],
};
