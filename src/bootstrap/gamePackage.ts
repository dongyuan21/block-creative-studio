import type { AnyGameDefinition } from '../game-runtime/contracts';
import { GameRegistry, gameKey } from '../game-runtime/gameRegistry';
import { GameRegistryError } from '../game-runtime/errors';
import type { PresentationCompilerAdapter } from '../game-runtime/frameSource';
import { PresentationRegistry } from '../game-runtime/presentationRegistry';
import type { GameRenderContract } from '../game-runtime/renderContract';
import { RenderContractRegistry, renderContractKey } from '../game-runtime/renderContractRegistry';
import type { CalibrationProfile } from '../game-runtime/calibrationProfile';
import type { CaptureSuite } from '../capture/captureSuite';
import { getCaptureSuite, registerCaptureSuite, unregisterCaptureSuite } from '../capture/captureSuiteRegistry';
import type { CompositionProfile } from '../rendering/composition';
import {
  getCalibrationProfile,
  getCompositionProfile,
  registerCalibrationProfile,
  registerCompositionProfile,
  unregisterCalibrationProfile,
  unregisterCompositionProfile,
} from '../rendering/compositionRegistry';
import {
  getRenderBackend,
  registerRenderBackend,
  unregisterRenderBackend,
  type RenderBackendAdapter,
} from '../rendering/backendRegistry';

/**
 * Atomic game package. Studio workspaces stay in `platformBootstrap.ts`
 * so the headless/CLI graph does not import React. Optional `studioGameId`
 * is only an identity check against `definition.manifest.gameId`.
 */
export interface GamePackageRegistration {
  definition: AnyGameDefinition;
  presentation?: PresentationCompilerAdapter;
  renderContract?: GameRenderContract;
  compositions?: CompositionProfile[];
  calibrations?: CalibrationProfile[];
  backends?: RenderBackendAdapter[];
  captureSuite?: CaptureSuite;
  studioGameId?: string;
}

export interface HeadlessPlatform {
  games: GameRegistry;
  presentations: PresentationRegistry;
  renderContracts: RenderContractRegistry;
}

function fail(code: string, message: string, details?: unknown): never {
  throw new GameRegistryError(code, message, details !== undefined ? { details } : {});
}

function preflightGamePackage(pkg: GamePackageRegistration, target: HeadlessPlatform): void {
  const gameId = pkg.definition.manifest.gameId;
  const moduleVersion = pkg.definition.manifest.moduleVersion;
  if (pkg.presentation && pkg.presentation.gameId !== gameId) {
    fail('PACKAGE_GAME_ID_MISMATCH', `Presentation gameId ${pkg.presentation.gameId} does not match ${gameId}.`);
  }
  if (pkg.renderContract && pkg.renderContract.gameId !== gameId) {
    fail('PACKAGE_GAME_ID_MISMATCH', `Render contract gameId ${pkg.renderContract.gameId} does not match ${gameId}.`);
  }
  for (const composition of pkg.compositions ?? []) {
    if (composition.gameId !== gameId) {
      fail('PACKAGE_GAME_ID_MISMATCH', `Composition ${composition.id} gameId ${composition.gameId} does not match ${gameId}.`);
    }
  }
  for (const calibration of pkg.calibrations ?? []) {
    if (calibration.gameId !== gameId) {
      fail('PACKAGE_GAME_ID_MISMATCH', `Calibration ${calibration.id} gameId ${calibration.gameId} does not match ${gameId}.`);
    }
    const composition = (pkg.compositions ?? []).find((item) => item.id === calibration.compositionProfileId)
      ?? getCompositionProfile(calibration.compositionProfileId);
    if (!composition) {
      fail(
        'CALIBRATION_COMPOSITION_MISSING',
        `Calibration ${calibration.id} references unknown composition ${calibration.compositionProfileId}.`,
      );
    }
    if (composition.gameId !== calibration.gameId) {
      fail(
        'CALIBRATION_COMPOSITION_GAME_MISMATCH',
        `Calibration ${calibration.id} game ${calibration.gameId} does not match composition ${composition.id} game ${composition.gameId}.`,
      );
    }
  }
  if (pkg.captureSuite && pkg.captureSuite.gameId !== gameId) {
    fail('PACKAGE_GAME_ID_MISMATCH', `Capture suite gameId ${pkg.captureSuite.gameId} does not match ${gameId}.`);
  }
  if (pkg.studioGameId !== undefined && pkg.studioGameId !== gameId) {
    fail('PACKAGE_GAME_ID_MISMATCH', `Studio module gameId ${pkg.studioGameId} does not match ${gameId}.`);
  }

  if (target.games.has(gameId, moduleVersion)) {
    fail('DUPLICATE_GAME', `Game ${gameKey(gameId, moduleVersion)} is already registered.`);
  }
  if (pkg.presentation && target.presentations.has(gameId)) {
    fail('DUPLICATE_PRESENTATION', `Presentation adapter for ${gameId} is already registered.`);
  }
  if (pkg.renderContract && target.renderContracts.has(pkg.renderContract.id, pkg.renderContract.version)) {
    fail(
      'DUPLICATE_RENDER_CONTRACT',
      `Render contract ${renderContractKey(pkg.renderContract.id, pkg.renderContract.version)} is already registered.`,
    );
  }
  for (const composition of pkg.compositions ?? []) {
    const existing = getCompositionProfile(composition.id);
    if (existing && existing !== composition && JSON.stringify(existing) !== JSON.stringify(composition)) {
      fail('DUPLICATE_COMPOSITION', `Composition profile ${composition.id} is already registered.`);
    }
  }
  for (const calibration of pkg.calibrations ?? []) {
    const existing = getCalibrationProfile(calibration.id);
    if (existing && existing !== calibration && JSON.stringify(existing) !== JSON.stringify(calibration)) {
      fail('DUPLICATE_CALIBRATION', `Calibration profile ${calibration.id} is already registered.`);
    }
  }
  for (const backend of pkg.backends ?? []) {
    const existing = getRenderBackend(backend.id);
    if (existing && existing !== backend) {
      fail('BACKEND_DUPLICATE', `Render backend ${backend.id} is already registered.`);
    }
  }
  if (pkg.captureSuite) {
    const existing = getCaptureSuite(gameId);
    if (existing && existing !== pkg.captureSuite && existing.id !== pkg.captureSuite.id) {
      fail('DUPLICATE_CAPTURE_SUITE', `Capture suite for ${gameId} is already registered as ${existing.id}.`);
    }
  }
}

export function registerGamePackage(
  pkg: GamePackageRegistration,
  target: HeadlessPlatform,
): void {
  preflightGamePackage(pkg, target);
  const rollback: Array<() => void> = [];
  const gameId = pkg.definition.manifest.gameId;
  const moduleVersion = pkg.definition.manifest.moduleVersion;
  try {
    for (const composition of pkg.compositions ?? []) {
      const existed = getCompositionProfile(composition.id);
      registerCompositionProfile(composition);
      if (!existed) rollback.push(() => unregisterCompositionProfile(composition.id));
    }
    for (const calibration of pkg.calibrations ?? []) {
      const existed = getCalibrationProfile(calibration.id);
      registerCalibrationProfile(calibration);
      if (!existed) rollback.push(() => unregisterCalibrationProfile(calibration.id));
    }
    for (const backend of pkg.backends ?? []) {
      const existed = getRenderBackend(backend.id);
      registerRenderBackend(backend);
      if (!existed) rollback.push(() => unregisterRenderBackend(backend.id));
    }
    if (pkg.captureSuite) {
      const existed = getCaptureSuite(gameId);
      registerCaptureSuite(pkg.captureSuite);
      if (!existed) rollback.push(() => unregisterCaptureSuite(gameId));
    }
    if (pkg.renderContract) {
      target.renderContracts.register(pkg.renderContract);
      rollback.push(() => target.renderContracts.unregister(pkg.renderContract!.id, pkg.renderContract!.version));
    }
    if (pkg.presentation) {
      target.presentations.register(pkg.presentation);
      rollback.push(() => target.presentations.unregister(gameId));
    }
    target.games.register(pkg.definition);
    rollback.push(() => target.games.unregister(gameId, moduleVersion));
  } catch (error) {
    for (const undo of rollback.reverse()) undo();
    throw error;
  }
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
