export type {
  AnyGameDefinition,
  GameDefinition,
  GameManifest,
  GameRuntime,
  GameRuntimeContext,
  GameSchemas,
  GameTopology,
  RuntimeSchema,
} from './contracts';
export { GamePlatformError, GameRegistryError, GameRuntimeError, GameSchemaError } from './errors';
export { GameRegistry, gameKey } from './gameRegistry';
export { eraseGameDefinition, GameRuntimeRegistry, type ErasedGameRuntime } from './registry';
export { SchemaRegistry, schemaKey } from './schemaRegistry';
export {
  GAME_PROJECT_CONTRACT,
  GAME_PROJECT_CONTRACT_VERSION,
  STUDIO_PROJECT_V2_FORMAT,
  STUDIO_PROJECT_V2_VERSION,
  type GameProjectEnvelope,
  type ProjectMigrationReport,
  type StudioProjectDocumentV2,
} from './projectEnvelope';
export {
  GAME_REPLAY_CONTRACT,
  GAME_REPLAY_CONTRACT_VERSION,
  frameReplayIdentity,
  semanticReplayIdentity,
  splitPointerPlacement,
  type GameReplayEnvelope,
  type InteractionRecord,
} from './replayEnvelope';
export {
  PRESENTATION_PACKET_CONTRACT,
  PRESENTATION_PACKET_CONTRACT_VERSION,
  presentationHashIdentity,
  type PresentationPacket,
  type SemanticGameEvent,
} from './presentationPacket';
export type { CompiledFrameSource, PresentationCompilerAdapter } from './frameSource';
export { PresentationRegistry } from './presentationRegistry';
export {
  GAME_RENDER_CONTRACT,
  GAME_RENDER_CONTRACT_VERSION,
  requiredSlotIds,
  slotRequirement,
  type GameRenderContract,
} from './renderContract';
export type { CalibrationProfile, CalibrationRoiSpec } from './calibrationProfile';
export {
  detectStudioDocumentKind,
  parseGameProjectEnvelope,
  parseGameReplayEnvelope,
  parseStudioProjectDocumentV2,
} from './projectParser';

