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

## Remaining

R2 → R8b 连续执行。R9 DEFERRED。
