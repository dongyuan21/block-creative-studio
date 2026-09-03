#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { runBrowserCapture } from './browser-capture.mjs';

const full = process.env.BCS_CAPTURE_FULL === '1' || process.argv.includes('--full');
const report = await runBrowserCapture({ mode: full ? 'full' : 'smoke' });
writeFileSync(
  new URL('../review-package/reports/browser-e2e.json', import.meta.url),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify({
  ok: report.status !== 'FAIL',
  status: report.status,
  mode: report.mode,
  reason: report.reason,
  frames: report.frames?.length ?? 0,
  videos: report.videos?.length ?? 0,
  renderer: report.webglRenderer ?? report.renderer ?? 'unknown',
}, null, 2));
if (report.status === 'FAIL') process.exit(1);
