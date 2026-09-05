import { createHeadlessPlatform } from '../../../src/bootstrap/gamePackage';
import { captureStillV2 } from '../../../src/capture/v2/captureStill';
import { requireCaptureSuite } from '../../../src/capture/captureSuiteRegistry';
import { compileFrameSourceFromDocument } from '../../../src/game-runtime/projectDocument';
import { blockCrushDropPackage } from '../../../src/games/block-crush-drop/package';
import { BLOCK_CRUSH_DROP_GAME_ID, BLOCK_CRUSH_DROP_MODULE_VERSION } from '../../../src/games/block-crush-drop/manifest';
import {
  CRUSH_WOOD_PRESENTATION_SCHEMA_ID,
  crushWoodPayloadFromPacket,
} from '../../../src/games/block-crush-drop/presentation';
import {
  createCrushWoodReferenceDocument,
  CRUSH_WOOD_REFERENCE_TAKE_ID,
} from '../../../src/games/block-crush-drop/project';
import { crushWoodCompositionProfile } from '../../../src/games/block-crush-drop/profiles/composition';
import { CRUSH_WOOD_CINEMATIC_BACKEND_ID } from '../../../src/games/block-crush-drop/render/cinematicBackendAdapter';
import { crushWoodRenderContract } from '../../../src/games/block-crush-drop/render/renderContract';
import type { CrushWoodPhase } from '../../../src/games/block-crush-drop/types';
import { createFrameRenderRequestV2 } from '../../../src/headless/frameRequestV2';
import { requireRenderBackend } from '../../../src/rendering/backendRegistry';

interface CaptureReport {
  status: 'PASS' | 'FAIL';
  mode: string;
  startedAt: string;
  finishedAt?: string;
  browser: string;
  webglRenderer: string | null;
  videoEncoder: boolean;
  tests: Array<{ name: string; status: 'PASS' | 'FAIL' | 'NOT_RUN'; detail?: string }>;
  frames: Array<{ id: string; path: string; sha256: string; width: number; height: number }>;
  videos: Array<{ id: string; path: string; sha256: string; bytes: number; frameCount: number; durationSeconds: number }>;
  planHashes: unknown[];
  errors: string[];
}

const statusEl = document.createElement('pre');
statusEl.id = 'capture-status';
statusEl.textContent = 'Crush Wooood reference capture starting…';
document.body.style.margin = '0';
document.body.style.background = '#12080a';
document.body.style.color = '#f4f1ea';
document.body.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, monospace';
document.body.append(statusEl);

const params = new URLSearchParams(location.search);
const autorun = params.get('autorun') !== '0';

function log(message: string): void {
  statusEl.textContent += `\n${message}`;
  console.info(message);
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function postArtifact(path: string, blob: Blob, meta: Record<string, unknown>): Promise<{ sha256?: string }> {
  const response = await fetch('/__capture/artifact', {
    method: 'POST',
    headers: {
      'x-artifact-path': path,
      'x-artifact-meta': JSON.stringify(meta),
    },
    body: blob,
  });
  if (!response.ok) throw new Error(`artifact upload failed: ${path} ${response.status}`);
  return response.json() as Promise<{ sha256?: string }>;
}

async function postJson(path: string, body: unknown): Promise<void> {
  await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function phaseFrame(
  frameSource: ReturnType<typeof compileFrameSourceFromDocument>,
  phase: CrushWoodPhase,
  minimumProgress = 0,
): number {
  for (let frame = 0; frame < frameSource.totalFrames; frame += 1) {
    const payload = crushWoodPayloadFromPacket(frameSource.evaluate(frame));
    if (payload.phase === phase && payload.phaseProgress >= minimumProgress) return frame;
  }
  throw new Error(`Unable to find ${phase} frame in Crush Wood reference take.`);
}

async function run(): Promise<CaptureReport> {
  const report: CaptureReport = {
    status: 'PASS',
    mode: 'crush-reference',
    startedAt: new Date().toISOString(),
    browser: navigator.userAgent,
    webglRenderer: null,
    videoEncoder: typeof VideoEncoder === 'function',
    tests: [],
    frames: [],
    videos: [],
    planHashes: [],
    errors: [],
  };
  try {
    const platform = createHeadlessPlatform([blockCrushDropPackage]);
    const project = createCrushWoodReferenceDocument();
    const frameSource = compileFrameSourceFromDocument(project, platform, {
      takeId: CRUSH_WOOD_REFERENCE_TAKE_ID,
      directorProfile: project.direction?.rhythm ?? {},
      fps: 30,
    });
    const backend = requireRenderBackend(CRUSH_WOOD_CINEMATIC_BACKEND_ID);
    const suite = requireCaptureSuite(BLOCK_CRUSH_DROP_GAME_ID);
    const anchors = [
      { id: 'idle', phase: 'idle' as const, progress: 0 },
      { id: 'fall', phase: 'fall' as const, progress: 0.62 },
      { id: 'crush', phase: 'crush' as const, progress: 0.5 },
      { id: 'collapse', phase: 'collapse' as const, progress: 0.72 },
    ];

    for (const anchor of anchors) {
      const frameIndex = phaseFrame(frameSource, anchor.phase, anchor.progress);
      const request = createFrameRenderRequestV2({
        gameId: BLOCK_CRUSH_DROP_GAME_ID,
        moduleVersion: BLOCK_CRUSH_DROP_MODULE_VERSION,
        renderContract: crushWoodRenderContract,
        presentationSchemaId: CRUSH_WOOD_PRESENTATION_SCHEMA_ID,
        composition: crushWoodCompositionProfile,
        planId: 'procedural.crush-wood.reference',
        planHash: frameSource.frameSourceHash,
        takeId: frameSource.takeId,
        frameIndex,
        fps: frameSource.fps,
        renderer: backend.renderer,
        coordinateSpace: 'video',
      });
      const canvas = document.createElement('canvas');
      const captured = await captureStillV2(canvas, {
        request,
        frameSource,
        backend,
        composition: crushWoodCompositionProfile,
        renderContract: crushWoodRenderContract,
        resourcePolicy: {
          mode: 'procedural-no-assets',
          reason: 'Browser regression uses the deterministic game-owned Crush Wood renderer.',
        },
      });
      if (captured.blob.size < 10_000) {
        throw new Error(`${anchor.id} PNG too small (${captured.blob.size} bytes)`);
      }
      const header = new Uint8Array(await captured.blob.slice(0, 8).arrayBuffer());
      const pngMagic = [137, 80, 78, 71, 13, 10, 26, 10];
      if (pngMagic.some((byte, index) => header[index] !== byte)) {
        throw new Error(`${anchor.id} capture did not produce a PNG signature`);
      }
      const path = `review-package/run/frames/crush-wood/${anchor.id}.png`;
      const posted = await postArtifact(path, captured.blob, {
        width: captured.width,
        height: captured.height,
        gameId: BLOCK_CRUSH_DROP_GAME_ID,
        frameIndex,
        phase: anchor.phase,
        request: captured.request,
        suite: suite.id,
      });
      const sha256 = posted.sha256 ?? await sha256Hex(await captured.blob.arrayBuffer());
      report.frames.push({ id: `crush-${anchor.id}`, path, sha256, width: captured.width, height: captured.height });
      log(`${anchor.id} f${frameIndex} ${captured.width}x${captured.height} ${sha256.slice(0, 12)}`);
    }

    report.planHashes.push({ frameSourceHash: frameSource.frameSourceHash });
    report.tests.push({
      name: 'crush-reference-v2-pngs',
      status: 'PASS',
      detail: `${report.frames.length} deterministic 1080x1920 phase captures`,
    });
  } catch (error) {
    report.status = 'FAIL';
    report.errors.push(error instanceof Error ? error.stack ?? error.message : String(error));
    log(String(error));
  }
  report.finishedAt = new Date().toISOString();
  window.__CAPTURE_DONE__ = report;
  await postJson('/__capture/done', report);
  log(`done ${report.status}`);
  return report;
}

declare global {
  interface Window {
    __CAPTURE_DONE__?: CaptureReport;
  }
}

if (autorun) {
  void run();
} else {
  statusEl.textContent = 'Crush Wooood reference capture loaded (autorun=0)';
}
