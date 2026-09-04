import { createHeadlessPlatform } from '../../../src/bootstrap/gamePackage';
import { blockPlacementPackage } from '../../../src/games/block-placement/package';
import { compileFrameSourceFromDocument } from '../../../src/game-runtime/projectDocument';
import { AssetRegistry } from '../../../src/headless/assetRegistry';
import type { EffectPackManifest, LookPackManifest } from '../../../src/headless/contracts';
import { compileVariantV2 } from '../../../src/headless/variantCompilerV2';
import { buildCreativeMasterV2 } from '../../../src/headless/creativeMasterV2';
import { createFrameRenderRequestV2 } from '../../../src/headless/frameRequestV2';
import { captureStillV2 } from '../../../src/capture/v2/captureStill';
import { requireCaptureSuite } from '../../../src/capture/captureSuiteRegistry';
import { requireRenderBackend } from '../../../src/rendering/backendRegistry';
import { readyRenderResources } from '../../../src/rendering/preparedRenderResources';
import { bindPreparedResources } from '../../../src/rendering/resourcePolicy';
import { makeFixture, ref } from '../../headlessFixtures';
import {
  CRUSH_GAME_ID,
  CRUSH_MODULE_VERSION,
  CRUSH_PRESENTATION_SCHEMA_ID,
  crushCompositionProfile,
  crushDiagnosticBackend,
  crushRenderContract,
  createCrushDiagnosticDocument,
  fakeCrushPackage,
} from './fakeCrushPackage';

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
statusEl.textContent = 'crush diagnostic capture starting…';
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

async function run(): Promise<CaptureReport> {
  const report: CaptureReport = {
    status: 'PASS',
    mode: 'crush-diag',
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
    const platform = createHeadlessPlatform([blockPlacementPackage, fakeCrushPackage]);
    const project = createCrushDiagnosticDocument();
    const frameSource = compileFrameSourceFromDocument(project, platform, {
      takeId: 'drop-0',
      directorProfile: {},
      fps: 30,
    });
    const fixture = makeFixture();
    const crushEffect: EffectPackManifest = {
      ...(fixture.assets.find((item) => item.id === 'effect.copper-clear') as EffectPackManifest),
      id: 'effect.crush-impact',
      supportedEvents: ['block-crush.impact', 'block-crush.crush-resolved', 'block-crush.collapse'],
    };
    const look: LookPackManifest = {
      ...(fixture.assets.find((item) => item.id === 'look.copper') as LookPackManifest),
      id: 'look.crush',
      slots: {
        'tile.material': ref('material.copper', 'material-pack', 'b'),
        'clear.primary': {
          id: 'effect.crush-impact',
          version: '1.0.0',
          kind: 'effect-pack',
          contentHash: crushEffect.contentHash,
        },
        'crush.board': ref('background.dark', 'background', 'f'),
      },
    };
    const assets = fixture.assets.filter((item) => item.id !== 'look.copper').concat(look, crushEffect);
    const master = buildCreativeMasterV2(project, platform.games, {
      id: 'master.crush',
      takeId: 'drop-0',
      renderContract: crushRenderContract,
      fps: 30,
      totalFrames: frameSource.totalFrames,
      semanticHash: 'fnv1a32:crush',
    });
    const plan = compileVariantV2(
      master,
      {
        ...fixture.recipe,
        id: 'variant.crush',
        masterId: 'master.crush',
        lockMode: 'semantic',
        lookPackRef: { id: 'look.crush', version: '1.0.0', kind: 'look-pack', contentHash: look.contentHash },
      },
      new AssetRegistry(assets),
      crushRenderContract,
      { renderer: 'fixed-camera-cinematic', requireHashes: true },
    );
    const backend = requireRenderBackend(crushDiagnosticBackend.id);
    const resources = readyRenderResources(plan.planHash, {
      slots: [
        { slotId: 'tile.material', uri: 'mem:tile', contentHash: 'sha256:b', readiness: 'ready' },
        { slotId: 'clear.primary', uri: 'mem:fx', contentHash: crushEffect.contentHash ?? 'sha256:c', readiness: 'ready' },
        { slotId: 'crush.board', uri: 'mem:board', contentHash: 'sha256:f', readiness: 'ready' },
      ],
    });
    const request = createFrameRenderRequestV2({
      gameId: CRUSH_GAME_ID,
      moduleVersion: CRUSH_MODULE_VERSION,
      renderContract: crushRenderContract,
      presentationSchemaId: CRUSH_PRESENTATION_SCHEMA_ID,
      composition: crushCompositionProfile,
      planId: plan.id,
      planHash: plan.planHash,
      takeId: frameSource.takeId,
      frameIndex: 0,
      fps: frameSource.fps,
      renderer: backend.renderer,
      coordinateSpace: 'design',
    });
    const canvas = document.createElement('canvas');
    const captured = await captureStillV2(canvas, {
      request,
      frameSource,
      backend,
      composition: crushCompositionProfile,
      renderContract: crushRenderContract,
      resourcePolicy: bindPreparedResources({
        plan,
        resources,
        renderContract: crushRenderContract,
        backend,
      }),
      plan,
    });
    if (captured.blob.size < 32) {
      throw new Error(`crush PNG too small (${captured.blob.size} bytes)`);
    }
    const header = new Uint8Array(await captured.blob.slice(0, 8).arrayBuffer());
    const pngMagic = [137, 80, 78, 71, 13, 10, 26, 10];
    if (pngMagic.some((byte, index) => header[index] !== byte)) {
      throw new Error('crush capture did not produce a PNG signature');
    }
    const path = 'review-package/run/frames/diagnostic/crush-idle.png';
    const posted = await postArtifact(path, captured.blob, {
      width: captured.width,
      height: captured.height,
      gameId: CRUSH_GAME_ID,
      request: captured.request,
      suite: requireCaptureSuite(CRUSH_GAME_ID).id,
    });
    const sha256 = posted.sha256 ?? await sha256Hex(await captured.blob.arrayBuffer());
    report.frames.push({
      id: 'crush-idle',
      path,
      sha256,
      width: captured.width,
      height: captured.height,
    });
    report.tests.push({ name: 'crush-v2-png', status: 'PASS', detail: `${captured.width}x${captured.height} ${captured.blob.size}B` });
    log(`crush-idle ${captured.width}x${captured.height} ${sha256.slice(0, 12)}`);
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
  statusEl.textContent = 'crush diagnostic capture loaded (autorun=0)';
}
