# Block Creative Studio

一个面向 IAA 方块消除试玩素材的浏览器创作与渲染原型。它不是通用游戏引擎，也不是传统录屏工具：用户先编辑牌面并由人类或机器完成试玩，系统保存语义 Replay；随后可独立替换三维几何、材质、灯光、摄像机、破碎特效和节奏，再由 Chrome 固定帧重演并导出 1080×1920、30fps MP4。

> **状态说明（v0.1.4-alpha）**：当前仓库是用于验证“玩法状态 → Replay → 浏览器渲染 → 视频导出”链路的架构原型，不是对 Block Blast 视觉、UI、计分、发牌、交互和特效的逐项复刻。下一阶段将以真机参考视频为基准，先完成 2D 原子拆解与视觉/行为校准，再扩展 3D 表现；现有 Three.js 模块只作为实验后端保留。

> 本项目独立实现“8×8 方块放置并清除完整行列”的通用机制。仓库不包含 Block Blast 的品牌、美术、声音或专有代码。

## 当前可用能力

- 8×8 核心玩法、三块候选、合法落子、行列同步清除、Combo、失败判断。
- 牌面模板、逐格编辑、18 种方块形状和候选块颜色配置。
- 真人鼠标/触摸试玩，录制语义动作与归一化指针轨迹。
- 规则型机器玩家，一键生成 Take；人类和机器共用同一种动作协议。
- `human-natural`、`tight-fast`、`suspense-burst`、`combo-rush` 四套导演节奏。
- Three.js 三维棋盘，真实厚度、倒角、阴影、环境反射和镜头。
- 亮面塑料、糖果树脂、水晶玻璃三套 PBR 材质。
- 清爽碎裂、水晶爆裂、能量爆发三套三维清除效果。
- 固定时间步的逐帧回放与浏览器内 H.264/MP4 编码。
- 工程码 JSON 导入/导出，保留下一期 DCC Provider 接口。

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
