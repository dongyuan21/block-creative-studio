# REVIEW — T0–T5 / Next phase single-agent execution

## 身份

仓库：dongyuan21/block-creative-studio  
任务 ID：T0 T1 T2 T3 T4 T5（单 Agent 顺序）  
业务基线 SHA：`74a2fba002fe62643884759b6611af9181330964`  
计划 SHA：`fec24de6764bb50ef082730321b167cf8a29259f`  
实现分支：`cursor/next-phase-t0-t5-5d9d`  
实现 Head SHA：见本提交；Full Capture 完成后会把 planHash / 文件 hash 写入 `review-package/run/` 与 CI Artifact `capture-run`  
依赖 PR/commit：https://github.com/dongyuan21/block-creative-studio/pull/1  
执行环境：Linux, Node 22, Three.js 0.185.1  
实际 Renderer：Headless Chrome + SwiftShader — **software WebGL**

## 本次完成了什么

针对 GPT Pro 在 `977c9a5` 上列出的 7 个 merge blockers，以及复审后仍未绑到最新 HEAD 的证据缺口。本轮只修契约、接线与捕获隔离，**不把 T0–T5 标为完成，也不做视觉自批**。

1. **同贴图改参数不再被忽略。** `runtimeTextureResourceKey` 只决定是否重新加载 GPU 纹理；`materialDescriptorKey` 决定是否提交 descriptor。
2. **交互加载失败上送到 Variant Workspace / Inspector。** 状态为 `idle | loading | ready | error | stale`。`stale` 表示新材质尚未提交、画面仍是上一套。正式导出按钮在非 `ready` 时禁用。同 descriptor 的 snapshot 更新不会把状态打回 loading。
3. **Capture 不再改写 EffectPack / lockMode。** 使用真实资产 `effect.universal-clear`（`compatibleMaterialClasses: ['*']`）；Recipe 保持 `frame-exact`。
4. **证据包与 Git 旧媒体解耦。** Capture 清空并只写入 `review-package/run/`；CI 上传该目录。本轮 CI 在 smoke 之后追加 **Full Capture**（原生帧 + 四条 MP4）。Git 中 `frames/` 与 `videos/` 仍为 **stale**。
5. **illegal-preview 不是 Game Over。** Fixture 保持 `playing`、存在其他合法落点，并带 `draggedPiece` + 非法锚点。终局 Continue 在 combo=0 时显示 `Game Over`。
6. **示例资产 contentHash 改为 canonical SHA-256**（omit `contentHash` 后 stable stringify）。steel / wood / aurora 材质包、copper Look 闭包、universal-clear 均不再使用 `aaaa…/bbbb…/cccc…/9999…` 占位。Look 槽位 hash 与子资产一致。
7. **`applyViewportPolicy` 在 `resize` 与每一次 `setFrame`（含 renderer / style 切换）都会调用**，不依赖 ResizeObserver。
8. **有贴图材质默认 `combine=replace`。** 避免 tile 色 × pack 色 × albedo 把木材压成灰塑。无贴图的 Aurora 仍为 `multiply-factor`。
9. **Clear 冲击环降强度**：去掉 HDR `rgb(2.1,2.1,2.1)` 加性白环，缩小半径与透明度，降低 balanced/high-energy 的 clear bloom。碎片按材质着色，木材使用细长 splinter 缩放。这不是视觉批准。
10. **木材贴图**改为更暖的 256×256 年轮/导管纹理，clearcoat=0。诊断 still 仍是 Neutral LookDev + idle。

## 验收矩阵

| 条件 | 状态 | 证据 | 复跑 |
|---|---|---|---|
| 源码/类型/构建检查 | PASS | `npm run check && npm run typecheck && npm run build` | 同上 |
| 单元与负向测试 | PASS | 108 tests | `npm test` |
| 真实浏览器捕获 | CI `capture-run` Artifact | `review-package/run/`（不写回 git frames/videos） | `npm run test:browser-e2e` / `npm run capture:review` |
| Git 中旧 PNG/MP4 | stale | `review-package/frames/STALE.md` `videos/STALE.md` | 不得当作当前 HEAD 视觉证据 |
| 13 组参考 Golden 内容 | BLOCKED | `golden-report.json` summary.BLOCKED=39 | 无源视频 |
| 人工视觉批准 | PENDING | 实现者不得自批 | GPT Pro / 用户 |

## 已知限制与未完成项

见 `review-package/known-limitations.md`。

契约存在 ≠ 编译可用 ≠ 资源准备 ≠ 实际渲染 ≠ 人工视觉批准。

Clear FX、碎片材质身份、木材可信度、真实 GPU、正式 9:16 生产构图、独立 Pass 模块、G-buffer/HDR 诊断、39 条商业 Golden **均未完成**。实现者未视觉自批。

## 质量声明

技术状态：ready-for-review  
人工视觉批准：PENDING  
T0–T5：未完成  
PR：保持 Draft，不合 main
