# Block Creative Studio

**面向 IAA 消除类游戏素材的多游戏创作平台：人用可视化界面，Agent 用 Skill + 原子 CLI。**

搭建局面、记录玩法、调整演出，再换皮和出片。Block Creative Studio（BCS）把这些步骤拆开，让同一份玩法记录可以继续编辑、重新导演，或交给 Agent 组合成可复用的制作流程。

当前版本：`0.3.0-alpha.4` · 演示游戏：**Block Placement / TapTile Match-3 / Crush Wooood!**

[快速开始](#快速开始) · [Agent 制作指南](docs/product/AGENT_WORKFLOWS.md) · [Skill 入口](skills/bcs/SKILL.md) · [CLI 手册](docs/cli/README.md) · [工程架构](docs/ARCHITECTURE.md)

![BCS 双入口：人通过 Web Studio 创作，外部 Agent 通过 Skill 组合 CLI，输出工程、视频和诊断结果](docs/images/product/bcs-agent-product.svg)

## 一套平台，两种创作方式

**使用者通过 Web Studio 创作。** 编辑局面与视觉配置，真人或机器试玩，选择 Take，在导演回放中调整节奏、检查画面，再导出视频。

**外部 Agent 通过 Skill 和 CLI 操作。** 读取官方配方，也可以复制、修改或自写 Skill，独立调用出题、换局内皮、机器试玩、校验、生成工程、编译演出和渲染命令，并读取 JSON 结果与错误码决定下一步。

BCS 不内嵌 LLM，也不要求绑定某个模型。**Agent 负责理解任务，Skill 描述制作流程，CLI 提供执行能力。** 专业工具协作是扩展方向，不是 Agent 使用 BCS 的唯一方式。

## 从一次创作，得到可继续使用的成果

| 你要做什么 | BCS 的做法 |
|---|---|
| 制作不同消除玩法的素材 | 各游戏保留自己的规则、局面和动作，共用平台的创作与生产协议 |
| 同一盘玩法尝试不同外观 | 保留 Take，换局内皮后重新校验，分别生成工程与视频 |
| 调整演出，不重新录玩法 | 将操作记录与导演节奏分开，按帧编译和回放 |
| 让 Agent 执行一段或整条任务 | 原子 CLI 可独立调用，Skill 负责组合，不强制使用单一流水线 |
| 出片失败后继续制作 | 保存中间工程和机器回执，按错误码处理；缺少 Chrome 时可以稍后补渲染 |

目前的主要产物是**配置、Take、可继续编辑的 JSON 工程、MP4、预览图及诊断报告**。支持范围以具体游戏和命令为准，不把工程 JSON 等同于通用试玩广告包，也不把它宣称为可直接还原任意 AEP 的 DSL。

## CLI 是原子能力，Skill 把能力串成任务

BCS 不只有一条“一键生产”命令。原子操作可以单独调用，也可以被 Skill 组合；制作流程可以插入人工确认、复用已有结果，或在运行条件满足后从对应步骤补跑。

![BCS 原子 CLI 与组合 Skill：出题、换皮、试玩、校验、工程生成、演出编译和渲染可以独立调用](docs/images/product/bcs-atomic-skills.svg)

| 制作任务 | 官方组合 Skill |
|---|---|
| 从一个题目开始，得到玩法记录、工程与可选视频 | [bcs-from-puzzle-to-mp4](skills/bcs-from-puzzle-to-mp4/SKILL.md) |
| 同一份 Take 换多套局内皮，不重新试玩 | [bcs-remix-looks](skills/bcs-remix-looks/SKILL.md) |
| 先检查 Take 与工程，再执行渲染 | [bcs-gate-before-render](skills/bcs-gate-before-render/SKILL.md) |
| 已有工程，稍后补出 MP4 | [bcs-resume-render](skills/bcs-resume-render/SKILL.md) |
| 校验资产并生成 Placement 的 PBR 变体计划 | [bcs-placement-variant](skills/bcs-placement-variant/SKILL.md) |
| 根据错误码选择下一步，而不是整条流程重跑 | [bcs-diagnose](skills/bcs-diagnose/SKILL.md) |

**改制作流程，改 Skill；增加底层执行能力，才扩展 CLI。** `bcs produce` 是默认路径的便捷入口，不是唯一合法的制作方式。原子命令与参数见 [CLI 手册](docs/cli/README.md)，分层原则见 [Skills 索引](skills/README.md)。

## 一盘玩法，多套外观

以 Crush Wooood! 为例：机器试玩只运行一次，留下同一份 Take；之后分别应用金色浮雕、经典枫木、深色桃花心木等局内皮，校验这份 Take，再生成各自的工程和视频。

![复用同一份 Take：通过 bcs-remix-looks 换多套局内皮，校验后分别生成工程并按需渲染](docs/images/product/bcs-remix-workflow.svg)

换的是**局内皮，不是 Studio 编辑器外壳**。校验失败就停止并定位原因，不能为了绕过错误偷偷重跑试玩。没有 Chrome 时可以先保留工程，之后使用 `bcs-resume-render` 补出片。

这也体现了 BCS 的边界：玩法决定发生什么，导演决定怎样呈现，渲染器负责像素；换外观不应悄悄改变玩法结果。跨浏览器或 GPU 的像素结果需要容差验证，不承诺 MP4 字节完全相同。

## 游戏目录

| 游戏 | 制作内容 | 当前入口 |
|---|---|---|
| **Block Placement** | 8×8 方块放置、行列清除、Take 与导演回放 | Studio 工作台；CLI 出题、换皮、试玩、出片 |
| **TapTile Match-3** | 分层叠牌、7 槽三消、点击与飞牌演出 | Studio 演示；CLI 出题、换皮、试玩、出片 |
| **Crush Wooood!** | 纵向落块、满行粉碎与坍落演出 | Studio 演示；CLI 出题、换皮、试玩、出片 |
| **Mahjong** | 分层拓扑与配对玩法方向 | Coming Soon；没有 Agent、出题或出片适配器 |

CLI 的游戏 ID 分别为 `block-placement`、`taptile-tray-match3`、`block-crush-drop`；`mahjong-solitaire` 不可调度。**可打开或可出片，不代表已经通过商业视觉验收。**

## 快速开始

要求 Node.js `22.12+`、npm `10+` 和近期桌面版 Chrome；开发时优先使用仓库 `.nvmrc` 指定的版本。

```bash
git clone https://github.com/dongyuan21/block-creative-studio.git
cd block-creative-studio
npm install
```

### 用 Studio 创作

```bash
npm run dev
```

在 Chrome 中打开 `http://127.0.0.1:4173`。首次体验可导入 `examples/demo-cross-clear.block-creative.json`，进入**导演回放**，对比 Reference 2D 与固定机位 Cinematic Look，再尝试 MP4 导出。

正式视觉评审使用 [本机评审与反馈说明](docs/LOCAL_REVIEW_AND_FEEDBACK.md) 中的统一片单，不把不同输入和质量档混在一起比较。

### 让 Agent 操作

```bash
npm run build:cli
node dist-cli/cli/bcs.js capabilities
node dist-cli/cli/bcs.js agent list
```

让外部 Agent 从 [skills/bcs/SKILL.md](skills/bcs/SKILL.md) 读取入口，再选择适合任务的组合 Skill。下面是便捷 CLI 的短预览示例，也可以把相同步骤拆开执行：

```bash
node dist-cli/cli/bcs.js produce \
  --game block-placement \
  --template showcase \
  --skin look.copper \
  --seed 7 \
  --max-moves 8 \
  --out-dir /tmp/placement-produce

node dist-cli/cli/bcs.js render \
  --out-dir /tmp/placement-produce \
  --quality preview \
  --max-frames 8
```

`--max-frames 8` 只输出短预览，不是完整交付；需要完整视频时移除此参数。示例路径适用于 macOS/Linux，Windows 请替换为本机可写目录。

`look.copper` 是文档渲染路径中的铜金属参数外观，不等于 plan-bound PBR 贴图。贴图变体请走 [bcs-placement-variant](skills/bcs-placement-variant/SKILL.md) 的独立校验与编译路径。

## 运行与质量边界

| 容易混淆的点 | 实际含义 |
|---|---|
| 外部 Agent 与 `agent run` | 前者编排任务；后者调用注册的机器试玩适配器，不启动内置 LLM |
| GitHub Pages 与 CLI | Pages 只部署前端；CLI 在本地或具备条件的 Node 环境运行 |
| `document compile` 与视频 | 编译演出不生成像素，不等于 MP4 已完成 |
| `render` 与 Chrome | CLI 调度 Chrome / WebCodecs 实际出片；缺少 Chrome 返回 `CHROME_NOT_FOUND` |
| `ok`、`rendered` 与视觉批准 | 命令成功、视频编码完成、人工视觉批准是不同结论；回放校验通过也不保证通关 |
| 资产库与专业工具 | 已有本地资产存储与导入边界；中央元素库、通用 AE/Blender/Audio 闭环不是全量已交付能力 |

当前导出链尚未集成音频、BGM 和旁白。公共 Fixture 与自动检查用于工程回归，商业参考 Golden 因源素材未公开而受限；人工视觉批准仍需按片单执行。

## 深入了解

| 文档 | 适合阅读的内容 |
|---|---|
| [Agent 制作指南](docs/product/AGENT_WORKFLOWS.md) | 原子能力、六类 Skill、复用与补跑、结果解释 |
| [CLI 手册](docs/cli/README.md) | 命令、参数、输入输出与错误处理 |
| [Skills 索引](skills/README.md) / [Agent 入口](skills/bcs/SKILL.md) | 如何选择或改写配方 |
| [架构说明](docs/ARCHITECTURE.md) | 玩法、演出、像素三层真值与多游戏边界 |
| [工程说明](docs/ENGINEERING.md) | 实现细节、资产变体、校验与参考审计 |
| [本机评审与反馈](docs/LOCAL_REVIEW_AND_FEEDBACK.md) | 统一片单与人工视觉评审 |
| [资产导入边界](docs/architecture/ASSET_IMPORT_PIPELINE_V1.md) | Source、交换产物、Runtime Pack 的职责 |
| [产品图与可编辑源文件](docs/images/product/README.md) | 三张 SVG、DrawIO 源文件与图示维护说明 |

### 开发校验

```bash
npm run check
npm test
npm run typecheck
npm run build
npm run test:browser-e2e
npm run capture:review
```

玩法核心、导演、资产与渲染边界由测试和 Architecture Guard 保护。新增游戏使用 Game Package，不要求所有玩法共享同一种棋盘或 Action。开发约定见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可与内容边界

代码采用 [MIT License](LICENSE)。第三方声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。商业参考视频和截图不提交到公共仓库；规则推断、工程验证和商业视觉批准应分别标明，不把推测写成已验证事实。
