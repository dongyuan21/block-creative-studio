# 多游戏平台重构 R0–R8b 一次性交付报告

- 日期：2026-09-04
- 分支：`cursor/multi-game-platform-r0-r8-5d9d`（协议名 `refactor/multi-game-platform-r0-r8`）
- PR：https://github.com/dongyuan21/block-creative-studio/pull/7
- 最终实现 Head（R8b）：`857e0be643dd532ea29368261d455ea718c05d1e`
- 本报告随后单独提交；分支 Head 会再前进一步。
- 方案：`MULTI_GAME_REFACTOR_EXECUTION_PLAN_V1.md` @ `c1aadaf`
- 协议：`MULTI_GAME_REFACTOR_CONTINUOUS_EXECUTION_PROTOCOL_V1.md`
- 设计：`MULTI_GAME_FIXED_VIEW_SYSTEM_DESIGN_V2.md`
- 起点：`526aee6`，已 fast-forward 吸收 `origin/main@f1c1052`（未覆盖他人提交）
- R9：DEFERRED（需 Block Crush Diagnostic Slice 之后才能删除 V1 / 默认切 V2）

阶段编号是内部工程检查点，不是人工审批门。本文件是 R0–R8b 连续执行后的统一 Review 材料。

**不得把下列事实读成商业视觉质量已批准：** 契约存在、CI 通过、公共 Fixture 稳定、SwiftShader 捕获 PASS、单元测试通过。

| 项 | 状态 |
|---|---|
| 商业 Golden | BLOCKED（无源视频） |
| 人工视觉批准 | PENDING |
| T0–T5 视觉完成 | 未声称 |
| CLI `rendered` | 始终 `false` |
| R9 | DEFERRED |

---

## 1. 分阶段提交

| 阶段 | SHA | 提交 |
|---|---|---|
| R0 | `df25f84` | `chore(architecture): freeze baseline and add dependency guards` |
| R1 | `7ce7b7d` | `refactor(game): register Block Placement as the first game runtime` |
| R2 | `d0aa023` | `refactor(project): add project and replay envelopes with v1 migration` |
| R3 | `516f6ba` | `refactor(presentation): add presentation packet and compiled frame source` |
| R4 | `ae1dac9` | `refactor(headless): add game render contract and compiler v2` |
| R5 | `49d71a1` | `refactor(composition): profile coordinate shot and calibration data` |
| R6 | `4482a22` | `refactor(render): decouple backend registry exporter and capture` |
| R7 | `2bce60a` | `refactor(assets): resolve runtime assets by semantic slot` |
| R8 | `4e1afe2` | `refactor(studio): split studio shell from Block Placement workspace` |
| R8b | `857e0be` | `refactor(layout): move Block Placement implementation behind stable exports` |

---

## 2. 架构边界摘要

`npm run check:architecture`：allowlist **0** 条。

仍强制禁止：

- `src/headless` → `src/games` / React / Three / Scene
- `src/game-runtime` → `src/games` / `domain/types` / 第一游戏引擎模块 / React / Renderer
- `src/studio` / `src/rendering` → `domain/types`
- `src/games/<A>` → `src/games/<B>`

R8 后 App 只挂载 `StudioShell`。R8b 后第一游戏实现位于 `src/games/block-placement/`，旧路径为 `@deprecated` re-export。

Headless/CLI 未引入 React。R8b CLI bundle ≈ 104.5 kB，与 R7 同量级。

---

## 3. 全量测试、构建与 Capture

在 R8b 工作树（随后提交为 `857e0be`）上：

| 门禁 | 结果 |
|---|---|
| `npm run check` | PASS（source / core / reference / architecture 0 debt） |
| `npm test` | PASS，178 tests |
| `npm run typecheck` | PASS |
| `npm run build` | PASS，Vite 190 modules |
| `test:render-regression` | PASS |
| `test:golden-batch` | PASS |
| `test:pbr-runtime` | PASS |
| Smoke Capture | PASS，3 still |
| Full Capture | PASS，20 still + 4 mp4 |

Full Capture 附加测试：`prepared-pbr-maps` / `letterbox-pick` / `seek-repeat` / `cancel-export` / `webcodecs` 均为 PASS。

WebGL：`ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)`。  
Still PNG 身份与仓库内上一份 `review-package/reports/browser-e2e.json` 一致；MP4 sha256 因软件编码器有漂移，**不是视觉批准**。媒体在 gitignore 的 `review-package/run/`。

冻结 V1 Plan Hash（Full Capture `planHashes` 复写）：

| 材质 | planHash | cameraDrivesPixels |
|---|---|---|
| stainless-steel | `fnv1a32:b0ca5623` | true |
| oak-wood | `fnv1a32:7bff218a` | true |
| aurora-shell | `fnv1a32:5c4c3c9a` | true |

`cameraDrivesPixels=true` 只证明 Plan 相机配置驱动了该次软件捕获，**不等于**商业画质通过。

---

## 4. V1/V2 Replay 与 State Hash 等价性

证据：`tests/projectV1ToV2Migration.test.ts`、`tests/blockPlacementLegacyRuntime.test.ts`、`tests/blockPlacementFrameSource.test.ts`、`tests/replayEnvelope.test.ts`。

- `examples/demo-cross-clear.block-creative.json` 可迁到 Studio Project V2
- V1 `replayActions` 终态与 V2 replay 的 `finalStateHash` / `hashBlockPlacementState` 相等
- Semantic Hash 不含 pointer；Frame Hash 含 interaction 与 rhythm
- V2 缺 `interactions` → `MISSING_FIELD`，不静默补 16 帧
- Studio Importer 双读 V1+V2；Autosave / 默认导出仍写 V1
- CLI `bcs project migrate` 输出 `rendered: false`

V2 Plan Hash 含 `planSchemaVersion` / renderContract / game，与 V1 哈希空间独立。V1 `compileVariant` 冻结身份未改。

---

## 5. 当前 Block Placement 回归

- 8×8 规则、重叠拒绝、横纵同消、12-seed greedy replay：`check:core` + `tests/gameEngine.test.ts` PASS
- 公共 Fixture 身份：`tests/multiGameRefactorBaseline.test.ts` 对照 `docs/reports/multi-game-refactor-baseline-identities.json` PASS
- Presentation：`evaluateCompiledTake` 与 packet payload 在 R3 锁定字段上等价；乱序/重复 Seek PASS
- Exporter 走 Frame Source + Backend Job，不再直接 import Scene
- Material Runtime 仍是唯一 PBR 主链；Runtime Resource Readiness 仍阻止错误导出
- 默认项目仍是 Block Placement；UI 功能经由 `BlockPlacementWorkspace` 保持

非预期回归：无。R8 市场条为预期新增壳层，不改变第一游戏规则。

---

## 6. Block Crush 接入条件（最小新增）

第一个 Diagnostic Slice PR **只应新增**，除注册与通用 bug 修复外不应改平台核心：

```text
src/games/block-crush-drop/
  definition.ts
  manifest.ts
  schemas.ts
  runtime.ts
  migrations/
  presentation/          # Diagnostic Frame Source + payloadSchemaId
  render/                # Reference Backend Adapter
  profiles/              # 独立 composition / layout / calibration / shot
  capture/suite.ts
  studio/                # 可选 Workspace；Coming Soon 可先保留
tests/games/block-crush-drop/**
src/bootstrap/*          # registry.register(crushDefinition)
```

Slice 最低要求：二维规则状态、Drop Action、Resolution Trace、Diagnostic Frame Source、Reference Backend、Project V2、Capture Suite。

**不要改：** `variantCompilerV2`、video exporter、`StudioShell`、Block Placement runtime、Material Runtime。

坍塌影视、目标约束物理、碎片和 PBR 不在第一 Slice。若仍需大量 `if (gameId === 'block-crush')` 才能编译/导出，视为平台重构未完成。

R9（删 V1、默认 V2、收敛旧 Renderer）必须等该 Slice 证明 V2 架构可用后再做。

---

## 7. Vita Mahjong 接入条件（最小新增）

```text
src/games/vita-mahjong-solitaire/
  definition.ts / manifest.ts / schemas.ts
  runtime.ts                 # layered-planar + match-pair + blocking
  render/renderContract.ts   # mahjong.tile.body / face-pack / border / selection / pair-exit
  profiles/                  # 独立 composition / layout / calibration
  presentation/              # 独立 payloadSchemaId
  studio/
```

平台 **不得要求** 麻将提供：8×8 Board、Piece Tray、PlacementAction、Line Clear、Gravity、Clear Primary、Block Rack。

R7 已证明上述 Mahjong Slot 能被 V1 Plan 收集并写入 `bySlot`。接入时应使用自己的 Game Render Contract，而不是在 Compiler 里写麻将特例。

---

## 8. 已知限制与阻塞

| 项 | 状态 | 说明 |
|---|---|---|
| 商业 Golden | BLOCKED | 无源视频；公共 Fixture ≠ Golden |
| 人工视觉批准 | PENDING | 实现者不得自批 |
| SwiftShader Capture | 工程 PASS | ≠ 视觉批准；MP4 sha 允许软件编码器漂移 |
| R9 | DEFERRED | 删除 V1 / 默认 V2 / 收敛 Legacy Renderer |
| Autosave | V1 | 按方案保留到 R9 |
| `three-3d` sandbox | 仍存在 | R9 再降为 Legacy |
| 旧路径 re-export | 过渡 | R8b 机械移动后的兼容层，下一小版本可标删除 |
| 第二款游戏 | 未实现 | 市场为 Coming Soon 卡片 |

硬阻塞：无。缺少 Golden / 视觉批准按协议不阻止结构重构，且未伪造 PASS。

---

## 9. 最终 PR

https://github.com/dongyuan21/block-creative-studio/pull/7 → `main`

不请求合入 `main`，除非产品明确要求。不在中间阶段请求 Review。

---

## 10. Review `5109071660` 边界收口

针对 PR #7 最终架构审阅的四项 P0 / 两项 P1，已在同一 PR 上收口。Fake Crush 只存在于 `tests/games/block-crush-drop/`，**不是**正式 Block Crush Diagnostic Slice。

| 项 | 处理 |
|---|---|
| P0-1 | `variantCompilerV2` 不再含 `block-placement.*`。Legacy 事件别名由 `GameRenderContract.eventCatalog.legacyAliases` 提供。 |
| P0-2 | `src/rendering` / `src/studio` / `src/game-runtime` 为纯 Registry。游戏组装在 `src/bootstrap/*`。`createCalibrationCase` 必须带 `calibrationProfileId`，ROI 与 composition 在调用时从该 Profile 解析。 |
| P0-3 | 公共入口 `validateStudioProjectDocumentV2`。`GameDefinition.schemas.action` 是规则语义 Action；`replayAction` 为可选 Legacy。 |
| P0-4 | Render Job 锁定 Packet Frame Identity，且 `output.fps === frameSource.fps`。`PreparedRenderResources` 扩展现有 `PreparedResources`。 |
| P1 | `GameRegistry.register` 先 Preflight 再提交。第一游戏 Adapter 直接 import 包内 Scene。 |

约束测试：`tests/games/block-crush-drop/platformContract.test.ts`。

仍保持：R9 DEFERRED；商业 Golden BLOCKED；人工视觉 PENDING；V1 默认写入；V1 Plan Hash 不变。
