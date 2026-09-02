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
| M2 Level Compiler | in progress |  |  |  |  |
| M3 7 槽引擎 | in progress |  |  |  |  |
| M4 Play + Take | pending |  |  |  |  |
| Gate A | pending |  |  |  |  |
| M5 Solver | pending |  |  |  |  |
| M6 SkinPack | pending |  |  |  |  |
| Gate B | pending |  |  |  |  |
| M7 Director | pending |  |  |  |  |
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
