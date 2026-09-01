# Roadmap

## v0.1 · 一期浏览器闭环（本仓库当前版本）

- 人工造局与三个候选块编辑。
- 真人拖拽 Take 与基础机器 Take。
- 非破坏式节奏重编译。
- Three.js 三维棋盘、材质、灯光、摄像机、确定性破碎。
- 固定帧 Chrome MP4 导出。
- 工程码、运行时校验、自动保存和 DCC 扩展缝。

## v0.2 · 一期增强

- 多组候选序列编辑器，而不只编辑首组三块。
- 3×3 自定义形状绘制器与项目级 Shape Library。
- 逐动作节奏覆盖、动作重排、检查点重录。
- 高光局/险胜局/连消局生成器与约束求解器。
- 音频事件轨与确定性基础混音。
- WebGPU/TSL 渲染后端 Benchmark，并保留 WebGL2 降级。
- 独立 Render Worker、性能统计与批量变体队列。

## v0.3 · DCC 资产入口

- `AssetRef` 外部 Provider 的正式 Runtime Asset Contract。
- Blender GLB 牌块、破碎 Rig、材质烘焙和发布插件。
- AE/Blender Flipbook、Depth/Normal/Emission Pass 导入。
- Golden Frame 对比、显存预算、版本和来源追踪。
- 只有资产库缺能力时才回到 DCC；普通视频继续由 Chrome 闭环。

## v0.4 · Agent 化

- MCP、CLI 和 HTTP 三类高层工具入口。
- Agent 通过规则状态和合法动作 API 下棋，不通过截图猜测。
- 创意目标转为局面约束、节奏曲线、视觉原子与变体矩阵。
- 自动预览、画面质检、异常定位和批量渲染调度。
