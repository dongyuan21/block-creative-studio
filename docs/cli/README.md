# BCS CLI

The CLI is the first-class **atomic** automation interface for external Agents, CI, and future render workers. It emits JSON on stdout and machine-readable errors on stderr.

Skills (`skills/`) are the **composition** surface: official recipes that only call these commands, plus any recipes an external Agent writes for itself. Do not grow the CLI into a matrix of skins, directors, or retries — edit or fork a Skill instead. See [`skills/README.md`](../../skills/README.md).

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

Crush `skinId` and TapTile themes do not change gameplay hashes, so an existing take stays valid after `skin apply`. Placement `look.copper` / `look.candy-resin` live on `document.production.lookPackRef`; `bcs render` reads that id. `look.copper` drives copper metal in the cinematic backend. PBR texture maps still require `variant compile`.

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

`produce` chains scaffold → skin → agent take → document → presentation compile. It is a convenience command, not the only legal path. Editable official recipes live in Skills (`bcs-from-puzzle-to-mp4`, `bcs-remix-looks`). Add `--render` to spawn Chrome and encode an MP4. Node itself still cannot set `rendered: true`.

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

`skills/` is not a second implementation of the CLI. Atomic skills document one command. Composition skills sequence several commands.

| Kind | Skill | What it composes |
|---|---|---|
| Composition | `bcs-from-puzzle-to-mp4` | scaffold → agent → validate → document → optional render |
| Composition | `bcs-remix-looks` | one take × many in-game skins, no second Agent run |
| Composition | `bcs-gate-before-render` | validate/compile before `render`; `ok` ≠ `rendered` |
| Composition | `bcs-resume-render` | encode later when Chrome appears |
| Composition | `bcs-placement-variant` | asset validate → variant compile → quality check |
| Composition | `bcs-diagnose` | map CLI error codes to the next atomic command |
| Convenience CLI | `bcs-produce` | same default path as `bcs-from-puzzle-to-mp4`, baked into one command |
| Atomic | `bcs-capabilities`, `bcs-schema`, `bcs-project-scaffold`, `bcs-skin-apply`, `bcs-agent-run`, `bcs-take-validate`, `bcs-document-emit`, `bcs-render`, `bcs-asset-validate`, `bcs-variant-compile`, `bcs-quality-check`, `bcs-material-compile`, `bcs-golden-batch`, `bcs-project-migrate` | one CLI verb each |

Hub: [`skills/bcs/SKILL.md`](../../skills/bcs/SKILL.md). Index: [`skills/README.md`](../../skills/README.md).

