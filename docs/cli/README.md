# BCS CLI

The CLI is the first-class automation interface for external Agents, CI, and future render workers. It emits JSON on stdout and machine-readable errors on stderr.

## Build

```bash
npm run build:cli
```

The executable is generated at:

```text
dist-cli/cli/bcs.js
```

## Discover capabilities

```bash
node dist-cli/cli/bcs.js capabilities
node dist-cli/cli/bcs.js schema list
node dist-cli/cli/bcs.js schema get asset-manifest@1
```

## Validate an externally authored asset

```bash
node dist-cli/cli/bcs.js asset validate \
  examples/headless/assets/material.copper.json
```

## Compile one variant

```bash
node dist-cli/cli/bcs.js variant compile \
  --master examples/headless/master.demo.json \
  --recipe examples/headless/variant.copper.demo.json \
  --assets examples/headless/assets \
  --renderer fixed-camera-cinematic \
  --require-hashes \
  --out /tmp/copper-plan.json
```

## Run the structural quality gate

```bash
node dist-cli/cli/bcs.js quality check \
  --plan /tmp/copper-plan.json \
  --strict \
  --require-hashes \
  --max-texture-mib 512 \
  --max-triangles 1000000
```

A failed command returns a stable error code such as `ASSET_NOT_FOUND`, `EFFECT_MATERIAL_INCOMPATIBLE`, `FRAME_EXACT_DIRECTOR_OVERRIDE`, or `PLUGIN_PERMISSION_FORBIDDEN`.

## Compile a material runtime (no render)

```bash
node dist-cli/cli/bcs.js material compile \
  --pack examples/headless/materials/material.aurora-shell.json \
  --out /tmp/aurora-runtime.json
```

The command never sets `rendered: true`. Packs with on-disk maps under `examples/headless/materials/maps/` compile those URIs into the descriptor; Node still reports `resourcesReady: false` because it does not decode GPU textures. Parameter-only packs (no maps) report `resourcesReady: true`.

## Golden batch report

```bash
node dist-cli/cli/bcs.js golden batch \
  --index docs/reference/v2/GOLDEN_SCENE_INDEX_V1.json \
  --out /tmp/golden-report.json \
  --html /tmp/golden-report.html
```

Without local reference frames the 13 scenes / 39 anchors stay `BLOCKED`. This is not a visual PASS.

