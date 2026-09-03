# REVIEW — T0–T5 / Next phase single-agent execution

## 身份

仓库：dongyuan21/block-creative-studio  
任务 ID：T0 T1 T2 T3 T4 T5（单 Agent 顺序）  
业务基线 SHA：`74a2fba002fe62643884759b6611af9181330964`  
计划 SHA：`fec24de6764bb50ef082730321b167cf8a29259f`  
实现分支：`cursor/next-phase-t0-t5-5d9d`  
实现 Head SHA：见本分支最新 commit（提交后写入 `review-package/review-manifest.json`）  
依赖 PR/commit：https://github.com/dongyuan21/block-creative-studio/pull/1  
执行环境：Linux, Node 22, Three.js 0.185.1  
实际 Renderer：Headless Chrome + SwiftShader — **software WebGL**

## 本次完成了什么

针对 GPT Pro 在 `977c9a5` 上列出的 7 个 merge blockers，本轮只修契约与接线，**不把 T0–T5 标为完成，也不做视觉自批**。

1. **同贴图改参数不再被忽略。** `runtimeTextureResourceKey` 只决定是否重新加载 GPU 纹理（含 `colorSpace`）；`materialDescriptorKey` 决定是否提交 descriptor、清材质 cache 并重绘。Load gate 在首次 commit 前不会把空 key 当成已就绪。
2. **交互加载失败上送到 Variant Workspace / Inspector。** `ThreeViewport` 不再 `.catch(() => undefined)`；错误与 loading 会阻止正式导出。2D `setRuntimeAssets` 使用 per-revision 失败集合。纹理加载改为 `Promise.allSettled`，失败后释放已完成的 Texture。
3. **Capture 不再改写 EffectPack / lockMode。** 新增真实资产 `effect.universal-clear`（`compatibleMaterialClasses: ['*']`），通过 `slotOverrides.clear.primary` 选用；`effect.copper-clear` 仍只声明 `metal`。Recipe 保持 `frame-exact`。
4. **证据包与当前 HEAD 解耦。** Capture 开始前清空 `review-package/run/`，只写入本次文件；CI Artifact 改为上传该目录（`capture-run`）。Git 中 `frames/` 与 `videos/` 标为 **stale / superseded**。
5. **illegal-preview 不再是 Game Over。** Fixture 保持 `playing`、存在其他合法落点，并带 `draggedPiece` + 非法锚点。终局 Continue 弹窗在 combo=0 时显示 `Game Over` 而不是伪造 `Combo 1`。
6. **steel / wood / aurora 的 pack `contentHash` 改为对 pack 身份（不含 contentHash 字段）的真实 SHA-256。** 占位 `aaaa…/bbbb…/cccc…` 已移除。
7. **`viewportPolicyForRenderer` / `applyViewportPolicy`。** resize 与 `setFrame` 在 renderer 变化时都会重设 aspect / viewport / scissor。
8. **Plan → MaterialRuntime 接入正式 Studio Adapter。** `resolveStyleFromRenderPlan` 从 `tile.material` 编译 `materialRuntime`，App / capture / exporter 共用 `materialRuntimeFromPlan`。
9. **工厂实现 `combine=replace`：** 有贴图时 roughness/metalness factor=1，baseColor 为白；emission 不再在 0 时强制设白；`specular` 写入 `specularIntensity`。
10. **编译/解析拒绝** 重复 slot、`orm` 与 split 并存、无意义 channels。Loader 对 sha256 内容哈希做字节比对，并有尺寸/字节上限。
11. 材质诊断 still 改为 Neutral LookDev + idle；clear-peak 仍保留但不作为材质视觉通过证据。

## 验收矩阵

| 条件 | 状态 | 证据 | 复跑 |
|---|---|---|---|
| 源码/类型/构建检查 | PASS | `npm run check && npm run typecheck && npm run build` | 同上 |
| 单元与负向测试 | PASS | 105 tests | `npm test` |
| 真实浏览器捕获 | 见 CI `capture-run` Artifact | `review-package/run/`（不写回 git frames/videos） | `npm run test:browser-e2e` / `npm run capture:review` |
| Git 中旧 PNG/MP4 | stale | `review-package/frames/STALE.md` `videos/STALE.md` | 不得当作当前 HEAD 视觉证据 |
| 13 组参考 Golden 内容 | BLOCKED | `golden-report.json` summary.BLOCKED=39 | 无源视频 |
| 人工视觉批准 | PENDING | 实现者不得自批 | GPT Pro / 用户 |

## 已知限制与未完成项

见 `review-package/known-limitations.md`。

契约存在 ≠ 编译可用 ≠ 资源准备 ≠ 实际渲染 ≠ 人工视觉批准。

Clear-peak 白色冲击环、碎片无材质身份、木材识别度、真实 GPU、正式 9:16 生产构图、独立 Pass 模块、G-buffer/HDR 诊断、39 条商业 Golden **均未完成**。

## 质量声明

技术状态：ready-for-review  
人工视觉批准：PENDING  
T0–T5：未完成  
PR：保持 Draft，不合 main
