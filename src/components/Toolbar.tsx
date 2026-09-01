import type { StudioMode } from '../domain/types';

interface ToolbarProps {
  projectName: string;
  mode: StudioMode;
  hasTake: boolean;
  onProjectName(name: string): void;
  onEdit(): void;
  onPlay(): void;
  onReplay(): void;
  onAgent(): void;
  onExportProject(): void;
  onImportProject(file: File): Promise<void>;
}

export function Toolbar({
  projectName,
  mode,
  hasTake,
  onProjectName,
  onEdit,
  onPlay,
  onReplay,
  onAgent,
  onExportProject,
  onImportProject,
}: ToolbarProps) {
  const rendering = mode === 'render';
  const recording = mode === 'play';
  return (
    <header className="toolbar">
      <div className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="brand-copy">
        <strong>Block Creative Studio</strong>
        <input
          value={projectName}
          disabled={rendering || recording}
          onChange={(event) => onProjectName(event.target.value)}
          aria-label="项目名称"
        />
      </div>
      <nav className="mode-tabs" aria-label="工作模式">
        <button className={mode === 'edit' ? 'is-active' : ''} onClick={onEdit} disabled={rendering}>编辑</button>
        <button className={mode === 'play' ? 'is-active' : ''} onClick={onPlay} disabled={rendering || recording}>真人试玩</button>
        <button
          className={mode === 'replay' || mode === 'render' ? 'is-active' : ''}
          onClick={onReplay}
          disabled={!hasTake || rendering || recording}
        >导演回放</button>
      </nav>
      <div className="toolbar-actions">
        <button className="button-secondary" onClick={onAgent} disabled={rendering || recording}>机器试玩</button>
        <label className={rendering || recording ? 'button-secondary file-button is-disabled' : 'button-secondary file-button'}>
          导入项目
          <input
            type="file"
            disabled={rendering || recording}
            accept=".json,.block-creative.json,application/json"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                await onImportProject(file);
              } catch (error) {
                window.alert(error instanceof Error ? error.message : '导入失败。');
              } finally {
                event.target.value = '';
              }
            }}
          />
        </label>
        <button className="button-primary" onClick={onExportProject} disabled={rendering || recording}>导出工程码</button>
      </div>
    </header>
  );
}
