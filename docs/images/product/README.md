# BCS 产品图

这组三张图用于 README 与产品介绍，突出人和 Agent 的双入口、CLI 原子能力、可改写 Skill 以及 Take 复用。技术实现细节见 [架构说明](../../ARCHITECTURE.md)，讲述方式见 [Agent 制作指南](../../product/AGENT_WORKFLOWS.md)。

| 图 | README 用途 | 预览 | 可编辑源文件 |
|---|---|---|---|
| 人可创作，Agent 也能直接开工 | 产品首屏：两种入口与主要成果 | [SVG](bcs-agent-product.svg) | [DrawIO](bcs-agent-product.drawio) |
| CLI 是原子能力，Skill 把能力串成任务 | 能力与流程：独立调用、组合、回读结果 | [SVG](bcs-atomic-skills.svg) | [DrawIO](bcs-atomic-skills.drawio) |
| 同一份玩法，不必为每次换皮重做 | 使用场景：同一 Take、多皮、补出片与诊断 | [SVG](bcs-remix-workflow.svg) | [DrawIO](bcs-remix-workflow.drawio) |

## 文件约定

DrawIO 是原生节点、文本和连接线，可在 diagrams.net 中直接打开。文件采用 DrawIO 支持的压缩 XML 页面格式，解压后的图模型与已确认版本一致；不是把 PNG 放进画布。

SVG 是用于 GitHub README 的轻量文本版导出，使用普通矢量形状和可读文本，不含脚本、外部图片、嵌入字体或 `foreignObject`。中文按本机字体回退，字形可能略有差别。明确的白色背景保证浅色、深色 README 环境都能阅读。

只提交这组公开产品图，不包含历史内部汇报包、源 AEP、参考视频、商业素材或字体文件。需要 PNG 时可从 DrawIO 导出，不在仓库重复存放高清位图。

## 更新规则

先核对 CLI 与 Skill，再修改 DrawIO 中的文字和连接关系，最后同步导出同名 SVG。保持 README 图片相对路径稳定；同时修改图名或用途时，同步更新本页及产品指南。

能力有变化时，分别说明“命令已实现”“实际渲染完成”和“人工视觉批准”，不使用一个泛化的 PASS。新游戏、云端 CLI、通用 DCC 交接和中央元素库应按真实状态标注，不从产品愿景推断为可用。

图中源码页脚记录 `3732a80` / 2026-09-07，表示原图依据。此次文档核对基线为 `669df56e379c16050b2c25029dbc3b9250a8e167`，并非新增运行时能力或新的视觉验收记录。
