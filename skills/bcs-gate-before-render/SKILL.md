---
name: bcs-gate-before-render
description: 出片前的校验门。take validate 与 document compile 通过后才调用 bcs-render。ok 不是 rendered；不要用 Node 把 rendered 写成 true。
---

# 先校验，再出片

在 `bcs-render` 之前执行。失败就停，不要「先出片再看报错」。

## 门禁

1. `take validate` 的 `ok` 为 true。看 `validation.issues[].code`（`ILLEGAL_ACTION`、`TAKE_INITIAL_HASH_MISMATCH` 等）。
2. 工程里确实有 Take：`document.json` 的 `takes` 非空。
3. `document compile` 能给出 `totalFrames` 和 `frameSourceHash`。这仍是 `rendered: false`。
4. 只有这时才调用 `bcs-render`。

```bash
node dist-cli/cli/bcs.js take validate \
  --take /tmp/bcs/job/take.json \
  --game <gameId> \
  --config /tmp/bcs/job/config.json
node dist-cli/cli/bcs.js document compile \
  --document /tmp/bcs/job/document.json \
  --out /tmp/bcs/job/frames.json
node dist-cli/cli/bcs.js render \
  --out-dir /tmp/bcs/job \
  --document /tmp/bcs/job/document.json \
  --quality preview
```

## 读字段

| 字段 | 含义 |
|---|---|
| `ok` | 命令/重放是否成立 |
| `rendered` | 是否已经写出 MP4 |
| `status`（agent） | `solved` / `partial` / `empty` / `failed`。Crush 贪心经常是 `partial`，仍可能 `ok` |
| `code: CHROME_NOT_FOUND` | 可恢复；工程留下，转 `bcs-resume-render` |

`ok: true` 且 `rendered: false` 是合法的「题与 Take 已就绪、尚未出片」。不要把它改成已出片。
