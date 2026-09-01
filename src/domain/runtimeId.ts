let fallbackCounter = 0;

/** Creates collision-resistant runtime identifiers without coupling persisted data to array positions. */
export function createRuntimeId(prefix: string): string {
  const randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  const token = randomUUID
    ? randomUUID()
    : `${Date.now().toString(36)}-${(fallbackCounter += 1).toString(36)}`;
  return `${prefix}-${token}`;
}
