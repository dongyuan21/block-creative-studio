---
name: bcs
description: Block Creative Studio 的 Agent 组合入口。从出题、换皮、机器试玩到工程文档都可以用 CLI skill 组合；GitHub Pages 不出片。
---

# BCS Agent 组合入口

本仓库是 **Agent-operable**，不是内嵌 LLM。GitHub Pages 只部署前端 Studio；`bcs` CLI 需要本地或后续后端的 Node 运行时。

## 从出题到出片交接

1. `bcs-capabilities` / `bcs-project-scaffold` 的 catalog：看清模板和皮肤
2. `bcs-project-scaffold`：出题，得到官方 config
3. `bcs-skin-apply`：替换局内主题/皮肤/Look（不是 Studio 外壳）
4. `bcs-agent-run` → `bcs-take-validate`：机器试玩并校验
5. `bcs-document-emit`：收成 Studio V2 工程并编译 frame source
6. 或者一步 `bcs-produce` 跑完 2–5
7. 像素和 MP4 仍走 Studio 导出或 `npm run capture:review`（CLI 不设 `rendered: true`）
8. Placement 换 look / 材质时再接 `bcs-asset-validate` → `bcs-variant-compile` → `bcs-quality-check`

## 三个可调度 gameId

- `block-placement`
- `taptile-tray-match3`
- `block-crush-drop`

构建：`npm run build:cli`。可执行文件：`dist-cli/cli/bcs.js`。输出一律 JSON。
