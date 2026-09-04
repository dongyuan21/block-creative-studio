export type StudioSessionMode = 'edit' | 'play' | 'replay' | 'render';

export type GameStudioModuleStatus = 'available' | 'coming-soon';

export interface ProjectSession {
  gameId: string;
  setGameId(gameId: string): void;
  modules: readonly GameStudioModuleSummary[];
}

export interface GameStudioModuleSummary {
  gameId: string;
  displayName: string;
  status: GameStudioModuleStatus;
  description: string;
}
