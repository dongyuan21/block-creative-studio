import type { AnyGameDefinition, GameRuntimeContext } from './contracts';

export { GameRegistry as GameRuntimeRegistry, GameRegistry, gameKey } from './gameRegistry';

export interface ErasedGameRuntime {
  readonly definition: AnyGameDefinition;
  parseConfig(value: unknown): unknown;
  parseState(value: unknown): unknown;
  parseAction(value: unknown): unknown;
  createInitialState(config: unknown, seed: number): unknown;
  hashState(state: unknown): string;
  listLegalActions?(state: unknown): unknown[];
  resolve(state: unknown, action: unknown, context: GameRuntimeContext): unknown;
  stateAfter(resolution: unknown): unknown;
}

export function eraseGameDefinition(definition: AnyGameDefinition): ErasedGameRuntime {
  const runtime = definition.runtime;
  const erased: ErasedGameRuntime = {
    definition,
    parseConfig: (value) => definition.schemas.config.parse(value),
    parseState: (value) => definition.schemas.state.parse(value),
    parseAction: (value) => definition.schemas.action.parse(value),
    createInitialState: (config, seed) => runtime.createInitialState(config, seed),
    hashState: (state) => runtime.hashState(state),
    resolve: (state, action, context) => runtime.resolve(state, action, context),
    stateAfter: (resolution) => runtime.stateAfter(resolution),
  };
  if (runtime.listLegalActions) {
    erased.listLegalActions = (state) => runtime.listLegalActions!(state);
  }
  return erased;
}
