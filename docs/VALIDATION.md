# Validation record

## Checks completed in the delivery environment

The delivery container had Node.js 22.16.0, npm 10.9.2, TypeScript 5.8.3, Chromium and FFmpeg installed. It did not have DNS access to the npm registry, so frontend dependencies could not be installed there.

The following dependency-free checks were executed successfully against the committed source:

```bash
npm run check
npm run check:syntax
npx --no-install tsc -p tsconfig.core.json --pretty false
git diff --check
```

These checks cover deterministic gameplay, overlap rejection, simultaneous row/column clearing, tray refresh, terminal game-over detection, semantic Replay, fixed-frame compilation, sequential non-clearing action advancement, camera-recovery timing, multi-seed state-drift checks, stale-Take rejection, pointer-path bounds, unique IDs, committed JSON parsing and local import resolution.

## Checks that still require a networked development machine

```bash
npm install
npm test
npm run typecheck
npm run build
npm run dev
```

After the app starts, complete the manual browser checklist in `docs/REVIEW_CHECKLIST.md`. In particular, verify WebCodecs H.264 support and capture preview/standard/cinematic export timings on the intended GPU.

## Why this distinction matters

The rule core has been executed and strictly type-checked in the delivery environment. The React/Three.js application and browser MP4 encoder path have been implemented and syntax-checked, but they are not represented as runtime-verified until dependencies are installed and the browser benchmark is run on a target workstation.
