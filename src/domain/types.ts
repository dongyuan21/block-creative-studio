export const BOARD_SIZE = 8;

export type TileColor = 'coral' | 'amber' | 'lime' | 'cyan' | 'blue' | 'violet';
export type Actor = 'human' | 'agent';
export type StudioMode = 'edit' | 'play' | 'replay' | 'render';
export type GameStatus = 'playing' | 'game-over';
export type MaterialPresetId = 'glossy-plastic' | 'candy-resin' | 'crystal-glass';
export type LightingPresetId = 'clean-studio' | 'soft-candy' | 'neon-contrast';
export type CameraPresetId = 'flat-gameplay' | 'premium-perspective' | 'dynamic-clear';
export type FxPresetId = 'clean-pop' | 'crystal-shatter' | 'energy-burst';
export type RhythmPresetId = 'human-natural' | 'tight-fast' | 'suspense-burst' | 'combo-rush';
export type GeometryPresetId = 'soft-cube' | 'premium-beveled' | 'candy-rounded';

export interface GridCell { row: number; col: number }

export interface BoardState {
  rows: number;
  cols: number;
  cells: Array<Array<TileColor | null>>;
}

export interface PieceShape {
  id: string;
  label: string;
  cells: Array<[number, number]>;
}

export interface PieceInstance {
  id: string;
  shapeId: string;
  color: TileColor;
  used: boolean;
  setIndex: number;
  slotIndex: number;
}

export interface GameSnapshot {
  board: BoardState;
  pieces: PieceInstance[];
  seed: number;
  setIndex: number;
  turn: number;
  score: number;
  combo: number;
  status: GameStatus;
}

/** Viewport-normalized pointer coordinates plus a frame offset from drag start. */
export interface PointerSample { frameOffset: number; x: number; y: number }

export interface PlacementAction {
  id: string;
  actor: Actor;
  pieceId: string;
  anchor: GridCell;
  durationFrames: number;
  pointerPath: PointerSample[];
}

export interface ClearResult {
  rows: number[];
  cols: number[];
  cells: Array<GridCell & { color: TileColor }>;
}

export interface GameTransition {
  before: GameSnapshot;
  placedBoard: BoardState;
  after: GameSnapshot;
  action: PlacementAction;
  clear: ClearResult;
  points: number;
}

export interface Take {
  id: string;
  name: string;
  createdAt: string;
  initial: GameSnapshot;
  actions: PlacementAction[];
}

export interface RhythmProfile {
  id: RhythmPresetId;
  label: string;
  description: string;
  globalSpeed: number;
  dragFrames: number;
  pickupDelayFrames: number;
  placementSettleFrames: number;
  betweenActionFrames: number;
  clearDelayFrames: number;
  clearDurationFrames: number;
  cameraRecoveryFrames: number;
  easing: 'easeOutCubic' | 'easeInOutCubic' | 'easeOutBack';
}

export interface GeometryStyle {
  id: GeometryPresetId;
  depth: number;
  bevel: number;
  gap: number;
}

export interface StyleSpec {
  material: MaterialPresetId;
  lighting: LightingPresetId;
  camera: CameraPresetId;
  fx: FxPresetId;
  geometry: GeometryStyle;
  background: string;
  showPointer: boolean;
}

export interface RenderSpec {
  width: number;
  height: number;
  fps: number;
  quality: 'preview' | 'standard' | 'cinematic';
}

export interface ProjectSpec {
  schemaVersion: '1.0.0';
  id: string;
  name: string;
  ruleProfile: 'block-placement-classic-v1';
  seed: number;
  setupBoard: BoardState;
  setupPieces: PieceInstance[];
  style: StyleSpec;
  rhythm: RhythmProfile;
  render: RenderSpec;
}

export interface LegalMove {
  pieceId: string;
  anchor: GridCell;
  immediateLines: number;
  clearedCells: number;
  heuristic: number;
}

export interface CompiledAction {
  action: PlacementAction;
  transition: GameTransition;
  startFrame: number;
  releaseFrame: number;
  clearStartFrame: number;
  clearEndFrame: number;
  endFrame: number;
}

export interface CompiledTake {
  id: string;
  fps: number;
  totalFrames: number;
  actions: CompiledAction[];
  initial: GameSnapshot;
  final: GameSnapshot;
}

export interface ClearingFrame { clear: ClearResult; progress: number; seed: number }

export interface PresentationFrame {
  frame: number;
  fps: number;
  totalFrames?: number;
  snapshot: GameSnapshot;
  board: BoardState;
  hiddenPieceId?: string;
  draggedPiece?: { piece: PieceInstance; anchor: GridCell; progress: number; pointerDriven?: boolean };
  pointer?: { x: number; y: number; pressed: boolean };
  clearing?: ClearingFrame;
  cameraPunch: number;
}
