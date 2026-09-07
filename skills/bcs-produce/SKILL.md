---
name: bcs-produce
description: 从出题到工程文档的一键流水线：scaffold → skin → agent take → validate → document → compile frames。用于让 Agent 自主创作到可出片交接；Node CLI 仍不编码 MP4。
---

# 自主创作流水线

```bash
node dist-cli/cli/bcs.js produce \
  --game <gameId> \
  [--template <id>] \
  [--skin <id>] \
  [--seed <int>] \
  [--profile <id>] \
  [--max-moves <int>] \
  [--beam-width <int>] \
  [--max-expanded-states <int>] \
  --out-dir <dir>
```

`--out-dir` 会写入：

- `config.json` 出题配置
- `take.json` 机器试玩信封
- `document.json` Studio V2 工程
- `frames.json` presentation 源（非像素）
- `render-request.json` 交给 Chrome/Studio 的出片请求

`ok` 表示 Take 能被官方 runtime 重放。`rendered` 永远是 `false`。要成片：打开 Studio 导入 `document.json` 导出，或跑 `npm run capture:review`。
