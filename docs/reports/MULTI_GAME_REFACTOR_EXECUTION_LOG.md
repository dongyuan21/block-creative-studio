# 多游戏重构连续执行日志

- 分支：`cursor/multi-game-platform-r0-r8-5d9d`（协议名 `refactor/multi-game-platform-r0-r8`）
- 方案：`MULTI_GAME_REFACTOR_EXECUTION_PLAN_V1.md` @ `c1aadaf`
- 协议：`MULTI_GAME_REFACTOR_CONTINUOUS_EXECUTION_PROTOCOL_V1.md`
- 起点：`526aee6`，已 fast-forward 吸收 `origin/main@f1c1052`
- R9：DEFERRED（需 Block Crush Diagnostic Slice）

阶段编号是内部检查点，不是人工审批门。

## R0 — 冻结基线与架构边界

- 状态：PASS（自检，非人工审批）
- 提交：`chore(architecture): freeze baseline and add dependency guards`
- 吸收上游：`526aee6..f1c1052`（Plan Shot / UV / fracture、board-plane pick、browser PBR）
- 未覆盖他人提交
- 门禁：`check` / `test` 138 / `typecheck` / `build`（156 modules）PASS
- Architecture：9 条递减 allowlist（exporter/integration→R6，App/types→R8）
- Smoke Capture：PASS；3 still；SwiftShader；`cameraDrivesPixels` 未在本 smoke 报告中复写 Full Capture
- 商业 Golden：BLOCKED
- 人工视觉批准：PENDING
- 未改 Gameplay / Compiler / Scene / PBR / Shot / Capture Spec

## R1 — Game Runtime、Registry 与 Block Legacy Adapter

- 状态：PASS（自检，非人工审批）
- 提交：`refactor(game): register Block Placement as the first game runtime`
- 门禁：`check` / `test` 148 / `typecheck` / Smoke Capture PASS
- Registry：重复 ID 失败、未知游戏失败、`require()` 可用
- Adapter：与 `applyPlacement` / `listLegalMoves` 深度相等；完整 State Hash 覆盖 board/pieces/seed/setIndex/turn/score/combo/status；12-seed greedy replay 锁步
- App / Capture / Exporter 未改
- 未移动 `gameEngine.ts`

## R2 — Project/Replay Envelope 与 V1 Migration

- 状态：PASS（自检，非人工审批）
- 提交：`refactor(project): add project and replay envelopes with v1 migration`
- 门禁：`check` / `test` 156 / `typecheck` / `build` / render-regression / golden-batch / pbr-runtime / Smoke Capture PASS
- CLI：`project migrate`；`rendered: false`
- 示例 `examples/demo-cross-clear.block-creative.json` 可迁；V1/V2 完整 State Hash 相等
- Semantic Hash 不含 pointer；Frame Hash 含 interaction 与 rhythm
- V2 缺字段 `MISSING_FIELD`，不静默补默认
- Studio Importer 双读 V1+V2；Autosave/默认导出仍写 V1
- game-runtime 不 import games / domain/types；Block 迁移在 `games/block-placement/migrations`

## R3 — Presentation Packet 与 Compiled Frame Source

- 状态：PASS（自检，非人工审批）
- 提交：`refactor(presentation): add presentation packet and compiled frame source`
- 门禁：`check` / `test` 161 / `typecheck` / `build` / Smoke Capture PASS
- 公共 Fixture：`evaluateCompiledTake` 与 packet.payload 在 board/snapshot/drag/pointer/feedback/clearing/cameraPunch/totalFrames 上相等
- 乱序/重复 Seek 结果一致
- 未改 Scene / Exporter / App

## R4 — Game Render Contract、CreativeMasterV2 与 Variant Compiler V2

- 状态：PASS（自检，非人工审批）
- 提交：`refactor(headless): add game render contract and compiler v2`
- 门禁：`check` / `test` 165 / `typecheck` PASS
- V1 `compileVariant` / `runQualityGate` 未改行为；冻结 Plan Hash 仍为 steel `fnv1a32:b0ca5623` / wood `7bff218a` / aurora `5c4c3c9a`
- V2 Plan Hash 含 `planSchemaVersion` / renderContract / game，与 V1 哈希空间独立
- 假游戏合同只需 `crush.board` + `crush.drop-piece`，无需改 Compiler，无需 `tile.material`
- 未知 Slot 以 `UNKNOWN_SLOT` 失败并带明确 path
- Scene / Exporter / App / Capture 未改

## Remaining

R5 → R8b 连续执行。R9 DEFERRED。
