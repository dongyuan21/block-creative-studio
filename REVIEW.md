# REVIEW — T0–T5 / Next phase single-agent execution

## 身份

仓库：dongyuan21/block-creative-studio  
任务 ID：T0 T1 T2 T3 T4 T5（单 Agent 顺序）  
业务基线 SHA：`74a2fba002fe62643884759b6611af9181330964`  
计划 SHA：`fec24de6764bb50ef082730321b167cf8a29259f`  
实现分支：`cursor/next-phase-t0-t5-5d9d`  
先前 Full Capture SHA：`5c95db168a02faab496d67eb1bdb9eaa6722fb43`  
先前 CI 全绿 HEAD：`526aee6c6a1ab01c005f868f555cafa81b6bbdd9`（20 帧 + 4 条 MP4；Review `5102027159`）  
本轮 P0 修复 SHA：`dda27c210f6c998784377884d711ff8526e347bb`  
依赖 PR/commit：https://github.com/dongyuan21/block-creative-studio/pull/1  
执行环境：Linux, Node 22, Three.js 0.185.1  
实际 Renderer：Headless Chrome + SwiftShader — **software WebGL**

## 本次完成了什么

针对 GPT Pro 在精确 HEAD `526aee6` 上列出的 **4 项 P0 merge blockers** 与建议 P1。本轮只修运行时接线、证据字段与 CI 分流，**不把 T0–T5 标为完成，也不做视觉自批**。PR 保持 Draft。

### P0

1. **Browser Asset Store PBR 进入 GPU。** `loadRuntimeTextureSet` / `resolveMaterialMapFetchUrl` 按 `contentHash` 从 `runtimeAssets.textureMaps` 取 Object URL；`bcs-asset://` 在缺少 PreparedResources 时抛错，不再 `fetch` 自定义 scheme。`StudioScene.prepareMaterialRuntime` 与离线 Exporter 共用该 resolver。Catalog 会为导入的 MaterialPack `textureRefs` 注册 bitmap，Plan 闭包才能被 `collectRuntimeAssetRequests` 收进 IndexedDB 绑定。Capture smoke 增加 `prepared-pbr-maps`。
2. **GitHub Pages base。** `rewriteMaterialMapUriForBrowser` 接受 `materialMapsPublicBase(import.meta.env.BASE_URL)`。CI 增加 `PAGES_BASE_PATH=/block-creative-studio/` 的 production-build smoke，检查 `index.html`、打包 JS 与 `public/materials/maps`。
3. **plan-material 绑定到 MaterialRuntime Adapter。** PBR fixture pack 不再声明 `reference-2d`。叠加 Plan 材质时若 fallback 是 2D，切到 `fixed-camera-cinematic`。2D 工程编译 PBR Look 时对 `ASSET_RENDERER_INCOMPATIBLE` 用固定机位重试。导出门禁在三维路径上检查材质 readiness。
4. **Plan 执行证据拆分。** Capture `styleFor` 走 `resolveStyleFromRenderPlan`（material + EffectPack `stylePatch.fx` 等槽位补丁）。报告字段为 `validatedEffectId` / `renderedFxPreset` / `effectDrivesPixels`，以及 `validatedCameraId` / `renderedCameraProfile`。**Camera/Layout 像素仍来自全局 `FIXED_SHOT_PROFILE`，`cameraDrivesPixels` 与 `layoutDrivesPixels` 为 false。** 不得把 Plan `effectId` 单独当成已渲染证据。

### P1（本轮已收敛的部分）

1. 正式导出使用 `materialRuntimeReadyFor(status, { descriptorKey, resourceKey })`，避免 A→B 旧 ready 窗口。
2. Capture smoke 增加 letterbox pick 与 IndexedDB/Memory PBR resolver 测试。完整 App 壳 E2E 仍未做。
3. `artifact-manifest.json` 写入 `sourceHeadSha` / `checkoutMergeSha` / `workflowRunId`。
4. 不改写 Git 历史。树内 `frames/` `videos/` 仍为 STALE。
5. Emission `channels:'r'` 复制到 RGB；语义冻结为 factor × map（缺省 + 有 map → 1；显式 0 → 不可见）。
6. PR/push 只跑 Smoke + Pages base；Full Capture 改为 `workflow_dispatch` / nightly / label `full-capture`。

## 验收矩阵

| 条件 | 状态 | 证据 | 复跑 |
|---|---|---|---|
| 源码/类型/构建检查 | PASS（本轮实现） | `npm run check && npm run typecheck` | 同上 |
| 单元与负向测试 | PASS（本轮 120 tests） | `npm test` | 同上 |
| 真实浏览器捕获 | 历史 Full Capture 在 `526aee6` / `5c95db1`；本轮 PR 默认 Smoke | `review-package/run/`；CI `capture-run-smoke` | `npm run test:browser-e2e`；Full：`npm run capture:review` 或 label `full-capture` |
| Git 中旧 PNG/MP4 | stale | `review-package/frames/STALE.md` `videos/STALE.md` | 不得当作当前 HEAD 视觉证据 |
| 13 组参考 Golden 内容 | BLOCKED | `golden-report.json` summary.BLOCKED=39 | 无源视频 |
| 人工视觉批准 | PENDING | 实现者不得自批 | GPT Pro / 用户 |

## 先前 Full Capture（`5c95db1` / CI `526aee6`）

- 状态：PASS；SwiftShader；20 张 PNG + 4 条 1080×1920 无声 MP4
- 当时 Plan Hash（`lockMode=frame-exact`，`clear.primary=effect.universal-clear`）仅证明该 HEAD 的材质槽被采样。本轮为 EffectPack 增加了 `stylePatch.fx`，**Plan Hash 已变化，不得继续把 `d3a00f57` / `f87dd1da` / `1efc1d0c` 当作当前 HEAD。**
- 抽查（526 媒体）：`2d-illegal-preview` 为拖拽中的红色 3×3 非法预览；`2d-endgame` 标题为 Game Over。过曝改善成立，**未视觉批准**。

## 已知限制与未完成项

见 `review-package/known-limitations.md`。

契约存在 ≠ 编译可用 ≠ 资源准备 ≠ 实际渲染 ≠ 人工视觉批准。

Clear FX、碎片材质身份、木材可信度、真实 GPU、正式 9:16 生产构图、独立 Pass 模块、G-buffer/HDR 诊断、39 条商业 Golden、完整 Camera/Layout Plan 驱动 **均未完成**。实现者未视觉自批。

## 质量声明

技术状态：ready-for-review  
人工视觉批准：PENDING  
T0–T5：未完成  
PR：保持 Draft，不合 main
