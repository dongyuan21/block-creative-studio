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

## Agent take generation

The CLI does not embed an LLM. It dispatches registered game-package adapters by `gameId` and always emits a `bcs.game-replay` envelope plus a deterministic replay report. `rendered` stays `false`. GitHub Pages does not host this binary; run it locally or on a future backend Node runtime.

```bash
node dist-cli/cli/bcs.js agent list
node dist-cli/cli/bcs.js agent run \
  --game block-placement \
  --seed 7 \
  --max-moves 8 \
  --out /tmp/placement.take.json
node dist-cli/cli/bcs.js agent run \
  --game taptile-tray-match3 \
  --profile safe-win \
  --seed 20260902 \
  --max-moves 24 \
  --beam-width 40 \
  --max-expanded-states 4000 \
  --config /tmp/taptile.project.json \
  --out /tmp/taptile.take.json
node dist-cli/cli/bcs.js take validate \
  --take /tmp/taptile.take.json \
  --game taptile-tray-match3 \
  --config /tmp/taptile.project.json
```

`--config` is the game's official config document (`block-placement` board/pieces, Crush Wood level, or a TapTile project). Omit it to use that adapter's default. `--out` on `agent run` writes the envelope only; the command JSON also includes `status` and `validation`.

Registered demo games: `block-placement`, `taptile-tray-match3`, `block-crush-drop`.

## Author a level and swap in-game skin

This is puzzle authoring and **in-game** visuals (tile theme / wood skin / look pack). It does not replace Studio chrome.

```bash
node dist-cli/cli/bcs.js authoring catalog --game taptile-tray-match3
node dist-cli/cli/bcs.js project scaffold \
  --game taptile-tray-match3 \
  --template hourglass \
  --skin food-v1 \
  --seed 20260902 \
  --out /tmp/taptile.config.json
node dist-cli/cli/bcs.js skin apply \
  --game taptile-tray-match3 \
  --config /tmp/taptile.config.json \
  --skin chain-combo-ui-v1 \
  --out /tmp/taptile.config.json
```

## Produce a document and optionally encode MP4

`produce` chains scaffold → skin → agent take → document → presentation compile. Add `--render` to spawn Chrome and encode an MP4. Node itself still cannot set `rendered: true`.

```bash
node dist-cli/cli/bcs.js produce \
  --game block-placement \
  --template showcase \
  --skin look.copper \
  --seed 7 \
  --max-moves 8 \
  --out-dir /tmp/placement-produce
node dist-cli/cli/bcs.js render \
  --out-dir /tmp/placement-produce \
  --quality preview \
  --max-frames 8
```

Without Chrome, `render` returns `ok: false`, `recoverable: true`, `code: CHROME_NOT_FOUND`, and leaves `rendered: false`. After a successful WebCodecs encode it writes `video.mp4`, `preview.png`, and updates `render-request.json` with `rendered: true`.

`bcs render --list` prints registered cinematic backends, composition profiles, and render contracts.

## Skills

`skills/` wraps these commands so an external Agent can compose them. Skills are the composition surface; the CLI is the execution surface.

| CLI | Skill |
|---|---|
| `capabilities` / `schema` / `agent list` | `bcs-capabilities`, `bcs-schema` |
| `project scaffold` / `authoring catalog` | `bcs-project-scaffold` |
| `skin list` / `skin apply` | `bcs-skin-apply` |
| `agent run` | `bcs-agent-run` |
| `take validate` | `bcs-take-validate` |
| `document emit` / `document compile` | `bcs-document-emit` |
| `produce` | `bcs-produce` |
| `render` | `bcs-render` |
| `asset validate` | `bcs-asset-validate` |
| `variant compile` | `bcs-variant-compile` |
| `quality check` | `bcs-quality-check` |
| `material compile` | `bcs-material-compile` |
| `golden batch` | `bcs-golden-batch` |
| `project migrate` | `bcs-project-migrate` |

Hub: [`skills/bcs/SKILL.md`](../../skills/bcs/SKILL.md).

