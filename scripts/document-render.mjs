#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { runBrowserCapture } from './browser-capture.mjs';

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return process.argv[index + 1];
  }
  return undefined;
}

const workspace = resolve(arg('workspace') ?? '');
if (!workspace || !existsSync(workspace)) {
  process.stderr.write(`${JSON.stringify({
    ok: false,
    code: 'WORKSPACE_NOT_FOUND',
    message: `Document render workspace ${workspace || '(missing)'} does not exist.`,
  }, null, 2)}\n`);
  process.exit(1);
}

const timeoutMs = Number(arg('timeout-ms') ?? '180000');
const report = await runBrowserCapture({
  mode: 'smoke',
  page: '/tools/document-render.html',
  wipe: false,
  workspaceRoot: workspace,
  artifactRoot: workspace,
  artifactPathMode: 'artifact-root',
  reportDir: workspace,
  reportFile: 'chrome-capture.json',
  updateReviewManifest: false,
  timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 180_000,
  query: 'autorun=1',
});

process.stdout.write(`${JSON.stringify(report)}\n`);
if (report.status === 'FAIL') process.exit(1);
if (report.status === 'NOT_RUN') process.exit(2);
