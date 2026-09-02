# TapTile 7 槽三消导演台实施状态

> 分支：`feature/taptile-tray-match3-director-v1`  
> 基线：`c1c455800a627b1b1a835fdf4a772e30a068e088`  
> 开始日期：2026-09-02（Asia/Shanghai）

## 基线记录

- 工作区在实施前为干净状态；没有用户未提交改动需要覆盖或迁移。
- 本机 PATH 未提供 `node` / `npm`。验证使用 Codex 工作区运行时 Node `v24.19.0` 与 pnpm `11.19.0`；安装结果为 already up to date。
- `check-source` 与 `check-core` 通过。
- Vitest：9 个测试文件、49 项测试全部通过。
- TypeScript 类型检查通过。
- Vite 构建通过；保留原有单个大于 500 kB 的主包警告。
- 原始 CDP 冒烟脚本在“框选后批量删除”步骤失败：牌数 `14 -> 14`。该失败发生在任何产品代码改动前，列为基线问题。
- 基线截图：`artifacts/design-qa/taptile/m0-baseline-hourglass.png`（截图目录由仓库忽略，不进入提交）。

## 状态表

| Milestone | 状态 | Commit | 自动测试 | 浏览器验证 | 主要遗留 |
|---|---|---|---|---|---|
| M0 基线与文档 | complete | 本状态文档首次提交 | 49/49；check/type/build 通过 | 基线截图完成；原冒烟脚本有已记录失败 | npm 不在 PATH；使用等价运行时 |
| M1 Schema V2 | complete | 本阶段提交 | 55/55；check/type/build 通过 | 编辑器已接 V2；完整闭环归 Gate A | IndexedDB 资产上传留到资产阶段 |
| M2 Level Compiler | complete | 本阶段提交 | 旋转几何、覆盖、hash 与验证测试通过 | 调试 UI 将随 Gate A 验证 | 阈值为显式工程默认值，不声称为官方公式 |
| M3 7 槽引擎 | complete | 本阶段提交 | 7 槽顺序、拒绝、解锁、6/7、胜负与 100 次确定性通过 | 浏览器交互归 Gate A | 旧多模式研究代码仅保留在 experimental |
| M4 Play + Take | complete | 本阶段提交 | 13 个测试文件、58/58；check/type/build 通过 | 试玩与回放闭环通过 | 编辑态布局变更在试玩中锁定 |
| Gate A | complete | 随 M4 | 13 个测试文件、58/58；check/type/build 通过 | 48 张初始牌；修正遮挡边 `91→90`；6 次动作完成 2 组三消并解锁 4 张；Replay `6/6`；终态 `state-c91f0b62`；控制台 0 错误 | 截图与示例已固化 |
| M5 Solver | complete | 本阶段提交 | 14 个测试文件、64/64；小关卡、正式沙漏、同 Seed、danger-rescue、intentional-fail、证据边界通过 | 48 步 `safe-win` Agent Take 胜利并确定性回放；终态 `state-8ba1e269`；控制台 0 错误 | Beam Search 的 `not-found` 不宣称数学无解 |
| M6 SkinPack | complete | 本阶段提交 | 15 个测试文件、71/71；两套完整覆盖、三类 FaceAssembly、Asset/Stage Registry、兼容错误、role 一致和视觉边界不变量通过 | animals/food 均显示 16 个匹配组完整覆盖 | IndexedDB 上传保留为后续资产入口；项目不持久化 blob URL |
| Gate B | complete | 随 M6 | 15 个测试文件、71/71；两套 Skin 的 Transition/State/Hash 全等测试通过 | 同一 48 步 Take 比较 49 个状态；`level-ec5f06bd` 与 `state-8ba1e269` 不变；视觉身份改变；board/tray 身份一致；控制台 0 错误 | flight/match-ghost 由同一 resolver 覆盖并有角色不变量测试，实际动画随导演阶段呈现 |
| M7 Director | in progress |  |  |  |  |
| Gate C | pending |  |  |  |  |
| M8 Canvas + MP4 | pending |  |  |  |  |
| M9 Audio/Batch | pending |  |  |  |  |
| Gate D | pending |  |  |  |  |

## 决策账本

- 正式运行链只接受 `taptile-tray-match3-v1`；已有多模式研究实现仅在兼容/实验边界保留。
- 1080×1920 整数输出像素是玩法几何真值；432×768 只用于编辑显示。
- `editorLocked` 只影响编辑器，不进入可点击判定。
- `levelHash` 排除主题、牌面、牌体、背景、导演与音频字段。
- 未经浏览器和固定帧实测的能力不会在本表中标为 Gate 完成。

## Gate A 证据

- `artifacts/design-qa/taptile/gate-a-blocker-validation.png`
- `artifacts/design-qa/taptile/gate-a-play-two-matches.png`
- `artifacts/design-qa/taptile/gate-a-deterministic-replay.png`
- `examples/taptile-gate-a-project.json`
- `examples/taptile-gate-a-take.json`

## M5 证据

- `artifacts/design-qa/taptile/m5-agent-safe-win-replay.png`
- 浏览器结果：48 个动作、全部 actor=`agent`、结果 `won`、Replay valid、控制台 0 错误。
- `danger-rescue` 固定关卡会先触发一次 `tray.warning`，随后以三消降回 6 槽以下并最终通关。

## Gate B 证据

- `artifacts/design-qa/taptile/gate-b-animals-v1-replay.png`
- `artifacts/design-qa/taptile/gate-b-food-v1-replay.png`
- 同一 Take 的 49 个状态哈希、棋盘 ID 和槽位 ID 逐步相同；两套主题的视觉身份不同。
- `animals-v1` 与 `food-v1` 均严格覆盖全部 16 个 archetype，缺绑定时明确报错且不会静默回退。
