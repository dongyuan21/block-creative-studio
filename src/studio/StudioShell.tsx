import { GameWorkspaceHost } from './GameWorkspaceHost';
import type { GameStudioRegistry } from './gameStudioRegistry';
import { useProjectSession } from './useProjectSession';

export function StudioShell({ registry }: { registry: GameStudioRegistry }) {
  const session = useProjectSession(registry);
  return (
    <div className="studio-platform">
      <nav className="game-market" aria-label="游戏市场">
        <span className="game-market__label">Games</span>
        {session.modules.map((module) => {
          const active = module.gameId === session.gameId;
          const soon = module.status === 'coming-soon';
          return (
            <button
              key={module.gameId}
              type="button"
              className={`game-market-card${active ? ' is-active' : ''}${soon ? ' is-soon' : ''}`}
              disabled={soon}
              onClick={() => session.setGameId(module.gameId)}
              title={module.description}
            >
              <strong>{module.displayName}</strong>
              <small>{soon ? 'Coming Soon' : 'Available'}</small>
            </button>
          );
        })}
      </nav>
      <GameWorkspaceHost registry={registry} session={session} />
    </div>
  );
}
