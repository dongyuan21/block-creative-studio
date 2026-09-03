# REVIEW — T0–T5 / Next phase single-agent execution

## 身份

仓库：dongyuan21/block-creative-studio  
任务 ID：T0 T1 T2 T3 T4 T5（单 Agent 顺序）  
业务基线 SHA：`74a2fba002fe62643884759b6611af9181330964`  
计划 SHA：`fec24de6764bb50ef082730321b167cf8a29259f`  
实现分支：`cursor/next-phase-t0-t5-5d9d`  
实现 Head SHA：`6a47f32e35af486e1afa67a605733ceab960b4c8`  
依赖 PR/commit：无  
执行环境：Linux 6.12, Node 22.14.0, npm 10.9.7, Three.js 0.185.1  
实际 Renderer：单元测试为 Node；浏览器 E2E / GPU **NOT_RUN**

## 本次完成了什么

- 冻结 Headless 共享契约：`FrameRenderRequest`、`PreparedResources`、`FrameRenderResult`、`CalibrationCase`、`MaterialRuntimeDescriptor`。
- 明确 1064×1788 设计坐标与 1080×1920 视频坐标的 contain 映射；导出不再拉伸 Reference 2D。
- Reference 2D 按图层 Pass 隔离，并提供原生设计分辨率 offscreen 捕获（不再放大预览 Canvas）。
- 资源解码失败会拒绝正式 warmup/capture，不再静默回退。
- 批量 Golden：读取 13 组场景、展开 39 个锚点、输出 JSON+HTML；无源视频全部 **BLOCKED**。
- `fixed-camera-cinematic` 消费锁定 9:16 Shot Profile；LookDev 诊断通道进入 Inspector。
- MaterialPack 编译为运行时描述符；不锈钢 / 橡木 / aurora-shell 三套独立 ID 的 Pack 可编译。Three.js 牌块在存在 `style.materialRuntime` 时走 PBR 工厂，而不是按 steel/wood 名称分支。
- CLI 增加 `material compile` 与 `golden batch`，且不输出 `rendered: true`。
- 自制公开 Fixture 覆盖 Idle、预览、单行清除、交叉清除、连续落子、终局。

## 改动范围与兼容

改动文件：Headless 契约/CLI、Reference2DScene、StudioScene、exporter、Inspector、fixtures、测试与报告。  
接口与 Schema：`StyleSpec` 增加可选 `diagnosticView` / `enabledPasses` / `materialRuntime`；renderer 增加 `fixed-camera-cinematic`。  
旧工程迁移：缺省字段保持原行为；LookDev 与旧 renderer 仍可用。  
未修改的玩法不变量：落子、清行列、分数、Replay 协议。  
破坏性变更：无（Reference 2D 导出从 stretch 改为 letterbox，成片边缘会出现 letterbox，这是刻意修正）。

## 验收矩阵

| 条件 | 状态 | 证据 | 复跑 |
|---|---|---|---|
| 源码/类型/构建检查 | PASS | CI / 本地 `npm run check && npm run typecheck && npm run build` | 同上 |
| 单元与负向测试 | PASS | 79 tests | `npm test` |
| 真实浏览器 E2E | NOT_RUN | `review-package/reports/browser-e2e.json` | 需桌面 Chrome |
| 原生帧/视觉回归 | NOT_RUN | 无 PNG 证据包 | 需浏览器 Canvas |
| 状态、事件与镜头不变量 | PASS（逻辑） / NOT_RUN（成片） | `tests/nextPhaseContracts.test.ts` | `npm run test:render-regression` |
| 实际 MP4 导出 | NOT_RUN | 无 WebCodecs | 桌面 Chrome 导出 |
| 性能、资源释放 | NOT_RUN | 未测 GPU | — |
| 13 组参考 Golden 内容 | BLOCKED | `review-package/reports/golden-report.json` summary.BLOCKED=39 | `npm run cli -- golden batch --index docs/reference/v2/GOLDEN_SCENE_INDEX_V1.json` |
| PBR 编译 | PASS（contract/compile） | 三份 runtime JSON | `npm run cli -- material compile --pack examples/headless/materials/material.aurora-shell.json` |
| PBR 贴图驱动的真实 GPU 渲染 | NOT_RUN | 无浏览器贴图采样证据 | 需导入贴图后预览 |
| 三变体 1080×1920 MP4 | NOT_RUN | 无视频 | 需 Chrome 导出 |

## 关键可见结果

before：`74a2fba` 单帧 Golden Diff + LookDev 三档，2D 捕获为放大预览。  
after：原生 1064×1788 捕获路径、Pass 隔离、Shot Profile、PBR runtime 契约、批量 Golden 报告。  
diff：无像素 before/after PNG（NOT_RUN）。  
参考/目标事件对应：39 cases，`exact-replay` 声明但内容 BLOCKED。  
源录像对比：BLOCKED，不是 exact-replay 完成。

## 复现步骤

```bash
npm ci
npm run check
npm test
npm run typecheck
npm run build
npm run test:render-regression
npm run test:golden-batch
npm run test:pbr-runtime
node dist-cli/cli/bcs.js golden batch --index docs/reference/v2/GOLDEN_SCENE_INDEX_V1.json --out /tmp/golden.json
node dist-cli/cli/bcs.js material compile --pack examples/headless/materials/material.stainless-steel.json
```

公开 Take：`src/domain/publicFixtures.ts` 中 `singleClearTake` / `crossClearTake`。

## 失败路径

- 无源视频：Golden 内容 BLOCKED，工具仍产出 39 条 case。
- 法线贴图缺 Y 约定：material compile 失败。
- 故意错色像素对：calibration score < 80。
- 浏览器取消导出 / 乱序 Seek 像素：NOT_RUN。

## 已知限制与未完成项

见 `review-package/known-limitations.md`。

契约存在 ≠ 编译可用 ≠ 资源准备 ≠ 实际渲染 ≠ 人工视觉批准。

## 质量声明

技术状态：ready-for-review  
人工视觉批准：PENDING

## 给 Review 者的重点

1. Reference 2D 导出 letterbox 是否接受（不再拉伸）。  
2. Golden 39 条全部 BLOCKED 是否符合“缺源视频不得造 PASS”。  
3. `fixed-camera-cinematic` 是否只是锁定构图的 Three.js 后端，而不是改名冒充新引擎。
