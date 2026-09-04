# MULTI-GAME REFACTOR BASELINE V2

Date: 2026-09-04  
Plan: `docs/plans/MULTI_GAME_REFACTOR_EXECUTION_PLAN_V2.md`（PR #4 / `a421a3e`）  
Base SHA: `f1c1052226eeaba92aff4cb4727a8fc7ee66ce74`  
Branch: `cursor/mg-r0-baseline-guards-5d9d`  
Package: `0.3.0-alpha.4`

本文件冻结 **R0 开工基线**。它取代 `docs/reports/BASELINE_REPORT.md` 作为多游戏重构的比较原点，但不删除旧 T0 报告。

开工时已核对：

```text
git log --oneline f1c1052..origin/main   # empty
git diff --stat f1c1052..origin/main     # empty
```

因此 R0 基线就是 `main@f1c1052`。若后续 main 再前进，必须先确认 Game / Presentation / Plan / Renderer / Studio 边界未被再次改写，再从新 HEAD 重冻。

## Environment

| Item | Value |
|---|---|
| OS | Linux 6.12.94+ x86_64 |
| Node | 22.14.0 |
| npm | 10.9.7 |
| Three.js | 0.185.1 |
| Chrome | 148.0.7778.96 (`/usr/local/bin/google-chrome`) |
| Design canvas | 1064×1788 |
| Video output | 1080×1920, 30fps, silent |
| Capture GPU | Headless Chrome + SwiftShader（software WebGL） |

## Frozen identities

机器可读副本：`docs/reports/multi-game-refactor-baseline-identities.json`。  
`tests/multiGameRefactorBaseline.test.ts` 会重新编译 example Master / Recipe / 三份 MaterialPack，并与该文件逐字段比较。

### Public fixtures

`publicSceneCatalog()` 身份保持：

| id | snapshotHash | takeHash | status |
|---|---|---|---|
| idle | `fnv1a32:56eeaa38` | — | playing |
| pickup | `fnv1a32:56eeaa38` | — | playing |
| legal-preview | `fnv1a32:cc3a61bb` | — | playing |
| illegal-preview | `fnv1a32:4c9ffa19` | — | playing |
| single-clear | `fnv1a32:cc3a61bb` | `fnv1a32:05572d85` | playing |
| cross-clear | `fnv1a32:eac19161` | `fnv1a32:5a97ebe0` | playing |
| consecutive | `fnv1a32:485c16ac` | `fnv1a32:f34a84f4` | playing |
| endgame | `fnv1a32:d4ad67be` | — | game-over |

### V1 Plan / Material Runtime / Shot evidence

编译路径与 Capture 相同：`examples/headless/master.demo.json` + `variant.copper.demo.json` + `CAPTURE_ASSET_PATHS` + 对应 MaterialPack，`lockMode=frame-exact`，`clear.primary=effect.universal-clear`。

| Pack | pack / runtime contentHash | materialDescriptorKey | planHash |
|---|---|---|---|
| stainless-steel | `sha256:98cb21f8…87c195` | `fnv1a32:936be6d7` | `fnv1a32:b0ca5623` |
| oak-wood | `sha256:a7b83270…05d876` | `fnv1a32:6d3e0a0e` | `fnv1a32:7bff218a` |
| aurora-shell | `sha256:e34c30ff…1b577d` | `fnv1a32:2fbf5a79` | `fnv1a32:5c4c3c9a` |

`resolveStyleFromRenderPlan` 在该 HEAD 上的证据（三份材质相同，除 materialId / planHash）：

```text
cameraDrivesPixels = true
layoutDrivesPixels = true
effectDrivesPixels = true
validatedCameraId = camera.fixed
renderedCameraProfile = camera.fixed
validatedLayoutId = layout.vertical
renderedLayoutProfile = 1080x1920
poseSource = fallback-fixed-shot
fovSource = fallback-fixed-shot
boardScreenRect = {78,332,924,924}
maximumScreenZoom = 1.025
```

Plan 数字 Hash 与某次旧 Smoke（`66b30c2` 的 steel=`b0ca5623`）可能相同，因为 Shot 仍是 Style 侧派生，不进入 `planHash`。**证据字段已经变化**：旧 Smoke 记录 `cameraDrivesPixels=false` / `renderedCameraProfile=block-garden-fixed-shot-v1`。因此旧 PNG/MP4 不能当作当前 HEAD 视觉基线。

Fallback `FIXED_SHOT_PROFILE` 仍冻结为：

```text
id = block-garden-fixed-shot-v1
designResolution = 1064×1788
boardScreenRect = {80,309,912,912}
maximumScreenZoom = 1.03
compositionAspect = 0.5625
```

## Architecture guards

`scripts/check-architecture.mjs` 与 `npm run check:architecture` 已纳入 `npm run check` 和 CI。

立即禁止：

```text
src/headless → src/games
src/headless → react / react-dom / three / canvas / reference2d / Scene
src/game-runtime → react / three / canvas / src/games / renderer / reference2d
src/games/<A> → src/games/<B>
```

递减式债务（必须在对应阶段删除）：

| id | retire |
|---|---|
| exporter → presentationCompiler / StudioScene / Reference2DScene | R7 |
| App → domain/types / ThreeViewport / Reference2DViewport | R9 |
| integration catalog/bridge → domain/types；bridge → presentationCompiler | R7 / R9 |

未列入 allowlist 的同类新边会以 `UNLISTED_LEGACY_DEBT` 失败；allowlist 项消失则以 `STALE_LEGACY_ALLOWLIST` 失败。

## Capture

树内 `review-package/frames/` 与 `review-package/videos/` 仍是 STALE，不得引用。媒体只在 `review-package/run/`（gitignore）和 CI artifact。

| 项 | 状态 | 说明 |
|---|---|---|
| 历史 Full Capture | SUPERSEDED | `5c95db1` / CI `526aee6`；当时证据字段仍是 `cameraDrivesPixels=false` |
| 工作树遗留 Smoke | SUPERSEDED | 曾绑定 `66b30c2` |
| R0 Smoke | PASS | `fbb11f8`；3 张 still；steel planHash `fnv1a32:b0ca5623`；`cameraDrivesPixels=true` |
| Full Capture | PASS | 20 PNG + 4 条 1080×1920 无声 MP4；SwiftShader；报告 `review-package/reports/browser-e2e.json` |
| 商业 Golden | BLOCKED | 无源视频；39 条保持 BLOCKED，不得改成 PASS |
| 人工视觉批准 | PENDING | 实现者不得自批 |

Full Capture 在本机跑完时 git HEAD 是后续 R1 提交 `6801b0265e0b35e33885321b837a7e6f202c6ac4`（只新增未被 App 引用的 `game-runtime` / `games`）。R0 生产 bundle 仍是 156 modules；Plan Hash 与冻结 identities 一致。这是当前工作树的视觉技术捕获，**不是**人工视觉批准，也不是 `f1c1052` 旧媒体。

捕获摘要：

```text
Chrome 148 + ANGLE SwiftShader Device (Subzero)
prepared-pbr-maps / letterbox-pick / seek-repeat / cancel-export / webcodecs = PASS
steel  fnv1a32:b0ca5623
wood   fnv1a32:7bff218a
aurora fnv1a32:5c4c3c9a
videos:
  reference-2d  sha256:c15af7e1…399f06  1114288 B
  fixed-steel   sha256:5911593b…444adc4  1968897 B
  fixed-wood    sha256:5006456a…33643e  1943599 B
  fixed-aurora  sha256:ae4eeee9…61579c  1751548 B
```

## Tests

R0 本地：`npm test` **137**（原 131 + architecture 5 + baseline identity 1）。旧 REVIEW 的 120 已过时。

## Non-goals for R0

未改 Gameplay、Presentation Compiler、Scene、PBR 参数、Shot 参数、Capture Spec。  
未把 T0–T5 标为完成。  
未建立平行材质系统或新的资产依赖遍历器。
