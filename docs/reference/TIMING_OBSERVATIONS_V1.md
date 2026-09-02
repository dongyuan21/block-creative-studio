# 时间与状态观察 v1

> 时间均来自单条 59.98/60 fps 屏幕录像，属于观察窗口，不是原始工程关键帧。实现时应把它们做成可调导演参数，而不是写死成不可变常数。

## 代表性窗口

| 约时间 | 观察到的状态 | 用途 |
|---:|---|---|
| 0–6 s | 空/稀疏棋盘，连续拾取与放置，顶部得分逐格增长 | 标定候选块尺度、拾取放大、拖拽上移和基础计分 |
| 7–13 s | 第一次明显完整行/列清除，出现 `Great!`、逐格拇指/数字与星屑 | 标定清除阶段序列 |
| 24–27 s | 边框发光、悬浮总分与 `Combo 4` | 标定 Combo 与余辉延迟 |
| 34–37 s | 全屏气氛增强，`Unbelievable! +300` | 标定最高等级评价词 |
| 74–76 s | 大面积清除并清空棋盘，评价词在空棋盘上继续存在 | 验证玩法状态与 VFX 状态解耦 |
| 94–96 s | `Combo 4` 与大光圈/边框辉光 | 标定屏幕空间反馈 |
| 154–156 s | `Nice!` + 多个 `5` 逐格反馈 | 标定低等级评价词与逐格数字 |
| 169–171 s | `Great!` 与 `Fantastic!` 在相邻阶段出现 | 验证多反馈可叠加/接力 |
| 184–186 s | 纵向扫光与 `Combo 6` | 标定纵向清除方向 |
| 204–206 s | `Nice!` 与 `Combo 2` 同屏 | 验证评价词和 Combo 是独立原子 |
| 214–216 s | 高亮清除伴随大型黄色心形/认可反馈 | 标定高强度次级反馈 |
| 225.7 s | 暗化、`Combo 14`、继续卡片 | 标定终局状态 |

## 导演层应暴露的参数

```text
pickupDelayFrames
pickupScaleFrames
pickupLiftPx
humanDragTimeWarp
releaseSnapFrames
placementScoreStepFrames
placementFeedbackHoldFrames
preClearHoldFrames
clearSweepFrames
cellGlyphStaggerFrames
cellDissolveFrames
praiseDelayFrames
comboDelayFrames
boardGlowDecayFrames
nextInputUnlockFrame
trayRefreshFrames
```

关键点是 `nextInputUnlockFrame` 不应默认等于所有 VFX 的结束帧。逻辑可以解锁，视觉仍继续衰减。
