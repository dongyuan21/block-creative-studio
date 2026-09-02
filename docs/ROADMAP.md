# Roadmap

## 0.2.x · Full-video truth layer and Reference 2D（当前）

### 已完成的基础门禁

- 对 225.833 秒、13,546 帧参考录像完成无采样的全帧机器扫描；
- 建立连续、无缺口的 Frame State Index；
- 建立机器候选 + 人工复核的 Event Instance Index；
- 建立 149 个语义 Atom 的资产谱系；
- 对每个 Atom 标记核心必选、事件必选、参考档必选、可选或 capture-only；
- 对每个 Atom指定 Reference 2D、固定机位影视后端与可选 Full 3D 表达；
- 建立 Golden Scene 索引与自动一致性校验。

### 下一门禁：Reference 2D 资产化与 Golden Diff

- 将 `Reference2DScene` 从单体 `drawXXX()` 拆为 Background、Board、Tile、Face、Tray、Preview、Placement、Clear、Praise、Combo、High Score、Endgame 等独立渲染模块；
- 让内置程序资产全部通过统一 Asset Slot/Registry 调用，不再写死在一个场景文件中；
- 支持项目内背景、牌面 Mask/SVG、Tile Look、评价词和基础 VFX 资产替换；
- 本地提取 13 组 Golden Scene 的 start/peak/end 帧；
- 建立参考帧、系统帧和 Diff 指标；
- 完成候选刷新、New High Score、六级 Praise、异步 VFX 重叠和终局子资产；
- 用受控样本继续标定计分、Combo、Praise 和发牌规则；
- 建立音频 Event Lineage，但暂不做生成模型接入。

## 0.3 · Fixed-camera hybrid cinematic renderer

- 摄像机作为一级 `CameraProfile` 锁定 Transform 与投影；
- 保持同一玩法、Replay、事件帧位与资产 Atom；
- 棋盘与格槽采用浅 3D 或法线贴图 Sprite；
- 牌块主体和材质一致性要求高的大碎片采用真实 3D；
- 牌面采用独立 Decal/Mask；
- 预消除、扫光、边框余辉和曝光反应采用 Shader/Render Recipe；
- 小碎屑、星光、花瓣采用 Camera-facing Sprite；
- HUD、分数、Praise、Combo、New High Score 与终局界面保持 Screen 2D；
- 从一条“拾取 → 拖拽 → 预消除 → 单行清除 → 评价 → 可继续输入”的完整切片开始迁移；
- Chrome 固定帧导出同时支持 Reference 2D 与 Cinematic 后端。

## 0.4 · DCC 资产入口

- `AssetRef` 外部 Provider 与 Runtime Asset Contract；
- Blender GLB 牌块、棋盘部件、真实大碎片和材质烘焙；
- Blender 刚体/Alembic 结果编译为压缩 Transform Track；
- AE/Blender Flipbook、Depth/Normal/Emission Pass 导入；
- Camera Profile、Golden Frame、显存预算、版本和来源追踪。

## 0.5 · Agent 化

- MCP、CLI 和 HTTP 高层工具入口；
- Agent 通过规则状态与合法动作 API 下棋，不通过截图猜测；
- 创意目标转为局面约束、节奏曲线、语义资产槽位和变体矩阵；
- 自动 Golden Diff、偏差定位、素材组合和批量渲染调度。
