# Block Creative Studio

面向 **IAA 方块类试玩广告** 的浏览器创作台：先把玩法拍清楚，再换皮肤、改节奏、导出竖屏成片。

当前版本 `0.3.0-alpha.4`。第一款可制作的游戏是 **Block Placement**（8×8 落子清行列）。**Block Crush** 与 **Vita Mahjong** 在工作台里是 Coming Soon，还不能出片。

```text
编辑牌面 → 真人 / 机器试玩 → 语义 Replay
→ 独立改节奏与 Look → Chrome 逐帧重演 → 1080×1920 无声 MP4
```

玩法结果与演出层分开。同一条 Take 可以换成参考 2D 或固定机位 3D，不必重下。

## 它解决什么

试玩素材通常卡在「玩法、镜头、特效、换皮缠在一起」。这里把它们拆开：

| 层 | 你改什么 | 不应被带跑的东西 |
|---|---|---|
| 规则 | 牌面、候选块、合法落子 | 材质、镜头 |
| Take | 谁在何时落下哪一块 | 渲染后端 |
| 导演 | 拖拽快慢、停顿、清除时长 | 得分与终局 |
| Look | 2D 参考风、3D 材质、背景 | 落子序列 |
| 导出 | 1080×1920、30 fps、无声 H.264 | 工程 JSON |

系统不内置大模型。外部 Agent 或设计师可以提交版本化资产与 Recipe；Studio 负责校验、编译、质量门禁和确定性渲染。

## 现在能看到什么

- **真机参考 2D**：按参考录像拆开的棋盘、候选区、预消除、扫光、评价词。
- **固定机位 3D**：锁定 9:16，不锈钢 / 橡木贴图与参数化 aurora 材质可走浏览器导出。
- **浏览器工作台**：编辑、试玩、回放、导入导出工程码、上传背景/牌面。
- **Headless CLI**：给外部工具编译 Variant 与质量报告；CLI **不会**在 Node 里画出 MP4。

尚未完成、也不应当成已过审：

- 商业参考片的像素级复刻（Golden 仍为 BLOCKED）
- 人工视觉批准（仍为 PENDING）
- 音频、完整 Praise/Combo/High Score 演出
- Block Crush / Vita Mahjong 正式模块

架构上已经可以「第二款游戏只加游戏包，不改平台 Compiler」。那不等于画面已经过关。

## 五分钟启动

需要 **Node.js 22.12+** 和桌面版 **Chrome**（导出走 WebCodecs）。

```bash
git clone https://github.com/dongyuan21/block-creative-studio.git
cd block-creative-studio
npm install
npm run dev
```

打开 [http://127.0.0.1:4173](http://127.0.0.1:4173)。点 **导入项目**，选择：

```text
examples/demo-cross-clear.block-creative.json
```

这是一条带真人动作的「横纵双消」工程。切到 **导演回放**，右侧点 **生成 1080P MP4**。

下一步请严格按 [`docs/LOCAL_REVIEW_AND_FEEDBACK.md`](docs/LOCAL_REVIEW_AND_FEEDBACK.md) 出片并写反馈。那份文档写明了要导出哪几条视频、输入是什么、以及反馈该怎么写，后续迭代才接得上。

## 文档

| 文档 | 用途 |
|---|---|
| [本机出片与反馈](docs/LOCAL_REVIEW_AND_FEEDBACK.md) | **从这里开始做视觉评审** |
| [工程说明](docs/ENGINEERING.md) | 能力清单、CLI、校验命令、代码结构 |
| [多游戏重构交付](docs/reports/MULTI_GAME_REFACTOR_R0_R8B_DELIVERY.md) | R0–R8b 架构范围（不是视觉批准） |
| [CLI](docs/cli/README.md) | `bcs variant compile` / `quality check` |

## 许可与内容边界

本仓库独立实现 8×8 方块放置与行列清除，**不包含**第三方游戏的品牌、原始美术、声音、源代码或内部算法。参考真机录像不会进 Git。
