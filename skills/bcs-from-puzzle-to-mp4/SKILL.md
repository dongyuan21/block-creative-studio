---
name: bcs-from-puzzle-to-mp4
description: 用原子 CLI 从出题拼到 Chrome 出片。默认官方配方；要改步骤就改这份 Skill。多套皮用 bcs-remix-looks，不要给 produce 加矩阵参数。
---

# 从出题到出片（原子组合）

`bcs produce` 可以一步跑完同一条路径，但它是便捷 CLI。官方可编辑配方是下面这些原子命令。复制本 Skill 即可改顺序、跳过出片、或插入人工审题。

## 1. 出题

```bash
node dist-cli/cli/bcs.js project scaffold \
  --game <gameId> \
  --template <id> \
  --skin <id> \
  --seed <int> \
  --out /tmp/bcs/job/config.json
```

`gameId`：`block-placement` | `taptile-tray-match3` | `block-crush-drop`。皮肤/模板用 `authoring catalog`。

## 2. 机器试玩并校验

```bash
node dist-cli/cli/bcs.js agent run \
  --game <gameId> \
  --config /tmp/bcs/job/config.json \
  --seed <int> \
  --max-moves 8 \
  --out /tmp/bcs/job/take.json
node dist-cli/cli/bcs.js take validate \
  --take /tmp/bcs/job/take.json \
  --game <gameId> \
  --config /tmp/bcs/job/config.json
```

TapTile 另加 `--profile safe-win --beam-width 40 --max-expanded-states 4000`。`ok` 只表示能重放，不表示通关，也不表示已出片。

## 3. 收成工程

```bash
node dist-cli/cli/bcs.js document emit \
  --game <gameId> \
  --config /tmp/bcs/job/config.json \
  --take /tmp/bcs/job/take.json \
  --skin <id> \
  --out /tmp/bcs/job/document.json
node dist-cli/cli/bcs.js document compile \
  --document /tmp/bcs/job/document.json \
  --out /tmp/bcs/job/frames.json
```

`document compile` 只有 frame source，没有像素。

## 4. 出片（可选）

```bash
node dist-cli/cli/bcs.js render \
  --out-dir /tmp/bcs/job \
  --document /tmp/bcs/job/document.json \
  --quality preview
```

没有 Chrome：`code: CHROME_NOT_FOUND`，`rendered` 仍为 false。稍后用 `bcs-resume-render`。不要用 Node 假装已出片。

同一盘玩法要换多套皮：不要重跑 Agent，转 `bcs-remix-looks`。
