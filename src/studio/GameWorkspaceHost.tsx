import type { GameStudioRegistry } from './gameStudioRegistry';
import type { ProjectSession } from './sessionTypes';

export function GameWorkspaceHost({
  registry,
  session,
}: {
  registry: GameStudioRegistry;
  session: ProjectSession;
}) {
  const module = registry.require(session.gameId);
  const Workspace = module.Workspace;
  if (!Workspace || module.status !== 'available') {
    return (
      <div className="studio-coming-soon">
        <strong>{module.displayName}</strong>
        <span>Coming Soon</span>
        <p>{module.description}</p>
        <button className="button-secondary" type="button" onClick={() => session.setGameId(registry.defaultGameId())}>
          返回已接入游戏
        </button>
      </div>
    );
  }
  return (
    <div className="studio-workspace-host">
      <Workspace />
    </div>
  );
}
