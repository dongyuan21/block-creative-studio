# Block Creative Studio

Block Creative Studio 是一个面向 IAA 方块消除试玩素材的浏览器创作与渲染工程。用户先编辑牌面，由人类或机器完成试玩并保存语义 Replay；随后可以独立调整节奏、2D 方块材质、牌面纹样、预消除填充、清除反馈、评价词与环境气氛，最后由 Chrome 按固定时间步逐帧重演并导出视频。

> 当前版本为 `0.2.0-alpha.1`。默认方向已经从“先做通用 3D 方块游戏”纠正为“先以用户提供的真机视频建立可信 2D 基线，再从同一原子模型泛化到 3D”。

本项目独立实现 8×8 方块放置与完整行列清除机制；不包含第三方游戏的品牌、原始美术、声音、源代码或内部算法。

## 当前主线：reference-first 2D

第一份真机参考视频已拆成机器可读规格：

- 1064×1788 画布与 8×8 棋盘精确布局；
- 背景、顶部 HUD、棋盘框、格槽和候选区；
- 方块材质与牌面纹样分离；
- 候选块逐格多色；
- 拾取放大、上移、吸附和合法落点预览；
- 会被消除的整行/整列预填充；
- 落子逐格计分与短暂拇指/发光反馈；
- 清除扫光、逐格 5/9 数字、星屑、消散；
- Nice / Great / Fantastic / Unbelievable、Combo 和边框余辉；
- Game Over 暗化与继续卡片。

规格与证据边界见 [`docs/reference/`](docs/reference/README.md)。准确清除奖励公式、Combo 阈值和发牌策略仍标记为 unresolved，不会冒充一比一完成。

## 当前可运行能力

- 8×8 玩法核心、三个候选块、合法落子、同步清行列、候选刷新和失败判断。
- 牌面模板、逐格棋盘编辑、18 种基础形状。
- 候选方块逐格颜色编辑；一个逻辑方块可以由多种颜色组成。
- 真人鼠标/触摸试玩，记录语义动作、归一化指针轨迹、帧长与 Seed。
- 规则型机器玩家；人和机器共用同一种 Action/Take 协议。
- Raw Take → Directed Take → 固定帧 PresentationFrame。
- 四套导演节奏：`human-natural`、`tight-fast`、`suspense-burst`、`combo-rush`。
- 默认 `reference-2d` Canvas 渲染器和可替换 2D 原子面板。
- 保留 `three-3d` 实验后端，但不把它当作当前复刻基线。
- WebCodecs + Mediabunny 的浏览器固定帧 H.264/MP4 导出。
- 工程 JSON 导入/导出、运行时校验、自动保存和 CI。

## 运行

要求 Node.js 22.12+ 和近期桌面版 Chrome。

```bash
npm install
npm run dev
```

开发服务地址：`http://127.0.0.1:4173`。

## 校验与构建

```bash
npm run check
npm test
npm run typecheck
npm run build
```

GitHub Actions 会在每次 Push 和 Pull Request 中执行同一组检查。

## 推荐 Review 流程

1. 在 `Edit` 模式选择牌面模板，逐格绘制棋盘。
2. 设置三个候选块，使用“逐格牌面颜色”编辑器制造多色 Piece。
3. 进入真人试玩并拖拽落子，确认拾取放大、上移和预消除整行填充。
4. 保存 Take，切换四种节奏，确认玩法结果不变。
5. 在右侧分别关闭/替换材质、牌面纹样、预消除、清除演出、评价/Combo 和环境粒子。
6. 使用同一个 Take 导出标准或高画质视频，无需重新试玩。
7. 对照 [`docs/reference/VIDEO_ANALYSIS_V1.md`](docs/reference/VIDEO_ANALYSIS_V1.md) 记录视觉偏差，而不是凭“像不像”笼统评价。

## 代码结构

```text
src/domain        纯 TypeScript 玩法、形状、计分分解、工程校验
src/director      Take → 固定帧表现状态；逻辑与 VFX 时间解耦
src/reference2d   真机参考 2D 布局、Canvas 渲染和交互
src/renderer      旧 Three.js 3D 实验后端
src/exporter      固定帧 Canvas → WebCodecs → MP4
src/components    Human-first 工作台
src/state         项目、试玩、Take、回放与导出编排
docs/reference    视频观察、布局、原子目录、时间和计分证据
schemas           工程码 JSON Schema
```

## 当前限制

- 2D 渲染器是第一版参考骨架，还没有达到像素级复刻。
- 当前只确认“落下一格至少 +1”；清除奖励、评价阈值和 Combo 规则仍需受控样本标定。
- 清除特效已拆成原子，但候选刷新、复杂心形反馈、VFX 与下一次输入的完全异步重叠仍需继续实现。
- 导出当前为无声 MP4；音频事件轨仍未接入。
- 当前只保证桌面 Chrome；移动浏览器、Safari 和 Firefox 不在本阶段承诺范围。
- Blender/AE 接口保留，但 DCC 资产导入推迟到 2D 闭环通过视觉验收之后。
