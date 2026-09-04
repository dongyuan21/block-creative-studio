# 多游戏重构连续执行协议 v1

- 状态：Ready for implementation
- 适用方案：`MULTI_GAME_REFACTOR_EXECUTION_PLAN_V1.md`
- 代码起点：`cursor/next-phase-t0-t5-5d9d@526aee6c6a1ab01c005f868f555cafa81b6bbdd9`
- 执行模式：单 Agent 连续完成，阶段内自检，最终统一 Review

## 1. 核心指令

实现 Agent 必须连续执行重构方案中的 R0、R1、R2、R3、R4、R5、R6、R7、R8 和 R8b。

R0、R1 等编号是内部工程检查点，不是等待用户或 GPT Review 的暂停点。完成某阶段后，Agent 应当：

1. 运行该阶段规定的测试、类型检查、构建和必要 Capture；
2. 修复发现的问题；
3. 形成一个原子提交；
4. 更新执行日志和剩余风险；
5. 立即进入下一阶段。

除非遇到本文定义的硬阻塞，不得在 R0、R1 或任意中间阶段停止并要求人工确认。

## 2. 分支与提交策略

从固定 SHA 创建连续执行分支：

```bash
git fetch origin
git switch --detach 526aee6c6a1ab01c005f868f555cafa81b6bbdd9
git switch -c refactor/multi-game-platform-r0-r8
```

不要继续提交到 `cursor/next-phase-t0-t5-5d9d`，该分支继续承担 PR #1 的证据和 Review 身份。

推荐在同一执行分支上形成阶段提交：

```text
R0  chore(architecture): freeze baseline and add dependency guards
R1  refactor(game): register Block Placement legacy runtime
R2  refactor(project): add project and replay envelopes with v1 migration
R3  refactor(presentation): add presentation packet and compiled frame source
R4  refactor(headless): add game render contract and compiler v2
R5  refactor(composition): profile coordinate shot and calibration data
R6  refactor(render): decouple backend registry exporter and capture
R7  refactor(assets): resolve runtime assets by semantic slot
R8  refactor(studio): split studio shell from Block Placement workspace
R8b refactor(layout): move Block Placement implementation behind stable exports
```

可以为每个阶段建立临时分支或 Stacked PR，但不得等待 Review 才继续。最终交付时统一提供完整提交序列和最终 PR。

## 3. 连续执行原则

### 3.1 普通失败不构成暂停理由

以下情况应由 Agent 自行定位、修复并继续：

- TypeScript 类型错误；
- 单元测试失败；
- Import 路径错误；
- Schema 不一致；
- V1/V2 Adapter 差异；
- Capture Fixture 身份变化；
- Plan Hash 意外变化；
- Lint、构建或 CI 失败；
- 文件移动后的循环依赖；
- 新接口命名需要小幅调整；
- 阶段实现比计划多或少几个文件。

不得仅因为实现量大、测试失败或需要重构既有代码而停止请求 Review。

### 3.2 代码快速变化时的处理

每个阶段开始前执行：

```bash
git fetch origin
git status --short
git log --oneline --decorate -n 12
```

若上游出现新提交：

1. 先判断是否触及当前阶段所有权；
2. 保留其他开发者修改；
3. 通过 rebase、cherry-pick 或局部适配吸收；
4. 在执行日志记录基线变化；
5. 继续后续阶段。

普通上游变化不是停止理由。禁止通过覆盖或回退他人提交来简化重构。

## 4. 硬阻塞定义

只有以下情况可以中止受影响的工作流：

- 所需代码或依赖仓库不可访问，且没有本地/现有实现可替代；
- 必需私有素材、密钥或权限缺失，导致相关验收无法执行；
- 上游存在无法自动解决的语义冲突，任一选择都会造成不可逆数据或历史破坏；
- 基线仓库自身无法安装、编译或运行，且已证明不是本次改动引入；
- 方案中两项强制不变量在当前代码事实下互相矛盾，无法同时满足。

即使出现硬阻塞，Agent 也应：

1. 隔离受影响阶段；
2. 完成所有不依赖该阻塞的后续工作；
3. 提供最小复现、证据和建议修复；
4. 在最终报告中统一说明。

缺少商业 Golden 或人工视觉批准不阻止纯结构重构，但相关状态必须保持 `BLOCKED` 或 `PENDING`，不得伪造 PASS。

## 5. 阶段门禁是自检门禁，不是人工门禁

每个阶段通过后才能进入下一阶段，但“通过”的判定由可重复测试和证据完成，不要求人工聊天确认。

最低执行矩阵：

```bash
npm ci
npm run check
npm test
npm run typecheck
npm run build
```

在触及 Frame、Backend、Composition、Renderer、Material、Capture 或 Exporter 的阶段，还必须按方案运行：

```bash
npm run test:render-regression
npm run test:golden-batch
npm run test:pbr-runtime
npm run test:browser-e2e
npm run capture:review
```

若环境缺少真实 GPU 或商业参考素材，应保留诚实状态，不以 SwiftShader、公共 Fixture 或编译通过替代人工画质批准。

## 6. 不回归基线

连续执行期间必须持续保护：

- 当前 Block Placement 规则结果；
- V1 Project 导入；
- V1 Replay 和完整 State Hash；
- V1 Plan Hash 身份空间；
- `frame-exact` 语义；
- MaterialPack 到 MaterialRuntime 的现有主链；
- Runtime Resource Readiness 和失败门禁；
- Reference 2D 原生捕获；
- Fixed-camera Cinematic 输出；
- 乱序 Seek、重复 Seek 和取消导出；
- 现有公共 Fixture、Still 和 MP4 生成能力。

任一阶段发生行为变化，必须明确属于：

```text
预期迁移
缺陷修复
非预期回归
```

非预期回归必须在进入下一阶段前修复。

## 7. R9 的处理

R9 是延迟收敛阶段，不要求在本轮结构重构中强行完成以下事项：

- 删除所有 V1 Legacy Path；
- Studio 默认改写 V2；
- 删除 `three-3d` Sandbox；
- 完成 Block Crush 商业级画面；
- 完成 Vita Mahjong 规则和渲染。

本轮连续执行至少完成 R0–R8b。R9 只有在 Block Crush Diagnostic Slice 证明 V2 架构可用后才执行。

因此最终状态允许是：

```text
R0–R8b：完成
R9：DEFERRED，满足明确前置条件后执行
```

这不算中途停工，而是遵守方案中对过早删除 Legacy Path 的禁止要求。

## 8. 最终一次性交付

Agent 完成 R0–R8b 后，再统一提交 Review，不在中途逐阶段找用户或 GPT。

最终交付必须包含：

1. 最终分支和 Head SHA；
2. R0–R8b 每阶段提交列表；
3. 变更文件与架构边界摘要；
4. 全部测试、构建和 Capture 结果；
5. V1/V2 等价性证据；
6. 当前 Block Placement 回归结论；
7. Block Crush 接入所需的最小新增文件清单；
8. Vita Mahjong 接入所需的最小新增文件清单；
9. 已知限制、硬阻塞与 `BLOCKED/PENDING` 项；
10. 最终 PR，不要求中间阶段人工批准。

## 9. 可直接交给编码 Agent 的指令

```text
请从 526aee6c6a1ab01c005f868f555cafa81b6bbdd9 创建独立重构分支，严格依据：

1. docs/architecture/MULTI_GAME_FIXED_VIEW_SYSTEM_DESIGN_V2.md
2. docs/plans/MULTI_GAME_REFACTOR_EXECUTION_PLAN_V1.md
3. docs/plans/MULTI_GAME_REFACTOR_CONTINUOUS_EXECUTION_PROTOCOL_V1.md

连续完成 R0–R8b。R0、R1 等是内部提交和自测检查点，不是等待人工 Review 的暂停点。每阶段完成后自行运行测试、修复、提交并立即继续下一阶段。普通类型、测试、构建、Schema、迁移和冲突问题请自行解决，不要中途要求确认。

保留 PR #1 分支的证据身份，不直接在其上提交。不得覆盖他人新改动。不得把契约存在、CI 通过、公共 Fixture 或 SwiftShader 捕获描述成商业视觉批准。

仅在真正硬阻塞时隔离受影响部分，并继续完成其余工作；最后统一报告。R9 需等 Block Crush Diagnostic Slice 验证后再执行，可明确标为 DEFERRED。完成 R0–R8b 后一次性提交最终分支、PR、测试与 Capture 证据供 Review。
```
