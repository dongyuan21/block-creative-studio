---
name: bcs
description: Block Creative Studio 的 Agent 组合入口。从出题、换皮、机器试玩到 Chrome 出片都可以用 CLI skill 组合；GitHub Pages 不出片。
---

# BCS Agent 组合入口

本仓库是 **Agent-operable**，不是内嵌 LLM。GitHub Pages 只部署前端 Studio；`bcs` CLI 需要本地或后续后端的 Node 运行时。

## 从出题到出片

1. `bcs-capabilities`：看清命令、schema 和已注册游戏
2. `bcs-project-scaffold`：出题，得到官方 config
3. `bcs-skin-apply`：替换局内主题/皮肤/Look（不是 Studio 外壳）
4. `bcs-agent-run` → `bcs-take-validate`：机器试玩并校验
5. `bcs-document-emit`：收成 Studio V2 工程并编译 frame source
6. 或者一步 `bcs-produce` 跑完 2–5
7. `bcs-render`：有 Chrome 时把 `render-request.json` 编成 MP4；没有 Chrome 则 `CHROME_NOT_FOUND` 且 `rendered` 保持 false
8. Placement 换 look / 材质时再接 `bcs-asset-validate` → `bcs-variant-compile` → `bcs-quality-check`
9. 需要对照契约、材质运行时、Golden 或旧工程时：`bcs-schema` / `bcs-material-compile` / `bcs-golden-batch` / `bcs-project-migrate`

## 三个可调度 gameId

- `block-placement`
- `taptile-tray-match3`
- `block-crush-drop`

构建：`npm run build:cli`。可执行文件：`dist-cli/cli/bcs.js`。输出一律 JSON。
