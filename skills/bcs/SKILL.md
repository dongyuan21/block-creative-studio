---
name: bcs
description: Block Creative Studio 的 Agent 组合入口。当需要通过 CLI 操作本仓库的玩法 Take、资产校验或变体编译时使用；先发现能力，再按 gameId 组合 skill。
---

# BCS Agent 组合入口

本仓库是 **Agent-operable**，不是内嵌 LLM。GitHub Pages 只部署前端 Studio；`bcs` CLI 需要本地或后续后端的 Node 运行时。

## 组合顺序

1. 用 `bcs-capabilities` 确认当前二进制支持的命令。
2. 用 `bcs-agent-run` 按 `gameId` 生成 `GameReplayEnvelope`。
3. 用 `bcs-take-validate` 做确定性回放校验（与生成时同一份 `--config`）。
4. 需要出片时再组合 `bcs-asset-validate` → `bcs-variant-compile` → `bcs-quality-check`。

不要跳过校验直接把 Take 交给渲染。CLI 永远 `rendered: false`。

## 三个可调度 gameId

- `block-placement`
- `taptile-tray-match3`
- `block-crush-drop`

构建：`npm run build:cli`。可执行文件：`dist-cli/cli/bcs.js`。

输出一律 JSON（stdout）；错误在 stderr，带稳定 `code`。
