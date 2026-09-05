# 多游戏重构执行计划 v2

- 状态：**Ready for implementation**
- 仓库：`dongyuan21/block-creative-studio`
- 审计日期：2026-09-04
- 审计基线：`main@f1c1052226eeaba92aff4cb4727a8fc7ee66ce74`
- 基线 CI：`validate` run `33822279361`，结论 `success`
- 当前版本：`0.3.0-alpha.4`
- 当前自动测试：120 tests（以仓库 `REVIEW.md` 为准）
- 目标游戏：
  - `block-placement`：现有第一款 Block
  - `block-crush-drop`：第二款 Block Crush
  - `vita-mahjong-solitaire`：未来 Vita Mahjong 类麻将消除
- 取代文档：旧的 `MULTI_GAME_REFACTOR_EXECUTION_PLAN_V1.md`

> 本文是一份可直接交给 Codex、Cursor Agent 或人工工程师执行的代码计划。它以当前 `main` 为事实基础，不再依赖已经合入主干的旧 PR 分支，也不重复实现当前已经存在的 Plan Shot、PBR Runtime、Browser Asset Store、Material Behavior Fracture 和 Capture Runner。

---

## 1. 最终产品边界

BCS 的长期定位保持不变：

> **二维消除玩法真值，经过固定摄像机下的空间化、材质化、动力学和特效演出，输出具有三维质感的高质量 IAA 投放视频。**

三类真值必须保持单向依赖：

```text
Gameplay Truth
二维状态、动作、合法性、消除、移动、匹配、胜负
        ↓
Presentation Truth
帧位、事件、导演轨迹、受约束物理、碎片、反馈
        ↓
Pixel Truth
Canvas / WebGL / Shader / Sprite / Mesh / 后处理 / 编码
```

禁止 Renderer、Three.js、Canvas、实时物理或 React UI 反向决定 Gameplay Truth。

---

## 2. 相比旧计划的关键更新

当前 `main` 已经比旧计划基线继续前进，因此执行顺序必须调整。

### 2.1 不再等待或依赖旧 PR

旧计划要求从 `526aee6` 建立 Stacked PR。该要求已经失效：相关实现以及后续 Plan Shot、逐格 UV、材质行为破碎修复已经进入 `main`。

现在所有重构分支直接从当前 `main` 创建：

```bash
git fetch origin
git switch main
git pull --ff-only
BASE_SHA=$(git rev-parse HEAD)
printf 'base=%s\n' "$BASE_SHA"
```

本计划审计时的准确起点是：

```text
f1c1052226eeaba92aff4cb4727a8fc7ee66ce74
```

若正式开工时 `main` 已再次变化，必须先执行：

```bash
git log --oneline f1c1052..origin/main
git diff --stat f1c1052..origin/main
```

确认没有改变本文列出的核心边界，再继续。

### 2.2 Plan Shot 已经存在，下一步是收敛而不是重做

当前已有：

```text
ResolvedRenderPlan
→ planShotAdapter
→ StyleSpec.shotExecution
→ StudioScene
```

并且 Plan 已经能够驱动：

- `designResolution`；
- `boardScreenRect`；
- `maximumScreenZoom`；
- 构图宽高比和 Viewport；
- Pick / Pointer 的构图坐标映射。

仍未完成的是：

- Camera Pose 和 FOV 仍依赖 `FIXED_SHOT_PROFILE`；
- `boardScreenRect` 仍是 Block 专属术语；
- `ShotExecution` 被放在 `domain/types.ts` 和 `StyleSpec` 中；
- Camera、Layout、Composition、Shot 的职责仍混合。

因此不得再新建第二套 Shot 编译器。应先把现有实现提取成正式的 `ResolvedRenderExecution`，再 Profile 化。

### 2.3 材质行为破碎已经接线，下一步是移出 Style 桥

当前已有：

```text
MaterialPackManifest.behavior
→ StyleSpec.materialBehavior
→ materialFracture.ts
→ StudioScene kinematic shards / particles
```

这已经能让 wood、metal、glass、jelly 产生不同的碎片比例、形状、阻力和重力参数，但仍不是刚体求解，也不是通用多游戏 Effect Runtime。

后续不得重造 `MaterializationPack`。应继续沿用：

```text
MaterialPackManifest
→ MaterialRuntimeDescriptor
→ RuntimeTextureSet
→ pbrMaterialFactory
```

并将：

```text
MaterialRuntimeDescriptor + MaterialBehaviorProfile
```

组合成正式的 `ResolvedMaterialExecution`。

### 2.4 Runtime Asset 收集已支持嵌套 PBR 贴图

当前 `collectRuntimeAssetRequests()` 已经：

- 遍历 Plan 直接槽位；
- 遍历完整依赖闭包；
- 识别 MaterialPack 内部 `textureRefs`；
- 对 Texture Map 去重；
- 将 `bcs-asset://` 内容绑定到 Browser Asset Store Object URL。

因此后续只需要增加通用 `bySlot / byRole` 索引和查询 API，不得另写第二套依赖遍历器。

### 2.5 当前正式阻塞点已经转移

现阶段真正阻碍多游戏的内容是：

- `ProjectSpec` 只允许 `block-placement-classic-v1`；
- `GameSnapshot / PlacementAction / PresentationFrame` 是 Block 专属；
- `App.tsx`、`useStudioModel.ts`、Exporter、Capture 直接依赖 Block 类型；
- `REQUIRED_LOOK_SLOTS`、`CinematicEventType`、`ReferencePassId` 是 Block 语义；
- 全局设计分辨率、Board Rect、Calibration ROI 和 Shot 单例仍是第一游戏数据；
- `StudioScene` 与 `Reference2DScene` 都是第一游戏的具体 Backend；
- `StyleSpec` 同时承担创作参数、兼容桥和执行期数据，职责过重。

---

## 3. 当前代码归属

### 3.1 继续作为平台公共能力演进

以下代码应保留并增量扩展，不得推倒重写：

```text
src/headless/assetRegistry.ts
src/headless/variantCompiler.ts
src/headless/qualityGate.ts
src/headless/stableHash.ts
src/headless/frameRequest.ts
src/headless/calibration.ts
src/headless/materialRuntime.ts
src/assets/browserAssetStore.ts
src/assets/runtimeAssetBindings.ts
src/renderer/runtimeTextures.ts
src/renderer/pbrMaterialFactory.ts
src/renderer/materialRuntimeLoadGate.ts
src/capture/browserCaptureApp.ts 中的通用 Capture Runner 思路
src/exporter/offlineVideoExporter.ts 中的 WebCodecs / Mediabunny 编码循环
```

### 3.2 明确属于第一款 Block Placement

以下实现不能继续伪装为全局通用模块：

```text
src/domain/gameEngine.ts
src/domain/boardPresets.ts
src/domain/shapes.ts
src/domain/publicFixtures.ts
src/domain/types.ts 中的玩法类型
src/director/presentationCompiler.ts
src/director/rhythmPresets.ts
src/director/botDirector.ts
src/reference2d/Reference2DScene.ts
src/reference2d/Reference2DViewport.tsx
src/reference2d/referenceProfile.ts
src/reference2d/passes.ts
src/renderer/StudioScene.ts
src/renderer/ThreeViewport.tsx
src/renderer/materialFracture.ts 中的 Block Clear 适配部分
src/renderer/stylePresets.ts 中的 Block Style
src/renderer/shotProfile.ts 中的 FIXED_SHOT_PROFILE 实例
src/capture/capturePlan.ts
```

`StudioScene` 内部仍写死：

```text
BOARD_SIZE = 8
Rack / Piece / Polyomino
Line Clear / Cross Clear
Block HUD
Block Picking
Block Shard Burst
```

目标不是把它改成万能 Scene，而是最终把它明确归位为：

```text
BlockPlacementCinematicBackend
```

### 3.3 过渡耦合区

以下文件是重构的主要落点：

```text
src/App.tsx
src/state/useStudioModel.ts
src/state/useVariantWorkspace.ts
src/integration/studioAssetCatalog.ts
src/integration/studioVariantBridge.ts
src/exporter/offlineVideoExporter.ts
src/capture/browserCaptureApp.ts
src/headless/contracts.ts
src/headless/variantCompiler.ts
src/headless/qualityGate.ts
src/headless/coordinateMapping.ts
src/headless/calibration.ts
src/assets/runtimeAssetBindings.ts
schemas/block-creative-project.schema.json
schemas/fixed-camera-profile.schema.json
```

---

## 4. 不变量与非目标

### 4.1 必须保持的不变量

整个重构期间必须保持：

- Block Placement 合法落子结果不变；
- 同时清行/列结果不变；
- 候选刷新、分数、Combo、Game Over 不变；
- V1 Project 和 Take 仍可读取；
- `frame-exact` Variant 的 FPS、总帧数和动作帧位不变；
- 当前 PBR Map、色彩空间、Normal Y、UV、Hash 和加载门禁不变；
- Plan 驱动 Shot 的当前行为不变；
- Material Behavior 驱动碎片的当前行为不变；
- Reference 2D 原生 1064×1788 捕获不变；
- Fixed-camera 1080×1920 导出路径不变；
- Browser Asset Store 与 Plan 依赖闭包不变；
- 资源未准备完成时正式导出继续被阻止。

### 4.2 本轮重构不做

- 不实现完整 Block Crush；
- 不实现完整 Vita Mahjong；
- 不引入自由刚体物理引擎；
- 不改材质艺术参数；
- 不调整 Clear FX 强度；
- 不重新设计 HUD；
- 不把 Canvas2D 和 Three.js 强行合成一个 Scene 类；
- 不切换 React 状态库；
- 不改成 monorepo；
- 不执行任意外部插件代码；
- 不删除 `reference-2d` Backend；
- 不立即删除 `three-3d` Legacy Backend；
- 不在第二款游戏证明 V2 之前删除 V1 格式与 Legacy Adapter。

---

## 5. 目标依赖方向

```text
src/game-runtime
  纯合同、Registry、Envelope、Frame Source
  不依赖 React / Three / Canvas / 具体游戏

src/headless
  Asset / Variant / Execution / Quality / Resource Contract
  不依赖 React / Scene / 具体游戏

src/games/<game-id>
  依赖 game-runtime、headless 和共享渲染原语
  不依赖其他游戏

src/exporter
  只依赖 FrameSource、Backend Registry、Execution、Resource Accessor
  不直接依赖具体游戏或具体 Scene

src/capture
  只依赖 Capture Suite、FrameSource、Backend Registry
  游戏 Fixture 由 game package 提供

src/studio
  公共 Shell 和会话编排
  游戏 UI 通过 GameStudioContribution 注入
```

最终禁止：

```text
headless → games
headless → React / Three / Canvas
exporter → domain/gameEngine
exporter → director/presentationCompiler
exporter → Reference2DScene / StudioScene
App / StudioShell → GridCell / PieceInstance / BoardState
games/A → games/B
```

---

## 6. 核心合同草案

这些接口是方向约束；实现者可以调整字段名，但不能改变职责边界。

### 6.1 Game Definition 与 Runtime

```ts
export interface RuntimeSchema<T> {
  id: string;
  version: string;
  parse(value: unknown): T;
  serialize(value: T): unknown;
}

export interface GameRuntime<Config, State, Action, Resolution> {
  createInitialState(config: Config, seed: number): State;
  hashState(state: State): string;
  listLegalActions?(state: State): Action[];
  resolve(
    state: State,
    action: Action,
    context: { seed: number; stepIndex: number },
  ): Resolution;
  stateAfter(resolution: Resolution): State;
}

export interface GameDefinition<Config, State, Action, Resolution> {
  manifest: {
    gameId: string;
    moduleVersion: string;
    displayName: string;
    topology: 'grid-2d' | 'layered-planar' | 'planar-graph';
  };
  schemas: {
    config: RuntimeSchema<Config>;
    state: RuntimeSchema<State>;
    action: RuntimeSchema<Action>;
  };
  runtime: GameRuntime<Config, State, Action, Resolution>;
  presentation: GamePresentationCompiler;
  renderContract: GameRenderContract;
  profiles: GameProfileCatalog;
  capture?: GameCaptureSuite;
  studio?: GameStudioContribution;
}
```

Registry 边界允许类型擦除，但每一个 `unknown` 都必须通过对应 Schema 解析后才能进入 Runtime。

### 6.2 Project / Replay Envelope

```ts
export interface GameProjectEnvelopeV2 {
  format: 'bcs-project';
  version: '2.0.0';
  id: string;
  name: string;
  game: {
    gameId: string;
    moduleVersion: string;
    rulesetId: string;
    rulesetVersion: string;
    configSchemaId: string;
    config: unknown;
    stateSchemaId: string;
    initialState: unknown;
    initialStateHash: string;
  };
  production: {
    layoutProfileRef: AssetRef;
    cameraProfileRef: AssetRef;
    lookPackRef: AssetRef;
    output: OutputSpec;
  };
  takes: GameReplayEnvelopeV2[];
}

export interface GameReplayEnvelopeV2 {
  id: string;
  gameId: string;
  moduleVersion: string;
  actionSchemaId: string;
  initialStateHash: string;
  seed: number;
  actions: Array<{
    id: string;
    actor: 'human' | 'agent';
    action: unknown;
  }>;
  interactions: Array<{
    id: string;
    committedActionId?: string;
    type: string;
    durationFrames?: number;
    pointerPath?: Array<{ frameOffset: number; x: number; y: number }>;
    payload?: unknown;
  }>;
}
```

V1 `PlacementAction` 迁移时：

```text
actor + pieceId + anchor
→ Semantic Action

durationFrames + pointerPath
→ Interaction Record
```

### 6.3 Presentation Packet 与 Frame Source

```ts
export interface PresentationPacket {
  contract: 'bcs.presentation-packet';
  version: '1.0.0';
  gameId: string;
  takeId: string;
  frameIndex: number;
  fps: number;
  totalFrames: number;
  stateHash: string;
  presentationHash: string;
  activeEvents: SemanticEventEnvelope[];
  payloadSchemaId: string;
  payload: unknown;
}

export interface CompiledFrameSource {
  readonly gameId: string;
  readonly takeId: string;
  readonly fps: number;
  readonly totalFrames: number;
  frameAt(frameIndex: number): PresentationPacket;
  dispose?(): void;
}
```

第一阶段 Block Adapter 的 `payload` 继续使用现有 `PresentationFrame`，不需要立即重写其结构。

### 6.4 Resolved Render Execution

当前 Plan 数据通过 `StyleSpec` 间接进入 Renderer。目标是增加正式执行对象：

```ts
export interface ResolvedMaterialExecution {
  descriptor: MaterialRuntimeDescriptor;
  behavior: MaterialBehaviorProfile;
  sourceAssetId: string;
  sourceAssetVersion: string;
}

export interface ResolvedShotExecution {
  compositionProfileId: string;
  layoutProfileId: string;
  cameraProfileId: string;
  designResolution: { width: number; height: number };
  regions: Record<string, ScreenRect>;
  camera: ResolvedCamera;
  feedbackPolicy: ResolvedCameraFeedbackPolicy;
  provenance: Record<string, 'plan' | 'legacy-fallback'>;
}

export interface ResolvedRenderExecution {
  contract: 'bcs.render-execution';
  version: '1.0.0';
  gameId: string;
  backendId: string;
  planId: string;
  planHash: string;
  shot: ResolvedShotExecution;
  material?: ResolvedMaterialExecution;
  slots: Record<string, ResolvedAsset>;
  diagnosticView: string;
  enabledPasses: string[];
}
```

当前 `StyleSpec` 暂时通过：

```text
BlockPlacementLegacyStyleAdapter
```

由 `ResolvedRenderExecution` 派生，直到 Block Scene 迁移完毕。

### 6.5 Game Render Contract

```ts
export interface GameRenderContract {
  id: string;
  version: string;
  gameId: string;
  backends: string[];
  slots: Array<{
    id: string;
    requiredByBackend: Record<string, boolean>;
    allowedKinds: AssetKind[];
  }>;
  events: Array<{
    id: string;
    category: string;
    tags: string[];
  }>;
  passes: Record<string, Array<{
    id: string;
    order: number;
    required: boolean;
  }>>;
  diagnostics: Record<string, string[]>;
}
```

Block、Crush、Mahjong 各自声明 Slot / Event / Pass，而不是由 Headless Core 写死。

### 6.6 Backend 与 Video Job

```ts
export interface RenderBackend {
  readonly backendId: string;
  resize(width: number, height: number, pixelRatio?: number): void;
  prepare(
    execution: ResolvedRenderExecution,
    resources: RuntimeAssetIndex,
  ): Promise<void>;
  render(packet: PresentationPacket): Promise<void> | void;
  canvas(): HTMLCanvasElement;
  dispose(): void;
}

export interface VideoRenderJob {
  frameSource: CompiledFrameSource;
  execution: ResolvedRenderExecution;
  resources: RuntimeAssetIndex;
  backendId: string;
  output: OutputSpec;
  projectName: string;
}
```

---

## 7. 分支与 PR 纪律

### 7.1 串行合并

建议一个 Agent 按顺序执行，不在高冲突文件上并行开发。

```text
R0 → R1 → R2 → R3 → R4 → R5 → R6 → R7 → R8 → R9 → R10
```

每个 PR 合入后，下一 PR 从最新 `main` 创建。

### 7.2 每个 PR 的固定开工命令

```bash
git fetch origin
git switch main
git pull --ff-only
BASE_SHA=$(git rev-parse HEAD)
git switch -c refactor/mg-rX-<topic>
```

PR 描述必须记录：

```text
Base SHA
Head SHA
是否改变 Gameplay
是否改变 Presentation
是否改变 Pixel
运行过的命令
Capture Artifact / Plan Hash
已知 BLOCKED 项
```

### 7.3 PR 尺寸

- 合同 PR：建议不超过 800 行有效代码；
- Adapter PR：建议不超过 1,200 行；
- Renderer / Exporter PR：可以更大，但必须保持单一目标；
- 文件移动 PR：只能移动和修 Import，不得顺手改行为。

---

# 8. 可直接执行的 PR 序列

## R0 — 冻结当前 main 基线并加架构守卫

### 分支

```text
refactor/mg-r0-baseline-guards
```

### 目标

建立 `main@f1c1052` 之后所有结构改动的可比较基线，防止新代码继续扩大跨层依赖。

### 新增

```text
scripts/check-architecture.mjs
docs/reports/MULTI_GAME_REFACTOR_BASELINE_V2.md
tests/architectureBoundaries.test.ts（可选）
```

### 修改

```text
package.json
.github/workflows/ci.yml
REVIEW.md
```

### 必须记录

- Base SHA；
- Node / npm / Chrome / Three.js；
- 当前 120 tests；
- 当前 public fixture identities；
- 当前 V1 Plan Hash；
- 当前 Material Runtime Hash；
- 当前 ShotExecution evidence；
- 当前 Smoke Capture；
- **当前 HEAD 的 Full Capture**。

注意：仓库当前 `REVIEW.md` 明确表示最新 Full Capture 仍绑定旧 SHA。R0 必须为 `f1c1052` 或正式开工时的新 Base 生成一次 Full Capture，不能继续引用旧 MP4。

### Architecture Guard 初始规则

新增脚本解析相对 Import，并维护一份**递减式 Legacy Allowlist**。

立即禁止：

```text
src/headless → src/games
src/headless → React / Three / reference2d / renderer Scene
src/game-runtime → React / Three / Canvas / src/games
src/games/<A> → src/games/<B>
```

暂时允许但记录债务：

```text
exporter → Block compiler / Scene
App → Block types
integration → ProjectSpec / Take
```

这些 Allowlist 项必须在后续对应 PR 中删除。

### 禁止修改

- Gameplay；
- Presentation Compiler；
- Scene；
- PBR 参数；
- Shot 参数；
- Capture Spec。

### 验收

```bash
npm ci
npm run check
npm test
npm run typecheck
npm run build
npm run test:browser-e2e
npm run capture:review
```

R0 不允许产生预期外像素变化。

---

## R1 — Game Runtime 合同、Schema Registry 与 Block Legacy Runtime

### 分支

```text
refactor/mg-r1-game-runtime
```

### 新增

```text
src/game-runtime/contracts.ts
src/game-runtime/schemaRegistry.ts
src/game-runtime/gameRegistry.ts
src/game-runtime/errors.ts
src/game-runtime/index.ts

src/games/block-placement/manifest.ts
src/games/block-placement/schemas.ts
src/games/block-placement/legacyRuntime.ts
src/games/block-placement/definition.ts
src/games/block-placement/index.ts

src/bootstrap/gameRegistry.ts

tests/gameRegistry.test.ts
tests/blockPlacementLegacyRuntime.test.ts
```

### 实现要求

`legacyRuntime.ts` 只调用现有实现：

```text
createInitialState → createGame
listLegalActions   → listLegalMoves
resolve            → applyPlacement
stateAfter         → transition.after
```

完整 State Hash 必须覆盖：

```text
board
pieces
seed
setIndex
turn
score
combo
status
```

不能只使用 `boardFingerprint`。

### 不修改

```text
App
useStudioModel
Project V1
Presentation Compiler
Reference2DScene
StudioScene
Exporter
Capture
Variant Compiler
```

### 验收

- 未知 Game ID 明确失败；
- 重复 `gameId + moduleVersion` 明确失败；
- 非法 State / Action 通过 Schema 拒绝；
- Legacy Runtime 与直接 `applyPlacement` 深度相等；
- 原有 12 组 deterministic replay/fuzz 不变；
- 当前网页和捕获完全不变。

---

## R2 — Project V2、Replay V2 与 V1 Migration

### 分支

```text
refactor/mg-r2-project-replay-v2
```

### 新增

```text
src/game-runtime/projectEnvelope.ts
src/game-runtime/replayEnvelope.ts
src/game-runtime/projectParser.ts
src/game-runtime/migrations/blockPlacementV1ToV2.ts

schemas/game-project-v2.schema.json
schemas/game-replay-v2.schema.json

src/cli/commands/projectMigrate.ts

tests/projectV1ToV2Migration.test.ts
tests/replayEnvelope.test.ts
```

### 修改

```text
src/cli/bcs.ts
src/domain/projectValidation.ts（只增加入口适配，不削弱 V1 校验）
src/headless/capabilities.ts
```

### 迁移策略

R2 采用：

```text
Importer：V1 + V2
CLI：V1 → V2
Studio Autosave：仍写 V1
Studio 默认导出：仍写 V1
实验导出：允许 V2
```

### 迁移报告

CLI 输出：

```text
sourceFormat / sourceVersion / sourceHash
targetFormat / targetVersion / targetHash
gameId / moduleVersion / rulesetVersion
actionCount / interactionCount
warnings
```

### 验收

- 所有 V1 示例项目可迁移；
- V1 Replay 与 V2 Runtime Replay 得到相同完整 State Hash；
- Semantic Hash 不包含 Pointer Path；
- Frame Hash 包含 Interaction、Rhythm、FPS 和总帧数；
- V2 解析不允许静默补默认字段；
- V1 格式行为和 Hash 不变。

---

## R3 — Presentation Packet、Semantic Event 与 Compiled Frame Source

### 分支

```text
refactor/mg-r3-presentation-frame-source
```

### 新增

```text
src/game-runtime/presentation.ts
src/game-runtime/frameSource.ts
src/game-runtime/presentationRegistry.ts
src/game-runtime/semanticEvents.ts

src/games/block-placement/presentation/legacyPresentationAdapter.ts
src/games/block-placement/presentation/eventAdapter.ts

/tests/blockPlacementFrameSource.test.ts
/tests/presentationPacket.test.ts
```

### 实现方式

第一版继续调用：

```text
compileTake
 evaluateCompiledTake
```

并将现有 `PresentationFrame` 包装成：

```text
payloadSchemaId = bcs.block-placement.presentation-frame.v1
```

不要在 R3 重写导演算法。

### Block Semantic Event 最小映射

```text
block-placement.drag-start
block-placement.placement-committed
block-placement.line-cleared
block-placement.cross-cleared
block-placement.combo-updated
block-placement.game-over
```

### 验收

对所有 Public Fixtures 和全部关键帧：

```text
unwrap(frameSource.frameAt(n).payload)
=== evaluateCompiledTake(compiled, n, rhythm)
```

至少比较：

- Snapshot；
- Board；
- Dragged Piece；
- Pointer；
- Placement Feedback；
- Clearing；
- Camera Punch；
- Total Frames。

还必须验证：

- 重复 Seek 一致；
- 乱序 Seek 一致；
- Frame 负数和越界行为明确；
- Presentation Hash 稳定。

---

## R4 — 收敛当前 Style/Plan 桥为 Resolved Render Execution

### 分支

```text
refactor/mg-r4-render-execution
```

### 目标

不再让 `StyleSpec` 成为 Plan 执行真值；复用当前已经存在的 Plan Shot、Material Runtime 和 Material Behavior 接线。

### 新增

```text
src/headless/renderExecution.ts
src/headless/materialExecution.ts
src/headless/shotExecution.ts

src/games/block-placement/render/legacyStyleAdapter.ts

tests/renderExecution.test.ts
tests/blockPlacementStyleAdapter.test.ts
```

### 修改

```text
src/integration/studioAssetCatalog.ts
src/integration/studioVariantBridge.ts
src/renderer/planShotAdapter.ts
src/domain/types.ts
```

### 精确迁移

当前：

```text
ResolvedRenderPlan
→ resolveStyleFromRenderPlan
→ StyleSpec.materialRuntime
→ StyleSpec.materialBehavior
→ StyleSpec.shotExecution
```

目标：

```text
ResolvedRenderPlan
→ compileResolvedRenderExecution
→ ResolvedMaterialExecution
→ ResolvedShotExecution
→ BlockPlacementLegacyStyleAdapter
→ 当前 StyleSpec / Scene
```

`resolveStyleFromRenderPlan()` 暂时保留，但改为兼容包装器。

### 类型策略

- 新的 `ResolvedShotExecution` 放在 Headless/Render 合同层；
- `domain/types.ts` 中的 `ShotExecution` 暂时 re-export/alias，并标记 deprecated；
- `materialFracture.ts` 的纯函数改为显式接收 Behavior；
- `resolveFractureBehavior(style)` 暂时只留给 Legacy Scene。

### 禁止

- 不改 Shot 数值；
- 不改 UV；
- 不改材质；
- 不改碎片数量、速度和形状；
- 不改 Scene 画面。

### 验收

- 现有 `planExecution.test.ts` 全部继续通过；
- 旧 `resolveStyleFromRenderPlan` 与新 Execution Adapter 输出等价；
- 当前 Plan Render Evidence 字段不变；
- 同一环境 Capture 像素不变。

---

## R5 — Game Render Contract 与 Headless V2 编译链

### 分支

```text
refactor/mg-r5-game-render-contract
```

### 新增

```text
src/game-runtime/renderContract.ts
src/game-runtime/renderContractRegistry.ts

src/headless/creativeMasterV2.ts
src/headless/variantRecipeV2.ts
src/headless/resolvedRenderPlanV2.ts
src/headless/variantCompilerV2.ts
src/headless/qualityGateV2.ts

src/games/block-placement/render/renderContract.ts

schemas/headless/game-render-contract-v1.schema.json
schemas/headless/creative-master-v2.schema.json
schemas/headless/variant-recipe-v2.schema.json
schemas/headless/resolved-render-plan-v2.schema.json

tests/blockPlacementRenderContract.test.ts
tests/variantCompilerV2.test.ts
tests/qualityGateV2.test.ts
```

### Block Render Contract

第一款游戏将当前语义原样注册：

```text
Slots
background.base
board.skin
tile.material
tile.face
tile.geometry
interaction.preview
interaction.pointer
placement.confirmation
clear.primary
clear.tile-exit
hud.current-score
feedback.praise
feedback.combo
background.reaction
lighting.rig
endgame.presentation
```

```text
Events
placement
line-clear
cross-clear
combo
all-clear
game-over
```

```text
Reference Passes
background
board
tile
tray
interaction
placement
clear
feedback
endgame
```

### V1/V2 隔离

禁止把 V2 字段做成 `CreativeMaster` 上的一批 Optional 字段。

必须是：

```ts
export type AnyCreativeMaster = CreativeMasterV1 | CreativeMasterV2;
```

V1 Compiler、V1 Schema 和 V1 Plan Hash 全部冻结。

### V2 Compiler

V2 Compiler 从 `GameRenderContract` 获取：

- Required Slots；
- Allowed Asset Kinds；
- Backend compatibility；
- Event/Effect compatibility；
- Pass 和 Diagnostic capability；
- Game identity 和 Profile identity。

不能再使用全局 `REQUIRED_LOOK_SLOTS` 和固定 Clear Gate。

### 验收

- Block V2 Plan 的 resolved assets 与 V1 等价；
- V1 Plan Hash 不变；
- V2 Plan Hash 包含 game、ruleset、render contract 和 profile versions；
- 测试用最小第二游戏合同可以声明完全不同的 Slot/Event；
- Quality Gate V2 不要求所有游戏都有 `line-clear`。

---

## R6 — Composition、Layout、Camera、Shot、Calibration Profile 化

### 分支

```text
refactor/mg-r6-profiles
```

### 目标

把当前第一游戏的全局常量变成 Game Profile 数据，同时保留当前像素结果。

### 新增

```text
src/headless/compositionProfile.ts
src/headless/layoutProfile.ts
src/headless/cameraProfileV2.ts
src/headless/profileCompiler.ts
src/headless/calibrationProfile.ts

src/games/block-placement/profiles/composition.ts
src/games/block-placement/profiles/layout.ts
src/games/block-placement/profiles/camera.ts
src/games/block-placement/profiles/calibration.ts

schemas/composition-profile-v1.schema.json
schemas/layout-profile-v2.schema.json
schemas/fixed-camera-profile-v2.schema.json
schemas/calibration-profile-v1.schema.json

tests/profileCompiler.test.ts
tests/blockPlacementProfileParity.test.ts
```

### 职责拆分

```text
CompositionProfile
设计分辨率、输出策略、Contain/Cover、Safe Area

LayoutProfile
命名区域和 Surface：playfield、tray、hud、overlay...

CameraProfileV2
Pose、Projection、Lens、Near/Far、反馈上限

ResolvedShotExecution
上述 Profile 与 Backend capability 的编译结果
```

### 兼容当前 Plan Shot

不得删除当前 `planShotAdapter` 的行为。应增加 Legacy 适配：

```text
camera.metadata.boardScreenRect
→ layout.regions.playfield
```

当前 Plan 中只有：

```text
designResolution
boardScreenRect
maximumScreenZoom
```

时，Pose/FOV 仍允许使用 Block Legacy Fallback，但必须在 provenance 中诚实标记。

### 迁移的全局常量

```text
DESIGN_RESOLUTION
VIDEO_RESOLUTION
DESIGN_BOARD_OUTER
DEFAULT_CALIBRATION_ROIS
FIXED_SHOT_PROFILE
REFERENCE_CANVAS / REFERENCE_LAYOUT 中适合 Profile 化的布局数据
```

共享层只保留纯数学函数：

```text
containMapping
mapPoint
viewport containment
CSS → composition
WebGL viewport Y conversion
FOV fit
```

### 验收

- Block Profile 编译结果与当前 ShotExecution 数值一致；
- Reference 2D 原生捕获尺寸不变；
- Fixed-camera Viewport、Pick 和 Pointer 不变；
- Camera/Profile 数据不再使用 `board` 作为平台唯一术语；
- 测试 Profile 可以提供 `playfield` 为非正方形和 layered 区域；
- Full Capture 对比通过。

---

## R7 — Backend Registry、Render Job 与 Exporter/Capture 解耦

### 分支

```text
refactor/mg-r7-backend-export-capture
```

### 新增

```text
src/rendering/backendContracts.ts
src/rendering/backendRegistry.ts
src/rendering/renderJob.ts
src/rendering/compositionBlitter.ts

src/games/block-placement/render/referenceBackendAdapter.ts
src/games/block-placement/render/cinematicBackendAdapter.ts
src/games/block-placement/capture/captureSuite.ts

src/exporter/videoRenderJob.ts
src/capture/captureRunner.ts

tests/backendRegistry.test.ts
tests/videoRenderJob.test.ts
tests/blockPlacementBackendParity.test.ts
```

### 修改

```text
src/exporter/offlineVideoExporter.ts
src/capture/browserCaptureApp.ts
src/capture/capturePlan.ts
src/headless/frameRequest.ts
```

### Exporter 改造

保留现有 WebCodecs / Mediabunny 循环，替换输入：

当前：

```text
Take + Rhythm + Style
→ compileTake
→ evaluateCompiledTake
→ new Reference2DScene / StudioScene
```

目标：

```text
VideoRenderJob
→ CompiledFrameSource
→ BackendRegistry.create(gameId, backendId)
→ backend.render(PresentationPacket)
→ CompositionBlitter
→ WebCodecs
```

现有 `exportTakeVideo()` 保留为 Block Legacy Wrapper。

### Capture 改造

`browserCaptureApp` 变成通用 Runner；Block 的：

- Stills；
- Video Specs；
- Fixture；
- Frame Anchor；
- Pass Isolation；

迁移到 `games/block-placement/capture/captureSuite.ts`。

### Frame Request V2

新增 V2，不破坏 V1：

```text
gameId
presentationHash
backendId
enabledPasses: string[]
diagnosticView: string
compositionProfileId
```

### 验收

- `src/exporter` 不再直接 import Block Engine/Compiler/Scene；
- 通用 Capture Runner 不再 import Block Fixture；
- Legacy API 结果与新 Job 结果一致；
- Repeat Seek、Cancel Export、资源失败继续通过；
- 20 Still + 4 MP4 可由新路径生成；
- Full Capture 和当前基线可比较。

---

## R8 — Runtime Asset Index 与 Prepared Resources 收敛

### 分支

```text
refactor/mg-r8-runtime-assets
```

### 新增

```text
src/assets/runtimeAssetIndex.ts
src/assets/runtimeAssetQueries.ts
src/headless/preparedResourceAccessor.ts

tests/runtimeAssetIndex.test.ts
tests/preparedResourcesParity.test.ts
```

### 目标结构

```ts
export interface RuntimeAssetIndex {
  revision: string;
  bySlot: Record<string, RuntimeAssetBinding[]>;
  byRole: Record<string, RuntimeAssetBinding[]>;
  missing: RuntimeAssetMissing[];
}
```

提供：

```text
firstImage(slotId)
allForSlot(slotId)
allForRole(role)
requireSlot(slotId)
requireContentHash(hash)
```

### 兼容策略

当前：

```text
background
tileFace
particleSprites
textureMaps
binary
```

暂时由：

```text
projectLegacyRuntimeAssetBindings(index)
```

派生给现有两个 Block Scene。

### 严格要求

- 继续复用现有 `collectRuntimeAssetRequests`；
- 不重写 Plan 闭包遍历；
- 不重复加载相同 Content Hash；
- `PreparedResources` 与 Browser Asset Store 的 readiness 必须统一；
- Object URL 的所有权和释放者必须明确。

### 验收

- 当前 Background / Tile Face / PBR Maps 行为不变；
- 一个 Slot 可以有多资产；
- Mahjong Face Pack 等未来 Slot 不需要增加顶层字段；
- Hash mismatch、missing blob、decode failure 明确失败；
- PBR Browser Asset Capture 继续通过。

---

## R9 — Studio Shell、Game Studio Contribution 与游戏市场入口

### 分支

```text
refactor/mg-r9-studio-shell
```

### 新增

```text
src/studio/StudioShell.tsx
src/studio/useProjectSession.ts
src/studio/useRenderSession.ts
src/studio/GameWorkspaceHost.tsx
src/studio/gameStudioRegistry.ts

src/games/block-placement/studio/useBlockPlacementModel.ts
src/games/block-placement/studio/BlockPlacementWorkspace.tsx
src/games/block-placement/studio/BlockPlacementInspector.tsx
src/games/block-placement/studio/BlockPlacementStatus.tsx
src/games/block-placement/studio/contribution.tsx

src/catalog/GameCatalog.tsx
src/catalog/gameCatalog.ts

tests/studioRegistry.test.ts
```

### 修改

```text
src/App.tsx
src/state/useStudioModel.ts
src/state/useVariantWorkspace.ts
src/components/* 中与 Block 强耦合的部分
```

### 目标

公共 Shell 负责：

- Project/Take 选择；
- Mode；
- Timeline 容器；
- Variant Workspace；
- Resource readiness；
- Export；
- Quality Report；
- Calibration 入口。

Block Contribution 负责：

- `GridCell`；
- 棋盘编辑；
- 候选 Piece；
- 拖拽落子；
- Block 指标；
- Block Inspector；
- Block Viewport 绑定。

最终 `App.tsx` 不再 import：

```text
GridCell
PieceInstance
BoardState
Reference2DViewport
ThreeViewport
```

### 游戏市场一期

一期采用静态 Registry，不下载外部代码：

```text
Block Placement：production/现状
Block Crush：coming-soon 或 diagnostic
Vita Mahjong：planned
```

创建项目时先选择 Game Definition。项目创建后不能直接跨游戏切换 Runtime。

### Autosave 策略

R9 结束时仍可默认写 V1 Block Project；只有 R10 的第二游戏验证通过后才切换 V2 为默认。

### 验收

- Block UI 行为不变；
- App Shell 无 Block 类型依赖；
- Variant Workspace 从 Game Definition 取得 Render Contract/Profile；
- Game Catalog 可列出注册游戏；
- App-shell E2E 覆盖编辑、试玩、Replay、Variant、导出门禁；
- Smoke/Full Capture 继续通过。

---

## R10 — 第一游戏归位、第二游戏架构证明与 Legacy 收敛

### 分支

```text
refactor/mg-r10-proof-and-file-move
```

该阶段建议拆成两个 PR。

### R10a：纯机械文件归位

在所有调用者已经使用 Registry/Adapter 后，再移动：

```text
src/domain/gameEngine.ts
→ src/games/block-placement/runtime/gameEngine.ts

src/domain/boardPresets.ts
→ src/games/block-placement/runtime/boardPresets.ts

src/domain/shapes.ts
→ src/games/block-placement/runtime/shapes.ts

src/director/presentationCompiler.ts
→ src/games/block-placement/presentation/compiler.ts

src/reference2d/Reference2DScene.ts
→ src/games/block-placement/render/BlockPlacementReferenceScene.ts

src/renderer/StudioScene.ts
→ src/games/block-placement/render/BlockPlacementCinematicScene.ts
```

保留短期 Re-export，避免外部示例一次性失效。

纯移动 PR 禁止改行为和像素。

同时处理：

- 删除或合并未使用的 `src/extensions/contracts.ts` 平行 Asset/Renderer 类型；
- 收紧 Architecture Allowlist；
- 更新文档路径。

### R10b：最小第二游戏证明切片

不要求完成 Block Crush，但必须新增一个真实的、不同于 Block Placement 的最小 Slice：

```text
Game Definition
Project V2 Fixture
State / Action / Resolution
Presentation Packet
Game Render Contract
Composition/Layout/Profile
Diagnostic Reference Backend
Capture Still
```

推荐直接使用 Block Crush 的最小确定性切片：

```text
6×12 或其他可变尺寸棋盘
一个 drop-piece 动作
一个 settle 结果
无正式坍塌物理
Diagnostic Flat 渲染
```

这个 Slice 必须做到：

- 平台核心零 `if (gameId === 'block-crush-drop')`；
- 不修改 Block Required Slots；
- 使用独立 Event/Pass/Profile；
- 通过通用 Export/Capture 路径输出至少一张帧；
- Block 原有路径不回归。

只有该证明通过后，才允许：

- Studio 默认写 Project V2；
- Web/CLI 默认使用 Compiler V2；
- V1 转为只读迁移路径；
- `three-3d` 标记 Legacy；
- 删除部分兼容 Wrapper。

---

## 9. 测试与证据矩阵

| PR | Gameplay 测试 | Headless/Contract | Browser Smoke | Full Capture | 人工视觉 |
|---|---:|---:|---:|---:|---:|
| R0 | 全量 | 全量 | 必须 | 必须建立新基线 | 不要求通过，但记录 |
| R1 | 新增 Runtime parity | Registry | 必须 | 可选 | 否 |
| R2 | V1/V2 Replay parity | Schema/Migration | 必须 | 否 | 否 |
| R3 | Frame parity/Seek | Packet/Hash | 必须 | 可选 | 否 |
| R4 | 无规则变化 | Execution parity | 必须 | 必须 | 检查无变化 |
| R5 | 无规则变化 | Compiler/Quality V2 | 必须 | 可选 | 否 |
| R6 | 无规则变化 | Profile parity | 必须 | 必须 | 检查构图无变化 |
| R7 | 无规则变化 | Backend/Job | 必须 | 必须 | 抽查 2D/3D |
| R8 | 无规则变化 | Resource parity | 必须 | PBR Full Capture | 抽查材质 |
| R9 | Block UI 全流程 | Studio Registry | App-shell E2E | 必须 | 抽查交互 |
| R10 | Block + 最小 Crush | 全链路 V2 | 必须 | 两游戏 Evidence | 第二游戏诊断审核 |

商业 Golden 仍可能因源视频缺失保持 `BLOCKED`。不得为了让 CI 绿色把 `BLOCKED` 改成 `PASS`。

---

## 10. 每个 PR 的统一命令

```bash
npm ci
npm run check
npm test
npm run typecheck
npm run build
npm run test:render-regression
npm run test:golden-batch
npm run test:pbr-runtime
npm run test:browser-e2e
```

触及以下任一文件时必须额外执行 Full Capture：

```text
src/reference2d/**
src/renderer/**
src/rendering/**
src/exporter/**
src/capture/**
src/integration/studioAssetCatalog.ts
src/integration/studioVariantBridge.ts
src/headless/coordinateMapping.ts
任何 Camera/Layout/Composition/Profile
```

命令：

```bash
npm run capture:review
```

或者在 PR 添加 `full-capture` Label。

---

## 11. 风险与处理

### 风险 1：继续把执行数据塞入 StyleSpec

处理：R4 首先建立 `ResolvedRenderExecution`。`StyleSpec` 只保留为 Block Legacy Adapter 和网页创作参数。

### 风险 2：为了多游戏把所有状态做成 Optional Union

处理：游戏内部强类型；平台边界使用 `schemaId + unknown + parser`；禁止万能 `GameState`。

### 风险 3：过早重写 Scene

处理：两个 Block Scene 先包装成 Backend Adapter，最后才移动。新游戏可以有自己的 Scene。

### 风险 4：V2 破坏 V1 Plan Hash

处理：V1/V2 类型、Parser、Compiler、Schema 明确分离；V1 Hash 回归测试冻结。

### 风险 5：Profile 化改变构图

处理：先把当前常量封装成第一游戏 Profile，做数值和 Full Capture parity，再开放新 Profile。

### 风险 6：资源系统重复实现

处理：所有 V2 Index 建立在当前 `collectRuntimeAssetRequests` 和 Plan closure 上；不得重新遍历目录或 Look JSON。

### 风险 7：结构重构与视觉优化混在一起

处理：本重构所有 PR 默认 Pixel-neutral。任何美术变化另开 PR，并提供 before/after/evidence。

---

## 12. 明确反模式

禁止：

```ts
if (gameId === 'block-placement') { ... }
else if (gameId === 'block-crush-drop') { ... }
else if (gameId === 'vita-mahjong-solitaire') { ... }
```

出现在 Platform、Exporter、Headless、Studio Shell 中。

禁止：

```ts
interface UniversalGameState {
  board?: BoardState;
  crushGrid?: CrushGrid;
  mahjongTiles?: MahjongTile[];
}
```

禁止：

- 把所有游戏强制成 8×8 数组；
- 删除 Backend ID；
- 合并 Canvas 与 Three Scene 只为“统一”；
- 新建平行 Material Runtime；
- 让自由刚体决定幸存实体的最终规则位置；
- 把 Preview fallback 当作 Authoritative Capture；
- 把契约通过、SwiftShader 截图或单元测试称为视觉质量批准；
- 在目录移动 PR 中修改逻辑；
- 在 V2 尚未被第二游戏验证前删除 V1。

---

## 13. 开工时只做 R0 和 R1

第一轮不要同时实施全部方案。

### R0 开工

```bash
git fetch origin
git switch main
git pull --ff-only
git switch -c refactor/mg-r0-baseline-guards
```

先完成：

```text
Architecture Guard
Baseline Report
当前 HEAD Full Capture
REVIEW 状态更新
```

提交建议：

```bash
git commit -m "chore(architecture): freeze multi-game refactor baseline"
```

### R1 开工

R0 合入后：

```bash
git switch main
git pull --ff-only
git switch -c refactor/mg-r1-game-runtime
```

只完成：

```text
Game Runtime Contracts
Schema Registry
Game Registry
Block Placement Legacy Runtime
Parity Tests
```

提交建议：

```bash
git commit -m "refactor(game): register Block Placement runtime"
```

第一轮结束时，网页、Project、Renderer、Exporter 和 Capture 应当完全没有行为变化，但仓库已经拥有真正的第一款 `GameDefinition`。

---

## 14. 重构完成定义

只有以下条件全部成立，才能宣布多游戏重构完成：

- `block-placement` 通过 Game Registry 运行；
- Platform Core 无具体游戏 Import；
- Headless V2 从 Game Render Contract 获取 Slot/Event/Pass；
- Exporter 无具体游戏和具体 Scene Import；
- Capture Runner 无具体 Block Fixture Import；
- App/Studio Shell 无 `GridCell / PieceInstance / BoardState` Import；
- Composition、Layout、Camera、Calibration 为 Profile；
- Plan Shot 和 Material Behavior 不再只存在于 StyleSpec；
- Runtime Assets 支持任意 Slot 查询；
- V1 Project 可迁移且 Replay 结果不变；
- V1 Plan Hash 保持冻结；
- Block Reference 2D 与 Fixed-camera Capture 不回归；
- 一个最小 Block Crush Diagnostic Slice 通过同一通用链路；
- 添加 Vita Mahjong 时不需要修改 Platform Core，只需要新增 Game Package、Profile、Render Contract 与 Backend/Studio Contribution。

执行顺序不能倒置。最先写的是 R0 与 R1，不是 Block Crush Scene，也不是大规模目录搬迁。