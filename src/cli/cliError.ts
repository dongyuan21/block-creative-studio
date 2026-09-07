import { GamePlatformError } from '../game-runtime/errors.js';
import { BcsHeadlessError } from '../headless/errors.js';

export function rethrowAsCliError(error: unknown, fallbackCode: string): never {
  if (error instanceof BcsHeadlessError) throw error;
  if (error instanceof GamePlatformError) {
    throw new BcsHeadlessError(error.code, error.message, {
      ...(error.path !== undefined ? { path: error.path } : {}),
      ...(error.details !== undefined ? { details: error.details } : {}),
    });
  }
  throw new BcsHeadlessError(
    fallbackCode,
    error instanceof Error ? error.message : String(error),
    { details: error instanceof Error ? error.message : error },
  );
}

export async function withCliErrors<T>(fallbackCode: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    rethrowAsCliError(error, fallbackCode);
  }
}
