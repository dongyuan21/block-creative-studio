# 一期规划与代码实现对照

这份文档用于 Review：它把产品规划中的能力映射到具体代码，而不是只给出笼统的“已实现”描述。

| 规划能力 | 主要实现位置 | 当前状态 |
|---|---|---|
| 8×8 方块放置、行列同步清除 | `src/domain/gameEngine.ts` | 已实现并由核心检查执行 |
| 三块候选与 Seed 确定性刷新 | `src/domain/gameEngine.ts`, `src/domain/rng.ts` | 已实现 |
| 18 种基础形状 | `src/domain/shapes.ts` | 已实现 |
| 牌面模板与逐格绘制 | `src/domain/boardPresets.ts`, `src/components/AssetPanel.tsx`, `src/renderer/ThreeViewport.tsx` | 已实现 |
| 真人拖拽试玩 | `src/renderer/ThreeViewport.tsx`, `src/state/useStudioModel.ts` | 已实现 |
| 语义 Replay + 指针轨迹 | `src/domain/types.ts`, `src/state/useStudioModel.ts` | 已实现 |
| 撤回和 Take 管理 | `src/state/useStudioModel.ts`, `src/components/AssetPanel.tsx` | 已实现 |
| 规则型机器玩家 | `src/domain/gameEngine.ts`, `src/director/botDirector.ts` | 已实现，非 LLM Agent |
| Raw Take → 固定帧导演回放 | `src/director/presentationCompiler.ts` | 已实现并执行确定性检查 |
| 四套节奏模板 | `src/director/rhythmPresets.ts`, `src/components/InspectorPanel.tsx` | 已实现 |
| 3D 彩块、厚度和倒角 | `src/renderer/StudioScene.ts` | 已实现 |
| 三套 PBR 材质 | `src/renderer/materialPresets.ts` | 已实现 |
| 灯光与摄像机预设 | `src/renderer/stylePresets.ts`, `src/renderer/StudioScene.ts` | 已实现 |
| 真 3D 碎片、粒子、冲击波、Bloom | `src/renderer/StudioScene.ts` | 已实现 |
| 实时试玩 / Cinematic 双档 | `src/renderer/StudioScene.ts`, `src/exporter/offlineVideoExporter.ts` | 已实现 |
| 固定帧 1080×1920、30fps MP4 | `src/exporter/offlineVideoExporter.ts` | 已实现；待联网安装依赖后做真实 Chrome 编码基准 |
| 工程码导入、导出和自动保存 | `src/domain/projectValidation.ts`, `src/state/useStudioModel.ts` | 已实现 |
| 模式锁、导出快照冻结与编码能力预检 | `src/state/useStudioModel.ts`, `src/exporter/offlineVideoExporter.ts` | 已实现并由核心检查覆盖关键不变量 |
| DCC 扩展缝 | `src/extensions/contracts.ts` | 仅接口，符合一期范围 |
| 多组候选序列编辑 | — | 延至 v0.2 |
| 3×3 自定义形状绘制器 | — | 延至 v0.2 |
| 逐动作节奏覆盖 | — | 延至 v0.2；一期支持全局参数化节奏 |
| 音频混音 | — | 延至 v0.2；一期视频无声 |
| WebGPU 专用后端 | — | 延至 v0.2 Benchmark；一期使用稳定 WebGL2 后端 |
| Blender / AE 导入 | — | 延至 v0.3，只保留 Provider 接口 |

## 关键架构门禁

```text
Game Core
   ↓
Semantic Take
   ↓
Director Compiler
   ↓
PresentationFrame(frame=N)
   ↓
Three.js Scene
   ↓
Mediabunny / WebCodecs MP4
```

- 玩法核心不依赖 React、Three.js 或浏览器帧率。
- 真人和机器输出同一种 `PlacementAction`。
- 导出只按照帧号求值，不用实时录屏。
- 几何、材质、灯光、摄像机、特效和节奏分别配置。
- DCC 未来只能作为 Provider/Backend 接入，不反向污染核心工程码。
