import type { GameSnapshot, StudioMode } from '../domain/types';

const MODE_LABELS: Record<StudioMode, string> = {
  edit: '牌面编辑',
  play: '真人试玩录制',
  replay: '导演回放',
  render: '离线逐帧渲染',
};

export function StatusBar({ mode, snapshot }: { mode: StudioMode; snapshot: GameSnapshot }) {
  return (
    <footer className="status-bar">
      <span className="status-dot" />
      <strong>{MODE_LABELS[mode]}</strong>
      <span>回合 {snapshot.turn}</span>
      <span>得分 {snapshot.score}</span>
      <span>Combo {snapshot.combo}</span>
      <span className="status-spacer" />
      <span>Three.js / WebGL2</span>
      <span>固定时间步</span>
      <span>Schema 1.0.0</span>
    </footer>
  );
}
