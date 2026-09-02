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

开发服务地址为 `http://127.0.0.1:4173`。

运行时源码不引用公共 CDN；`npm install` 完成后，Vite 会从本地依赖构建。首次安装依赖需要网络，之后可在本机离线开发、预览和渲染。

## 校验与构建

```bash
npm run check        # 无依赖源码完整性检查 + 严格玩法/Replay 烟雾检查
npm run check:core   # 仅运行核心玩法/Replay 检查
npm test             # Vitest 单元测试
npm run typecheck
npm run build
npm run preview
```

## 使用流程

1. 在左侧选择牌面模板，点击棋盘绘制或擦除。
2. 选择三个候选槽位，设置形状和颜色。
3. 点击“真人试玩”拖拽落子，或点击“机器试玩”。
4. 保存 Take，进入导演回放。
5. 在右侧独立替换彩块几何、材质、灯光、镜头、3D 清除特效和节奏。
6. 在底部事件时间线检查动作与清除帧位。
7. 点击“生成 1080P MP4”。导出过程不是实时录屏，而是逐帧重演。
8. 导出工程码后，同一 Take 可在另一台机器继续换风格和出片。

## 代码结构

```text
src/domain       纯 TypeScript 玩法、形状、牌面与确定性随机
src/director     Take → 固定帧 PresentationFrame
src/renderer     Three.js 场景、PBR 材质、灯光、镜头、3D 破碎
src/exporter     Mediabunny / WebCodecs / MP4
src/components   人用工作台
src/state        项目、试玩、Take、回放和导出编排
src/extensions   下一期 DCC/外部资产扩展缝
schemas          工程码 JSON Schema
```

进一步设计见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)、[`docs/IMPLEMENTATION_MAP.md`](docs/IMPLEMENTATION_MAP.md)、[`docs/PHASE1_STATUS.md`](docs/PHASE1_STATUS.md)、[`docs/VALIDATION.md`](docs/VALIDATION.md)、[`docs/REVIEW_CHECKLIST.md`](docs/REVIEW_CHECKLIST.md) 和 [`docs/ROADMAP.md`](docs/ROADMAP.md)。

## 当前限制

- 受控环境优先支持桌面 Chrome；尚未承诺 Safari、Firefox 和移动浏览器导出。
- 视频导出当前为无声 MP4，音频事件接口将在后续加入混音层。
- 当前使用 Three.js WebGL2 稳定后端；WebGPU 后端属于后续性能升级。
- 当前只编辑首组三个候选块；多组候选序列编辑器与自定义形状绘制器列入 v0.2。
- Blender/AE 仅保留接口，本期不导入 DCC 资产。

## GitHub 发布

v0.1.4 交付可通过源码 ZIP 或保留提交历史的 Git Bundle 发布到 `dongyuan21` 名下；命令见 [`docs/GITHUB_PUBLISH.md`](docs/GITHUB_PUBLISH.md)。
