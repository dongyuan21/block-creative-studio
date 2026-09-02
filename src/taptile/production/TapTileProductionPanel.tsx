import { useEffect, useMemo, useRef, useState } from 'react';
import { exportFixedFrameVideo, type FixedFrameExportResult, type FrameRenderProgress } from '../../exporter/fixedFrameExporter';
import { downloadBlob } from '../../utils/download';
import type { CompiledTapTileLevel, TapTileProjectV2 } from '../project';
import { hashCanvasPixels } from '../render';
import {
  expandTapTileBatchMatrix,
  prepareTapTileVariant,
  runTapTileBatch,
  serializeTapTileRenderManifest,
  validateTapTileVariantDependencies,
  type TapTileBatchTask,
  type TapTileVariantSpec,
} from './index';
import { createTapTileRenderManifest } from './manifest';
import { exportTapTileProjectBundle, importTapTileProjectBundle } from './projectBundle';
import { preflightTapTileProductionRenderJob } from './renderJob';

interface TapTileProductionPanelProps {
  project: TapTileProjectV2;
  level: CompiledTapTileLevel;
  onChange(mutator: (draft: TapTileProjectV2) => void): void;
  onImport(project: TapTileProjectV2): void;
  onNotice(message: string): void;
}

interface ProductionArtifact {
  videoUrl: string;
  manifestUrl: string;
  video: FixedFrameExportResult;
  manifestText: string;
  manifestFileName: string;
  sha256: string;
  pcmHash: string;
  combinationHash: string;
}

interface BatchArtifact {
  taskId: string;
  videoUrl: string;
  manifestUrl: string;
  videoFileName: string;
  manifestFileName: string;
}

function selectedVariant(project: TapTileProjectV2, level: CompiledTapTileLevel): TapTileVariantSpec | null {
  const take = project.takes.find((candidate) => candidate.id === project.selectedTakeId) ?? project.takes.at(-1);
  const skinPackId = project.visuals.selectedThemeId;
  const directorProfileId = project.director.selectedProfileId;
  const audioPackId = project.production.selectedAudioPackId ?? Object.keys(project.production.audioPacks)[0];
  const cutSpecId = project.production.selectedCutId ?? Object.keys(project.production.cuts)[0];
  const cut = cutSpecId ? project.production.cuts[cutSpecId] : undefined;
  if (!take || !audioPackId || !cutSpecId) return null;
  return {
    levelId: project.level.id,
    takeId: take.id,
    skinPackId,
    directorProfileId,
    audioPackId,
    cutSpecId,
    ...(cut?.outroPackId ? { outroPackId: cut.outroPackId } : {}),
    renderSpec: structuredClone(project.render),
  };
}

function releaseArtifact(artifact: ProductionArtifact | null): void {
  if (!artifact) return;
  URL.revokeObjectURL(artifact.videoUrl);
  URL.revokeObjectURL(artifact.manifestUrl);
}

export function TapTileProductionPanel({ project, level, onChange, onImport, onNotice }: TapTileProductionPanelProps) {
  const spec = useMemo(() => selectedVariant(project, level), [level, project]);
  const dependency = useMemo(
    () => spec ? validateTapTileVariantDependencies(project, level, spec) : { valid: false, reasons: ['TAKE_MISSING: 请先保存至少一条 Take。'] },
    [level, project, spec],
  );
  const preview = useMemo(() => {
    if (!spec || !dependency.valid) return null;
    try { return prepareTapTileVariant(project, level, spec); }
    catch { return null; }
  }, [dependency.valid, level, project, spec]);
  const [previewFrame, setPreviewFrame] = useState(0);
  const [previewHash, setPreviewHash] = useState('pending');
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [singleProgress, setSingleProgress] = useState<FrameRenderProgress | null>(null);
  const [singleError, setSingleError] = useState('');
  const [singleArtifact, setSingleArtifact] = useState<ProductionArtifact | null>(null);
  const singleAbortRef = useRef<AbortController | null>(null);
  const [batchTasks, setBatchTasks] = useState<TapTileBatchTask[]>([]);
  const [batchArtifacts, setBatchArtifacts] = useState<BatchArtifact[]>([]);
  const batchAbortRef = useRef<AbortController | null>(null);
  const bundleImportRef = useRef<HTMLInputElement | null>(null);
  const [bundleResult, setBundleResult] = useState<{ url: string; fileName: string; bytes: number; projectHash: string } | null>(null);

  useEffect(() => () => { void preview?.job.dispose?.(); }, [preview]);
  useEffect(() => () => releaseArtifact(singleArtifact), [singleArtifact]);
  useEffect(() => () => {
    for (const artifact of batchArtifacts) {
      URL.revokeObjectURL(artifact.videoUrl);
      URL.revokeObjectURL(artifact.manifestUrl);
    }
  }, [batchArtifacts]);
  useEffect(() => () => { if (bundleResult) URL.revokeObjectURL(bundleResult.url); }, [bundleResult]);

  useEffect(() => {
    setPreviewFrame((current) => Math.min(current, Math.max(0, (preview?.job.totalFrames ?? 1) - 1)));
  }, [preview?.job.totalFrames]);

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!preview || !canvas) { setPreviewHash('unavailable'); return; }
    let active = true;
    setPreviewHash('pending');
    void (async () => {
      await preview.job.prepare?.(canvas);
      await preview.job.render(preview.job.evaluate(previewFrame), canvas);
      if (active) setPreviewHash(hashCanvasPixels(canvas));
    })().catch((error: unknown) => {
      if (active) setPreviewHash(`error:${error instanceof Error ? error.message : String(error)}`);
    });
    return () => { active = false; };
  }, [preview, previewFrame]);

  const matrix = useMemo(() => expandTapTileBatchMatrix(project, level, {
    takeIds: project.takes.map((take) => take.id),
    skinPackIds: Object.keys(project.visuals.themes),
    directorProfileIds: Object.keys(project.director.profiles).slice(0, 3),
    audioPackIds: Object.keys(project.production.audioPacks),
    cutSpecIds: Object.keys(project.production.cuts),
    outroPackIds: Object.keys(project.production.outros),
    renderSpecs: [project.render],
  }), [level, project]);
  const validMatrix = useMemo(() => matrix.filter((task) => validateTapTileVariantDependencies(project, level, task.spec).valid), [level, matrix, project]);
  const invalidMatrix = matrix.length - validMatrix.length;

  const updateSelection = (kind: 'take' | 'skin' | 'director' | 'audio' | 'cut' | 'outro', value: string): void => {
    onChange((draft) => {
      if (kind === 'take') draft.selectedTakeId = value;
      else if (kind === 'skin') draft.visuals.selectedThemeId = value;
      else if (kind === 'director') draft.director.selectedProfileId = value;
      else if (kind === 'audio') draft.production.selectedAudioPackId = value;
      else if (kind === 'cut') draft.production.selectedCutId = value;
      else {
        const cutId = draft.production.selectedCutId;
        if (cutId && draft.production.cuts[cutId]) draft.production.cuts[cutId]!.outroPackId = value;
      }
    });
    setPreviewFrame(0);
  };

  const exportProductionVariant = async (): Promise<void> => {
    if (!spec || !dependency.valid || singleAbortRef.current) return;
    releaseArtifact(singleArtifact);
    setSingleArtifact(null);
    setSingleError('');
    const controller = new AbortController();
    singleAbortRef.current = controller;
    let prepared: ReturnType<typeof prepareTapTileVariant> | undefined;
    try {
      prepared = prepareTapTileVariant(project, level, spec);
      const preflight = await preflightTapTileProductionRenderJob(prepared.job);
      if (!preflight.valid) throw new Error(preflight.issues.map((issue) => `${issue.code}: ${issue.message}`).join('\n'));
      const video = await exportFixedFrameVideo(prepared.job, {
        bitrate: project.render.quality === 'cinematic' ? 20_000_000 : project.render.quality === 'preview' ? 8_000_000 : 14_000_000,
        fileName: prepared.fileName,
        signal: controller.signal,
        onProgress: setSingleProgress,
        audio: {
          data: prepared.job.audioMix.data,
          sampleRate: prepared.job.audioMix.sampleRate,
          numberOfChannels: prepared.job.audioMix.numberOfChannels,
          bitrate: 192_000,
        },
        metadata: {
          title: `${prepared.project.name} · TapTile production variant`,
          artist: 'Block Creative Studio',
          comment: `${prepared.job.identity.combinationHash} · ${prepared.job.audioMix.pcmHash}`,
        },
      });
      const manifest = await createTapTileRenderManifest(prepared.project, level, prepared.job, video);
      const manifestText = serializeTapTileRenderManifest(manifest);
      const videoUrl = URL.createObjectURL(video.blob);
      const manifestUrl = URL.createObjectURL(new Blob([manifestText], { type: 'application/json' }));
      setSingleArtifact({
        videoUrl,
        manifestUrl,
        video,
        manifestText,
        manifestFileName: `${video.fileName}.manifest.json`,
        sha256: manifest.output.sha256,
        pcmHash: manifest.audio.pcmHash,
        combinationHash: manifest.combinationHash,
      });
      onNotice(`带音频成片已完成：${video.frameCount} 帧 · ${manifest.audio.cueCount} 个语义音效`);
    } catch (error) {
      const canceled = controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError');
      setSingleError(canceled ? '成片导出已取消；工程保持不变。' : error instanceof Error ? error.message : String(error));
      if (prepared) await prepared.job.dispose?.();
    } finally {
      singleAbortRef.current = null;
    }
  };

  const startBatch = async (): Promise<void> => {
    if (batchAbortRef.current || validMatrix.length === 0) return;
    for (const artifact of batchArtifacts) {
      URL.revokeObjectURL(artifact.videoUrl);
      URL.revokeObjectURL(artifact.manifestUrl);
    }
    setBatchArtifacts([]);
    const preferred = validMatrix.filter((task) => task.spec.cutSpecId === project.production.selectedCutId);
    const pool = preferred.length >= 3 ? preferred : validMatrix;
    const indexes = [...new Set([0, Math.floor(pool.length / 2), pool.length - 1])];
    const selected = indexes.map((index) => pool[index]).filter((task): task is TapTileBatchTask => Boolean(task));
    const controller = new AbortController();
    batchAbortRef.current = controller;
    setBatchTasks(selected);
    const finished = await runTapTileBatch(project, level, selected, async (prepared, signal, onProgress) => {
      const preflight = await preflightTapTileProductionRenderJob(prepared.job);
      if (!preflight.valid) throw new Error(preflight.issues.map((issue) => `${issue.code}: ${issue.message}`).join('\n'));
      return exportFixedFrameVideo(prepared.job, {
        bitrate: project.render.quality === 'cinematic' ? 20_000_000 : project.render.quality === 'preview' ? 8_000_000 : 14_000_000,
        fileName: prepared.fileName,
        ...(signal ? { signal } : {}),
        onProgress,
        audio: {
          data: prepared.job.audioMix.data,
          sampleRate: prepared.job.audioMix.sampleRate,
          numberOfChannels: prepared.job.audioMix.numberOfChannels,
          bitrate: 192_000,
        },
        metadata: { title: prepared.fileName, artist: 'Block Creative Studio', comment: prepared.job.identity.combinationHash },
      });
    }, { signal: controller.signal, onUpdate: setBatchTasks });
    const artifacts: BatchArtifact[] = [];
    for (const task of finished) {
      if (!task.result) continue;
      const manifestText = serializeTapTileRenderManifest(task.result.manifest);
      artifacts.push({
        taskId: task.id,
        videoUrl: URL.createObjectURL(task.result.video.blob),
        manifestUrl: URL.createObjectURL(new Blob([manifestText], { type: 'application/json' })),
        videoFileName: task.result.video.fileName,
        manifestFileName: `${task.result.video.fileName}.manifest.json`,
      });
    }
    setBatchArtifacts(artifacts);
    batchAbortRef.current = null;
    const completed = finished.filter((task) => task.status === 'completed').length;
    const failed = finished.filter((task) => task.status === 'failed').length;
    onNotice(`批量队列完成：${completed} 成功 · ${failed} 失败`);
  };

  const exportBundle = async (): Promise<void> => {
    const result = await exportTapTileProjectBundle(project);
    if (bundleResult) URL.revokeObjectURL(bundleResult.url);
    const url = URL.createObjectURL(result.blob);
    setBundleResult({ url, fileName: result.fileName, bytes: result.blob.size, projectHash: result.manifest.projectHash });
    onNotice(`项目包已生成：${result.manifest.takeIds.length} 条 Take · ${Object.keys(result.checksums).length} 个校验项`);
  };

  const selectedCut = spec ? project.production.cuts[spec.cutSpecId] : undefined;
  const batchCompleted = batchTasks.filter((task) => task.status === 'completed').length;
  const batchFailed = batchTasks.filter((task) => task.status === 'failed').length;
  const batchCanceled = batchTasks.filter((task) => task.status === 'canceled').length;
  const currentProductionFrame = preview?.job.evaluate(previewFrame);

  return (
    <section
      className="tpt-production-panel"
      data-production-valid={dependency.valid ? 'true' : 'false'}
      data-production-takes={project.takes.length}
      data-production-skins={Object.keys(project.visuals.themes).length}
      data-production-directors={Object.keys(project.director.profiles).length}
      data-production-audio-packs={Object.keys(project.production.audioPacks).length}
      data-production-cuts={Object.keys(project.production.cuts).length}
      data-production-outros={Object.keys(project.production.outros).length}
      data-matrix-total={matrix.length}
      data-matrix-valid={validMatrix.length}
      data-matrix-invalid={invalidMatrix}
      data-single-phase={singleProgress?.phase ?? 'idle'}
      data-single-bytes={singleArtifact?.video.blob.size ?? 0}
      data-single-frames={singleArtifact?.video.frameCount ?? 0}
      data-single-video-sha={singleArtifact?.sha256 ?? ''}
      data-single-pcm-hash={singleArtifact?.pcmHash ?? ''}
      data-single-combination-hash={singleArtifact?.combinationHash ?? ''}
      data-batch-total={batchTasks.length}
      data-batch-completed={batchCompleted}
      data-batch-failed={batchFailed}
      data-batch-canceled={batchCanceled}
    >
      <div className="tpt-production-heading">
        <div><strong>投放成片与批量矩阵</strong><small>语义音频 · Cut/TimeWarp · Outro · manifest · 项目包</small></div>
        <span className={dependency.valid ? 'is-valid' : 'is-invalid'}>{dependency.valid ? '依赖完整' : `${dependency.reasons.length} 个依赖问题`}</span>
      </div>
      <div className="tpt-production-grid">
        <div className="tpt-production-controls">
          <label><span>Take</span><select data-production-take value={spec?.takeId ?? ''} onChange={(event) => updateSelection('take', event.target.value)}>{project.takes.map((take) => <option key={take.id} value={take.id}>{take.name} · {take.actions.length} 步</option>)}</select></label>
          <label><span>SkinPack</span><select data-production-skin value={spec?.skinPackId ?? ''} onChange={(event) => updateSelection('skin', event.target.value)}>{Object.values(project.visuals.themes).map((skin) => <option key={skin.id} value={skin.id}>{skin.name}</option>)}</select></label>
          <label><span>Director</span><select data-production-director value={spec?.directorProfileId ?? ''} onChange={(event) => updateSelection('director', event.target.value)}>{Object.values(project.director.profiles).map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>
          <label><span>AudioPack</span><select data-production-audio value={spec?.audioPackId ?? ''} onChange={(event) => updateSelection('audio', event.target.value)}>{Object.values(project.production.audioPacks).map((pack) => <option key={pack.id} value={pack.id}>{pack.name}</option>)}</select></label>
          <label><span>CutSpec</span><select data-production-cut value={spec?.cutSpecId ?? ''} onChange={(event) => updateSelection('cut', event.target.value)}>{Object.values(project.production.cuts).map((cut) => <option key={cut.id} value={cut.id}>{cut.name}</option>)}</select></label>
          <label><span>OutroPack</span><select data-production-outro value={selectedCut?.outroPackId ?? ''} onChange={(event) => updateSelection('outro', event.target.value)}>{Object.values(project.production.outros).map((outro) => <option key={outro.id} value={outro.id}>{outro.name} · {outro.durationFrames}f</option>)}</select></label>
        </div>
        <div className="tpt-production-preview-card">
          <canvas ref={previewCanvasRef} className="tpt-production-preview" width={1080} height={1920} data-preview-hash={previewHash} data-preview-phase={currentProductionFrame?.phase ?? 'unavailable'} />
          {preview && (
            <>
              <input data-production-preview-seek type="range" min={0} max={preview.job.totalFrames - 1} value={previewFrame} onChange={(event) => setPreviewFrame(Number(event.target.value))} />
              <div><b>{preview.job.totalFrames} 帧 / {(preview.job.totalFrames / preview.job.fps).toFixed(2)} 秒</b><span>{currentProductionFrame?.phase} · 源帧 {currentProductionFrame?.sourceFrame} · {preview.job.audioMix.scheduledCues.length} cues</span></div>
              <small>{preview.job.identity.combinationHash} · {preview.job.audioMix.pcmHash} · peak {preview.job.audioMix.peakAfterLimit.toFixed(3)}</small>
            </>
          )}
        </div>
      </div>
      {!dependency.valid && <p className="tpt-production-error" data-production-error>{dependency.reasons.join(' · ')}</p>}
      {singleProgress && <div className="tpt-export-progress"><i style={{ width: `${singleProgress.ratio * 100}%` }} /><span>{singleProgress.message}</span></div>}
      {singleError && <p className="tpt-production-error">{singleError}</p>}
      <div className="tpt-production-actions">
        {singleAbortRef.current
          ? <button data-action="cancel-production-export" onClick={() => singleAbortRef.current?.abort()}>取消带音频导出</button>
          : <button data-action="start-production-export" className="tpt-action-primary" disabled={!dependency.valid} onClick={() => void exportProductionVariant()}>导出带音频成片</button>}
        {singleArtifact && <><a data-production-video-download href={singleArtifact.videoUrl} download={singleArtifact.video.fileName}>下载 MP4</a><a data-production-manifest-download href={singleArtifact.manifestUrl} download={singleArtifact.manifestFileName}>下载 manifest</a></>}
      </div>

      <div className="tpt-batch-summary">
        <div><strong>批量矩阵</strong><span>1 Level × {project.takes.length} Take × {Object.keys(project.visuals.themes).length} Skin × {Math.min(3, Object.keys(project.director.profiles).length)} Director × {Object.keys(project.production.audioPacks).length} Audio × {Object.keys(project.production.cuts).length} Cut × {Object.keys(project.production.outros).length} Outro</span><small>{matrix.length} 个去重组合 · {validMatrix.length} 可执行 · {invalidMatrix} 个有明确依赖原因</small></div>
        {batchAbortRef.current
          ? <button data-action="cancel-production-batch" onClick={() => batchAbortRef.current?.abort()}>取消队列</button>
          : <button data-action="start-production-batch" disabled={validMatrix.length === 0} onClick={() => void startBatch()}>生成 3 个代表组合</button>}
      </div>
      {batchTasks.length > 0 && <div className="tpt-batch-list">{batchTasks.map((task) => {
        const artifact = batchArtifacts.find((candidate) => candidate.taskId === task.id);
        return <div key={task.id} data-batch-task={task.id} data-batch-status={task.status}><b>{task.status}</b><span>{task.spec.skinPackId} · {task.spec.directorProfileId} · {task.spec.audioPackId} · {task.spec.cutSpecId}</span><i style={{ width: `${task.progress * 100}%` }} />{task.failureReason && <small>{task.failureReason}</small>}{artifact && <span><a data-batch-video-download href={artifact.videoUrl} download={artifact.videoFileName}>MP4</a> · <a data-batch-manifest-download href={artifact.manifestUrl} download={artifact.manifestFileName}>manifest</a></span>}</div>;
      })}</div>}

      <div className="tpt-bundle-row" data-bundle-bytes={bundleResult?.bytes ?? 0} data-bundle-project-hash={bundleResult?.projectHash ?? ''}>
        <div><strong>.taptile-project.zip</strong><small>project.json / assets / takes / manifests / checksums.json</small></div>
        <button data-action="export-project-bundle" onClick={() => void exportBundle()}>生成项目包</button>
        <button onClick={() => bundleImportRef.current?.click()}>回导项目包</button>
        {bundleResult && <a data-project-bundle-download href={bundleResult.url} download={bundleResult.fileName}>下载 {bundleResult.fileName}</a>}
        <input ref={bundleImportRef} data-project-bundle-import className="tpt-hidden-input" type="file" accept=".zip,.taptile-project.zip" onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          void importTapTileProjectBundle(file).then((result) => {
            onImport(result.project);
            onNotice(`项目包 hash 校验通过并已回导：${result.manifest.projectHash}`);
          }).catch((error: unknown) => onNotice(error instanceof Error ? error.message : String(error)));
          event.currentTarget.value = '';
        }} />
      </div>
      {singleArtifact && <button className="tpt-hidden-repeat" data-action="download-production-direct" onClick={() => downloadBlob(singleArtifact.video.blob, singleArtifact.video.fileName)}>下载当前成片</button>}
    </section>
  );
}
