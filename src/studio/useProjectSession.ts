import { useCallback, useMemo, useState } from 'react';
import type { GameStudioRegistry } from './gameStudioRegistry';
import type { ProjectSession } from './sessionTypes';

export function useProjectSession(registry: GameStudioRegistry): ProjectSession {
  const [gameId, setGameIdState] = useState(() => registry.defaultGameId());

  const setGameId = useCallback((nextGameId: string): void => {
    const found = registry.get(nextGameId);
    if (!found || found.status !== 'available') return;
    setGameIdState(nextGameId);
  }, [registry]);

  return useMemo(
    () => ({
      gameId,
      setGameId,
      modules: registry.list().map((item) => ({
        gameId: item.gameId,
        displayName: item.displayName,
        status: item.status,
        description: item.description,
      })),
    }),
    [gameId, registry, setGameId],
  );
}
