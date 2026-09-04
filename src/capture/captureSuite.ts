export interface CaptureStillSpecBase {
  id: string;
  role: string;
  renderer: string;
}

export interface CaptureVideoSpecBase {
  id: string;
  renderer: string;
}

export interface CaptureSuite<Still extends CaptureStillSpecBase = CaptureStillSpecBase, Video extends CaptureVideoSpecBase = CaptureVideoSpecBase> {
  id: string;
  gameId: string;
  stills: readonly Still[];
  videos: readonly Video[];
}
