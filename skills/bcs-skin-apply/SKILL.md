---
name: bcs-skin-apply
description: 替换游戏内主题/皮肤/Look，不替换 Studio 外壳。用于 TapTile 牌面主题、Crush 木块皮肤、Placement look pack。
---

# 替换游戏内 UI / 皮肤

```bash
node dist-cli/cli/bcs.js skin list [--game <gameId>]
node dist-cli/cli/bcs.js skin apply \
  --game <gameId> \
  --config <config.json> \
  --skin <id> \
  [--out <config.json>]
```

## 能力边界

这是**局内视觉**，不是 Studio 导航壳：

- TapTile：`animals-v1` / `food-v1` / `chain-combo-ui-v1`（`levelHash` 不变）
- Crush Wooood：`golden-embossed` / `classic-maple` / `deep-mahogany` / `checker-maze`（`skinId` 会进状态哈希，换皮后必须重跑 Agent）
- Block Placement：`look.copper`（挂在 document.production.lookPackRef）

换皮后走 `bcs-agent-run` 或 `bcs-produce`。
