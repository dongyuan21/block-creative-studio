# REVIEW — T0–T5 / Next phase single-agent execution

## 身份

仓库：dongyuan21/block-creative-studio  
任务 ID：T0 T1 T2 T3 T4 T5（单 Agent 顺序）  
业务基线 SHA：`74a2fba002fe62643884759b6611af9181330964`  
计划 SHA：`fec24de6764bb50ef082730321b167cf8a29259f`  
实现分支：`cursor/next-phase-t0-t5-5d9d`  
实现 Head SHA：见本 PR 最新 commit（提交后写入 `review-package/review-manifest.json`）  
依赖 PR/commit：无  
执行环境：Linux 6.12, Node 22.14.0, npm 10.9.7, Three.js 0.185.1, HeadlessChrome 148  
实际 Renderer：SwiftShader Device (Subzero) — **software WebGL**

## 本次完成了什么

- 冻结 Headless 共享契约：`FrameRenderRequest`、`PreparedResources`、`FrameRenderResult`、`CalibrationCase`、`MaterialRuntimeDescriptor`。
- 明确 1064×1788 设计坐标与 1080×1920 视频坐标的 contain 映射；导出不再拉伸 Reference 2D。
- Reference 2D 按图层 Pass 隔离，并提供原生设计分辨率 offscreen 捕获（不再放大预览 Canvas）。
- 资源解码失败会拒绝正式 warmup/capture，不再静默回退。
- 批量 Golden：读取 13 组场景、展开 39 个锚点、输出 JSON+HTML；无源视频全部 **BLOCKED**。
- `fixed-camera-cinematic` 消费锁定 9:16 Shot Profile；LookDev 诊断通道进入 Inspector。
- MaterialPack 编译为运行时描述符；不锈钢 / 橡木带独立合成 PBR 贴图，aurora-shell 为任意 ID 的参数材质。Three.js 牌块在存在 `style.materialRuntime` 时走 PBR 工厂并采样贴图。
- CLI 增加 `material compile` 与 `golden batch`，且不输出 `rendered: true`。
- 自制公开 Fixture 覆盖 Idle、预览、单行清除、交叉清除、连续落子、终局。
- 无头 Chrome 捕获：17 张原生/诊断帧 + 同一 6s Take 的 2D 与三个固定机位材质 1080×1920/30fps 无声 MP4。

## 改动范围与兼容

改动文件：Headless 契约/CLI、Reference2DScene、StudioScene、exporter、Inspector、fixtures、PBR 贴图加载、捕获 harness、测试与证据包。  
接口与 Schema：`StyleSpec` 增加可选 `diagnosticView` / `enabledPasses` / `materialRuntime`；renderer 增加 `fixed-camera-cinematic`。  
旧工程迁移：缺省字段保持原行为；LookDev 与旧 renderer 仍可用。  
未修改的玩法不变量：落子、清行列、分数、Replay 协议。  
破坏性变更：无（Reference 2D 导出从 stretch 改为 letterbox，成片边缘会出现 letterbox，这是刻意修正）。

## 验收矩阵

| 条件 | 状态 | 证据 | 复跑 |
|---|---|---|---|
| 源码/类型/构建检查 | PASS | `npm run check && npm run typecheck && npm run build` | 同上 |
| 单元与负向测试 | PASS | 82 tests | `npm test` |
| 真实浏览器捕获 | PASS | `review-package/reports/browser-e2e.json`（SwiftShader） | `npm run capture:review` |
| 原生帧/视觉回归 | PASS（自制 Fixture） | `review-package/frames/after/` 1064×1788 2D 与 1080×1920 3D | 同上 |
| 重构前后像素 diff | NOT_RUN | 无 `frames/before`（重构前未冻结代理放大帧） | — |
| 状态、事件与镜头不变量 | PASS | `tests/nextPhaseContracts.test.ts` + `invariants-report.json` | `npm run test:render-regression` |
| 实际 MP4 导出 | PASS | 4 条 1080×1920 30fps 180 帧无声 H.264 | `npm run capture:review` |
| 性能、资源释放 | NOT_RUN（显存） / PASS（取消导出） | performance-report 无 GPU 计数；cancel-export PASS | — |
| 13 组参考 Golden 内容 | BLOCKED | `golden-report.json` summary.BLOCKED=39 | `npm run cli -- golden batch --index docs/reference/v2/GOLDEN_SCENE_INDEX_V1.json` |
| PBR 编译 | PASS | 三份 runtime JSON；钢/木含 maps | `npm run cli -- material compile --pack examples/headless/materials/material.stainless-steel.json` |
| PBR 贴图驱动的 GPU 采样 | PASS（软件 GL 证据） | 钢/木 stills 与三变体 MP4 哈希不同 | 打开 `frames/after/3d-*-peak.png` |
| 三变体 1080×1920 MP4 | PASS | `review-package/videos/fixed-{steel,wood,aurora}-1080x1920.mp4` | ffprobe 均为 1080×1920 / 30fps / 6.000s / 180 frames |
| 人工视觉批准 | PENDING | 实现者不得自批 | GPT Pro / 用户 |

## 关键可见结果

before：`74a2fba` 单帧 Golden Diff + LookDev 三档，2D 捕获为放大预览。  
after：原生 1064×1788 捕获、Pass 隔离、Shot Profile、PBR maps 进入 Three.js、6s 连续落子切片的 2D+三材质 MP4。  
diff：无重构前 PNG（NOT_RUN）。当前 after 帧可人工对比。  
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
npm run capture:review
```

公开 Take：`src/domain/publicFixtures.ts` 中 `consecutiveTake`（180 帧 / 6.0s）与 `singleClearTake` / `crossClearTake`。

## 失败路径

- 无源视频：Golden 内容 BLOCKED，工具仍产出 39 条 case。
- 法线贴图缺 Y 约定：material compile 失败。
- 故意错色像素对：calibration score < 80。
- 浏览器取消导出：capture harness `cancel-export` PASS。
- 相同帧重复捕获：`seek-repeat` SHA 一致。

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
4. 钢/木贴图是否为两套独立图案，aurora 是否仅靠参数/任意 ID 改变外观。  
5. 四条 MP4 规格是否自洽（1080×1920、30fps、6s、无声），以及 SwiftShader 成片能否作为质感结论（实现者认为：**不能**，只证明导出通路）。
