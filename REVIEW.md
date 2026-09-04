# REVIEW — Multi-game refactor R0 baseline

## 身份

仓库：dongyuan21/block-creative-studio  
任务：多游戏重构 **R0**（冻结 `main` 基线 + 架构守卫）  
唯一有效任务书：`docs/plans/MULTI_GAME_REFACTOR_EXECUTION_PLAN_V2.md`（PR #4，`a421a3e`）  
Base SHA：`f1c1052226eeaba92aff4cb4727a8fc7ee66ce74`  
实现分支：`cursor/mg-r0-baseline-guards-5d9d`  
包版本：`0.3.0-alpha.4`  
执行环境：Linux, Node 22.14.0, npm 10.9.7, Three.js 0.185.1, Chrome 148.0.7778.96  
实际 Renderer：Headless Chrome + SwiftShader — **software WebGL**

旧 T0–T5 / Next-phase 单 Agent 执行记录仍可在 git 历史中查看。本文件从 R0 起改为多游戏重构状态板。T0–T5 **未完成**。

## 本次完成了什么

从当前 `main@f1c1052` 开工，不再等待已关闭的旧 PR，也不再从 `526aee6` 建分支。

1. **Architecture Import Guard。** `scripts/check-architecture.mjs` 立即禁止 `headless → games / React / Three / Scene`、`game-runtime → React / Three / Canvas / games / renderer`、`games/A → games/B`。Exporter / App / integration 的第一游戏耦合写入递减 allowlist，漏记新边或残留旧边都会失败。
2. **基线身份冻结。** `docs/reports/MULTI_GAME_REFACTOR_BASELINE_V2.md` 与 `docs/reports/multi-game-refactor-baseline-identities.json` 固定 public fixture identity、三份 V1 Plan Hash、Material Runtime Hash 和 Shot 证据。`resolveStyleFromRenderPlan` 路径上 `cameraDrivesPixels` / `layoutDrivesPixels` 为 true；Pose/FOV 仍是 `fallback-fixed-shot`。
3. **门禁。** `npm run check:architecture` 纳入 `npm run check`；CI `validate` 增加同名步骤。
4. **Capture。** 已重跑 Full Capture（20 PNG + 4 条 1080×1920 MP4，SwiftShader）。历史 `5c95db1` / `526aee6` 与 `66b30c2` Smoke 不再作为视觉基线。Plan Hash 与冻结 identities 一致；`cameraDrivesPixels` / `layoutDrivesPixels` 为 true。实现者未视觉自批。

R0 未改 Gameplay、Compiler、Scene、PBR、Shot 参数或 Capture Spec。网页与像素路径不应变化。

## 验收矩阵

| 条件 | 状态 | 证据 | 复跑 |
|---|---|---|---|
| 源码/类型/构建检查 | PASS | `npm run check && npm run typecheck && npm run build` | 同上 |
| 单元与负向测试 | PASS（137） | `npm test`；含 architecture 5 + baseline identity 1 | 同上 |
| Architecture Guard | PASS | `npm run check:architecture`；allowlist 9 条 | 同上 |
| R0 Smoke Capture | PASS | `fbb11f8`；3 still；steel `b0ca5623`；`cameraDrivesPixels=true` | `npm run test:browser-e2e` |
| Full Capture | PASS（技术捕获） | 20 PNG + 4 MP4；报告 `review-package/reports/browser-e2e.json`；媒体在 `review-package/run/` | `npm run capture:review` 或 label `full-capture` |
| Git 中旧 PNG/MP4 | stale | `review-package/frames/STALE.md` `videos/STALE.md` | 不得当作当前 HEAD 视觉证据 |
| 13 组参考 Golden 内容 | BLOCKED | `golden-report.json` summary.BLOCKED=39 | 无源视频 |
| 人工视觉批准 | PENDING | 实现者不得自批 | 用户 / 指定审阅者 |

## 冻结的 Plan / Material / Shot

见 `docs/reports/multi-game-refactor-baseline-identities.json`。

- steel planHash `fnv1a32:b0ca5623`
- wood planHash `fnv1a32:7bff218a`
- aurora planHash `fnv1a32:5c4c3c9a`
- Shot 证据：camera/layout/effect 均 `*DrivesPixels=true`；pose/FOV 仍 fallback
- Fallback shot 仍为 `block-garden-fixed-shot-v1`（1064×1788，board `{80,309,912,912}`，zoom 1.03）

钢材质 planHash 数字可能与旧 Smoke 相同，但证据字段已变，旧媒体作废。

## 已知限制与未完成项

见 `review-package/known-limitations.md` 与 V2 计划 R1–R10。

本轮之后仍保持：

- Block Placement 仍是唯一真实游戏；App / Exporter / Scene 仍是第一游戏词汇
- Camera Pose / FOV 仍回退全局 `FIXED_SHOT_PROFILE`
- 碎片仍是确定性运动学，不是刚体 / G-buffer
- 商业 Golden 保持 BLOCKED
- T0–T5 未完成

## 质量声明

技术状态：R0 ready-for-review  
人工视觉批准：PENDING  
T0–T5：未完成  
重构：仅完成 R0 守卫与基线冻结，未完成多游戏接入  
Full Capture：技术 PASS，不是视觉批准
