---
name: bcs-capabilities
description: 列出 Block Creative Studio CLI 的 capabilities、schema 与已注册 Agent。在开始组合其他 BCS skill 之前调用。
---

# 发现 BCS CLI 能力

```bash
node dist-cli/cli/bcs.js capabilities
node dist-cli/cli/bcs.js schema list
node dist-cli/cli/bcs.js agent list
```

`capabilities.commands` 是当前二进制承认的命令清单。`agent list` 返回 `{ gameId, profiles }[]`。没有出现的 `gameId` 不要调用 `bcs-agent-run`。
