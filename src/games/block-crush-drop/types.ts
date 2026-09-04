export type CrushWoodPieceId =
  | 'I4'
  | 'O4'
  | 'T4'
  | 'L4'
  | 'J4'
  | 'S4'
  | 'Z4'
  | 'I3'
  | 'L3'
  | 'P5'
  | 'U5'
  | 'V5'
  | 'W5';

export type CrushWoodSkinId =
  | 'golden-embossed'
  | 'classic-maple'
  | 'deep-mahogany'
  | 'checker-maze';

export interface CrushWoodPoint {
  row: number;
  col: number;
}

export interface CrushWoodConfig {
  levelId: string;
  columns: number;
  rows: number;
  initialRows: string[];
  queue: CrushWoodPieceId[];
  startingScore: number;
  targetScore: number;
  scorePerLine: number;
  startingTimeMs: number;
  moveTimeMs: number;
  skinId: CrushWoodSkinId;
}

export type CrushWoodBoard = Array<Array<string | null>>;

export type CrushWoodStatus = 'playing' | 'won' | 'game-over';

export interface CrushWoodState {
  levelId: string;
  columns: number;
  rows: number;
  board: CrushWoodBoard;
  queue: CrushWoodPieceId[];
  queueIndex: number;
  score: number;
  targetScore: number;
  scorePerLine: number;
  linesCleared: number;
  combo: number;
  turn: number;
  remainingTimeMs: number;
  moveTimeMs: number;
  skinId: CrushWoodSkinId;
  status: CrushWoodStatus;
}

export interface CrushWoodAction {
  pieceId: CrushWoodPieceId;
  column: number;
  rotation: 0 | 1 | 2 | 3;
}

export interface CrushWoodCollapseMove {
  cellId: string;
  from: CrushWoodPoint;
  to: CrushWoodPoint;
}

export interface CrushWoodResolution {
  before: CrushWoodState;
  after: CrushWoodState;
  action: CrushWoodAction;
  shape: CrushWoodPoint[];
  spawnRow: number;
  landingRow: number;
  placedCells: CrushWoodPoint[];
  placedBoard: CrushWoodBoard;
  clearedRows: number[];
  clearedCells: Array<CrushWoodPoint & { cellId: string }>;
  collapseMoves: CrushWoodCollapseMove[];
  scoreDelta: number;
}

export type CrushWoodPhase =
  | 'idle'
  | 'fall'
  | 'impact'
  | 'crush'
  | 'collapse'
  | 'settle'
  | 'outcome';

export interface CrushWoodActivePieceFrame {
  pieceId: CrushWoodPieceId;
  rotation: 0 | 1 | 2 | 3;
  column: number;
  row: number;
  shape: CrushWoodPoint[];
}

export interface CrushWoodPresentationPayload {
  phase: CrushWoodPhase;
  phaseProgress: number;
  actionIndex: number;
  board: CrushWoodBoard;
  beforeBoard: CrushWoodBoard;
  placedBoard: CrushWoodBoard;
  afterBoard: CrushWoodBoard;
  activePiece: CrushWoodActivePieceFrame | null;
  clearedRows: number[];
  clearedCells: Array<CrushWoodPoint & { cellId: string }>;
  collapseMoves: CrushWoodCollapseMove[];
  queue: CrushWoodPieceId[];
  queueIndex: number;
  score: number;
  scoreDelta: number;
  targetScore: number;
  linesCleared: number;
  remainingTimeMs: number;
  status: CrushWoodStatus;
  skinId: CrushWoodSkinId;
  debrisSeed: number;
}

export interface CrushWoodDirectorProfile {
  leadInFrames: number;
  fallFrames: number;
  impactFrames: number;
  crushFrames: number;
  collapseFrames: number;
  settleFrames: number;
  interActionGapFrames: number;
  tailFrames: number;
}
