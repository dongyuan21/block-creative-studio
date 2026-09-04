import type { AnyGameDefinition } from '../game-runtime/contracts';
import { GameRegistry } from '../game-runtime/gameRegistry';
import type { PresentationCompilerAdapter } from '../game-runtime/frameSource';
import { PresentationRegistry } from '../game-runtime/presentationRegistry';
import type { GameRenderContract } from '../game-runtime/renderContract';
import { RenderContractRegistry } from '../game-runtime/renderContractRegistry';
import type { CalibrationProfile } from '../game-runtime/calibrationProfile';
import type { CaptureSuite } from '../capture/captureSuite';
import type { CompositionProfile } from '../rendering/composition';
import {
  registerCalibrationProfile,
  registerCompositionProfile,
} from '../rendering/compositionRegistry';
import {
  registerRenderBackend,
  type RenderBackendAdapter,
} from '../rendering/backendRegistry';

export interface GamePackageRegistration {
  definition: AnyGameDefinition;
  presentation?: PresentationCompilerAdapter;
  renderContract?: GameRenderContract;
  compositions?: CompositionProfile[];
  calibrations?: CalibrationProfile[];
  backends?: RenderBackendAdapter[];
  captureSuite?: CaptureSuite;
}

export interface HeadlessPlatform {
  games: GameRegistry;
  presentations: PresentationRegistry;
  renderContracts: RenderContractRegistry;
}

export function registerGamePackage(
  pkg: GamePackageRegistration,
  target: HeadlessPlatform,
): void {
  target.games.register(pkg.definition);
  if (pkg.presentation) target.presentations.register(pkg.presentation);
  if (pkg.renderContract) target.renderContracts.register(pkg.renderContract);
  for (const composition of pkg.compositions ?? []) registerCompositionProfile(composition);
  for (const calibration of pkg.calibrations ?? []) registerCalibrationProfile(calibration);
  for (const backend of pkg.backends ?? []) registerRenderBackend(backend);
}

export function createHeadlessPlatform(packages: readonly GamePackageRegistration[]): HeadlessPlatform {
  const platform: HeadlessPlatform = {
    games: new GameRegistry(),
    presentations: new PresentationRegistry(),
    renderContracts: new RenderContractRegistry(),
  };
  for (const pkg of packages) registerGamePackage(pkg, platform);
  return platform;
}
