# Block Creative Studio

Block Creative Studio 是一个面向 IAA 方块消除试玩素材的浏览器创作与渲染工程。用户先编辑牌面，由人类或机器完成试玩并保存语义 Replay；随后可以独立调整节奏、视觉资产和演出层，最后由 Chrome 按固定时间步逐帧重演并导出视频。

> 当前版本为 `0.3.0-alpha.0`。工程主线是 **reference-first 2D → 固定机位混合影视渲染**。2D 阶段负责确认玩法、布局、事件、时序和资产谱系；后续生产后端会在固定摄像机下混合 Screen 2D、Shader、浅 3D、真实 3D 牌块/碎片和预烘焙 VFX，而不是把所有元素强制做成一种技术形态。

本项目独立实现 8×8 方块放置与完整行列清除机制；不包含第三方游戏的品牌、原始美术、声音、源代码或内部算法。

## 当前主线：整段视频审计与 Reference 2D

第一份 225.833 秒真机录像已经完成全帧机器扫描：13,546 个源帧全部纳入连续状态索引，没有采样跳帧。机器区间用于保证覆盖和检索事件候选；代表事件另行人工复核，不把启发式窗口冒充逐像素人工真值。

[`docs/reference/v2/`](docs/reference/v2/README.md) 当前包含：

- `FULL_FRAME_STATE_INDEX_V1.json`：第 0～13,545 帧连续覆盖；
- `EVENT_INSTANCE_INDEX_V1.json`：分数、拖拽、清除、刷新、反馈、终局候选窗口与人工复核事件；
- `ASSET_LINEAGE_V2.json`：149 个语义 Atom，不是图片清单；
- `REFERENCE_PROFILE_V2.json`：核心必选、事件必选、参考档必选、capture-only 与可选项；
- `FIXED_CAMERA_RENDERER_MAPPING_V1.json`：每个 Atom 在固定机位生产后端中的主要表达方式；
- `GOLDEN_SCENE_INDEX_V1.json`：下一轮本地截图校准的代表区间。

整片审计额外确认：

- 方块存在七个颜色族：`coral / amber / lime / cyan / blue / violet / rose`；
- 牌面至少包含扶桑花、叶片、龟背竹、多瓣花和玫瑰轮廓等家族；
- 评价词至少包含 `Nice / Great / Amazing / Incredible / Fantastic / Unbelievable` 六级；
- 存在独立 `NEW HIGH SCORE` 横幅与最高分动态更新；
- 候选刷新由花轮廓、花芯、光晕、花瓣/彩屑和 Piece 入场构成；
- 玩法输入可以与上一轮 Praise、Combo、计分和余辉异步重叠。

精确清除得分、格内 `5/9` 选择、Praise 阈值、Combo 窗口、发牌策略和音频事件仍标记为 `unresolved`。

## 当前可运行能力

- 8×8 玩法核心、三个候选块、合法落子、同步清行列、候选刷新和失败判断；
- 牌面模板、逐格棋盘编辑、18 种基础形状与七色 Token；
- 候选方块逐格颜色编辑；
- 真人鼠标/触摸试玩，记录语义动作、归一化指针轨迹、帧长与 Seed；
- 规则型机器玩家；人和机器共用同一种 Action/Take 协议；
- Raw Take → Directed Take → 固定帧 PresentationFrame；
- 四套导演节奏：`human-natural`、`tight-fast`、`suspense-burst`、`combo-rush`；
- 默认 `reference-2d` Canvas 渲染器；
- 保留 `three-3d` 实验后端，但停止把它当作当前视觉基线；
- WebCodecs + Mediabunny 的浏览器固定帧 H.264/MP4 导出；
- 工程 JSON 导入/导出、运行时校验、自动保存和 CI；
- 固定机位 Camera Profile 与语义资产类型契约，为后续混合渲染器留出稳定接口。


## Headless Core 与外部 Agent 边界

BCS 当前开始提供 Agent-neutral 的 Headless Core。系统本身不内置 LLM 或 Prompt 面板；外部 Agent、设计师、DCC 或生成工具先生产版本化资产与 Recipe，BCS 再负责严格校验、变体编译、质量门禁和后续确定性渲染。

已加入：

- 开放 `AssetManifest / MaterialPack / EffectPack / LookPack / PluginPackage` 契约；
- `CreativeMaster + VariantRecipe → ResolvedRenderPlan` 编译器；
- `frame-exact / semantic / rule-only` 三种不变量锁定模式；
- 材质外观与破坏行为分离，以及 Material-aware Effect 兼容检查；
- 结构、确定性、权限和资源预算型 Quality Gate；
- 机器可读的 `bcs` CLI 与 JSON Schema；
- 批量矩阵编译时单变体失败隔离。

```bash
npm run build:cli
node dist-cli/cli/bcs.js capabilities
node dist-cli/cli/bcs.js variant compile \
  --master examples/headless/master.demo.json \
  --recipe examples/headless/variant.copper.demo.json \
  --assets examples/headless/assets \
  --renderer fixed-camera-cinematic \
  --require-hashes \
  --out /tmp/copper-plan.json
node dist-cli/cli/bcs.js quality check --plan /tmp/copper-plan.json --strict --require-hashes
```

详见 [`docs/architecture/AGENT_OPERABLE_BOUNDARY.md`](docs/architecture/AGENT_OPERABLE_BOUNDARY.md)、[`docs/architecture/HEADLESS_CORE_V1.md`](docs/architecture/HEADLESS_CORE_V1.md) 和 [`docs/cli/README.md`](docs/cli/README.md)。当前 CLI 只完成契约、编译与结构质量门禁；插件执行、MCP、云端渲染和 Web UI 的开放资产接入仍是后续工作。

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
npm run check:reference
npm test
npm run typecheck
npm run build
```

GitHub Actions 会在每次 Push 和 Pull Request 中执行同一组检查。`check:reference` 会验证整段帧覆盖、事件边界、149 个 Atom、必选性分类、固定机位映射与 Golden Scene 引用。

## 本地重建整段视频索引

源视频和参考截图不会提交到公共仓库。持有本地参考录像时，可执行：

```bash
python -m pip install -r tools/reference_audit/requirements.txt
python tools/reference_audit/analyze_video.py \
  "/path/to/reference.mp4" \
  --output-dir .reference-audit-work/generated

python tools/reference_audit/extract_golden_frames.py \
  "/path/to/reference.mp4" \
  docs/reference/v2/GOLDEN_SCENE_INDEX_V1.json \
  --output-dir .reference-audit-work/golden
```

详见 [`tools/reference_audit/README.md`](tools/reference_audit/README.md)。

## 推荐 Review 流程

1. 先审阅 [`FULL_VIDEO_AUDIT_REPORT_V1.md`](docs/reference/v2/FULL_VIDEO_AUDIT_REPORT_V1.md)，确认整片新增发现；
2. 审阅 [`ASSET_LINEAGE_V2.json`](docs/reference/v2/ASSET_LINEAGE_V2.json) 的必选性与固定机位表达；
3. 本地生成 Golden Scene 的 start/peak/end 帧；
4. 在 `Edit` 模式编辑棋盘和七色候选块；
5. 真人拖拽，检查拾取放大、上移、合法 Ghost 与预消除填充；
6. 保存 Take 后切换节奏，确认玩法结果不变；
7. 对照 Golden Scene 记录 Reference 2D 的布局、颜色和时序偏差；
8. 2D 门禁通过前，不扩展自由相机或通用真 3D 表现。

## 代码结构

```text
src/domain          纯 TypeScript 玩法、形状、计分分解、工程校验
src/headless        开放资产契约、Registry、变体编译与质量门禁
src/cli             外部 Agent / CI 使用的机器可读 CLI
src/director        Take → 固定帧表现状态；逻辑与 VFX 时间解耦
src/assets          语义资产与固定机位 Camera Profile 契约
src/reference2d     真机参考 2D 布局、Canvas 渲染和交互
src/renderer        旧 Three.js 3D 实验后端
src/exporter        固定帧 Canvas → WebCodecs → MP4
src/components      Human-first 工作台
src/state           项目、试玩、Take、回放与导出编排
docs/reference/v2  全帧索引、事件索引、资产谱系和渲染映射
tools/reference_audit  本地整片分析与 Golden Frame 提取工具
schemas             工程、资产谱系和固定机位契约 Schema
```

## 当前限制

- 13,546 帧已被机器逐帧处理并实现 100% 时间覆盖，但不是 13,546 帧全部人工逐像素标注；
- Reference 2D 仍是第一版渲染骨架，尚未达到像素级复刻；
- 当前多数视觉元素仍是内置程序绘制，尚未完成外部背景、牌面、材质包和 VFX 资产导入；
- 六级 Praise 已进入谱系，当前运行时阈值仍是明确标注的原型启发式；
- `NEW HIGH SCORE`、候选刷新复合 VFX 和完整异步演出尚未完全进入运行时；
- 导出当前为无声 MP4；音频事件轨仍未接入；
- 当前只保证桌面 Chrome；
- Blender/AE 接口保留，但 DCC 适配推迟到 2D 资产槽位和 Golden Scene 门禁之后。
