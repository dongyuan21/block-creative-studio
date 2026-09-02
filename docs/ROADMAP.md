# Roadmap

## 0.2.x · Reference-first 2D baseline（当前）

- 从真机视频建立带证据状态的布局、原子、时间与计分规格。
- Canvas 2D 参考渲染器成为默认工作模式。
- 方块材质、牌面纹样、逐格颜色、落子反馈、预消除和清除效果完全分离。
- 真人/机器 Take 共用相同 Replay，并可在不重玩的情况下换视觉和节奏。
- 固定帧 Chrome 视频导出继续保持闭环。

### 后续 0.2.x 门禁

- 逐帧并排/差分校准工具。
- 候选刷新 VFX、复杂认可反馈与异步 VFX Timeline。
- 多组候选序列编辑器与 3×3 自定义形状编辑器。
- 逐动作节奏覆盖、检查点重录与动作重排。
- 用受控录像标定准确计分、Combo、评价和发牌规则。
- 音频事件轨与确定性基础混音。

## 0.3 · 2D → 3D 泛化

- 先把已经验证的 2D 原子映射为 3D 几何、材质、灯光和摄像机语义。
- 同一 Replay、计分、预消除与反馈状态驱动 2D/3D 两个后端。
- WebGPU/TSL Benchmark，保留 WebGL2 降级。
- 真三维清除不再自行发挥，而是逐项对应已验证 2D 效果角色。

## 0.4 · DCC 资产入口

- `AssetRef` 外部 Provider 与 Runtime Asset Contract。
- Blender GLB 方块、破碎 Rig 和材质烘焙。
- AE/Blender Flipbook、Depth/Normal/Emission Pass 导入。
- Golden Frame、显存预算、版本和来源追踪。

## 0.5 · Agent 化

- MCP、CLI 和 HTTP 高层工具入口。
- Agent 通过规则状态与合法动作 API 下棋，不通过截图猜测。
- 创意目标转为局面约束、节奏曲线、视觉原子和变体矩阵。
- 自动并排质检、偏差定位和批量渲染调度。
