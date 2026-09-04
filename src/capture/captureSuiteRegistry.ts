import type { CaptureSuite } from './captureSuite';

const suites = new Map<string, CaptureSuite>();

export function registerCaptureSuite(suite: CaptureSuite): void {
  const existing = suites.get(suite.gameId);
  if (existing) {
    if (existing === suite || existing.id === suite.id) return;
    throw new Error(
      `Capture suite for ${suite.gameId} is already registered as ${existing.id}.`,
    );
  }
  suites.set(suite.gameId, suite);
}

export function getCaptureSuite(gameId: string): CaptureSuite | undefined {
  return suites.get(gameId);
}

export function requireCaptureSuite(gameId: string): CaptureSuite {
  const suite = suites.get(gameId);
  if (!suite) {
    throw new Error(`Unknown capture suite for game ${gameId}.`);
  }
  return suite;
}

export function listCaptureSuites(): CaptureSuite[] {
  return [...suites.values()];
}

export function unregisterCaptureSuite(gameId: string): void {
  suites.delete(gameId);
}
