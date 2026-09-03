#!/usr/bin/env node
import { writeFileSync } from 'node:fs';

const report = {
  status: 'NOT_RUN',
  reason: 'No Playwright/Chrome WebCodecs harness is installed in this environment. Public fixtures and unit tests cover logic; browser drag/export remains a manual or later E2E job.',
  renderer: process.env.BCS_GPU_RENDERER ?? 'unknown',
};

writeFileSync(new URL('../review-package/reports/browser-e2e.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, ...report }, null, 2));
