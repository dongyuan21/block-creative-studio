# 一期架构

## 目标

浏览器内部完成一条可运行闭环：牌面编辑、真人或机器试玩、语义 Replay、导演节奏、三维预览和固定帧视频导出。Blender/AE 不进入一期运行链，只通过抽象接口预留下一期接入点。

## 单向依赖

```text
Game Core
  → PlacementAction / Take
  → Presentation Compiler
  → PresentationFrame
  → Three.js StudioScene
  → CanvasSource / WebCodecs / MP4
```

`game-core` 不依赖 React、Three.js、浏览器或视频编码器。玩法状态和视觉状态分开，使同一 Take 可反复更换材质、镜头、特效和节奏。

## 人类与机器统一入口

人类拖拽和机器玩家最终都输出 `PlacementAction`。动作中的真相是 `pieceId + anchor`；指针轨迹只是导演信息。机器玩家不需要截图识别或模拟鼠标，即可通过合法动作 API 下棋。

## 实时与成片分离

实时试玩只记录 Replay。成片阶段编译为固定帧 `PresentationFrame`，逐帧重演并送入浏览器原生视频编码链。因此导出速度可以慢于实时，但不会丢帧或改变动作帧位。

## 一期 DCC 扩展缝

`src/extensions/contracts.ts` 定义 `AssetRef`、`GeometryProvider`、`EffectProvider` 和 `RendererBackend`。一期只有内建程序化资产。下一期可增加 GLB、Flipbook、Blender 或 AE Provider，而不污染玩法 Schema。
