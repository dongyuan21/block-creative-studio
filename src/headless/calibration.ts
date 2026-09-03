import type {
  CalibrationCase,
  CalibrationCorrespondence,
  CalibrationReviewStatus,
  CalibrationRoi,
} from './contracts.js';
import { BCS_CONTRACT_VERSION } from './contracts.js';
import { stableHash } from './stableHash.js';
import { DESIGN_RESOLUTION } from './coordinateMapping.js';
import { DESIGN_BOARD_OUTER } from './coordinateMapping.js';

export interface GoldenSceneDefinition {
  id: string;
  startFrame: number;
  peakFrame: number;
  endFrame: number;
  purpose: string;
}

export const DEFAULT_CALIBRATION_ROIS: CalibrationRoi[] = [
  { id: 'board', x: DESIGN_BOARD_OUTER.x, y: DESIGN_BOARD_OUTER.y, width: DESIGN_BOARD_OUTER.size, height: DESIGN_BOARD_OUTER.size },
  { id: 'grid', x: 91, y: 321, width: 892, height: 892 },
  { id: 'hud-score', x: 372, y: 165, width: 320, height: 96 },
  { id: 'tray', x: 80, y: 1320, width: 904, height: 280 },
];

export function calibrationCaseIdentity(input: {
  referenceMediaHash?: string;
  sourcePtsSeconds?: number;
  targetTakeHash?: string;
  isolatedFixtureHash?: string;
  targetFrame: number;
  targetFps: number;
  planHash?: string;
}): string {
  return stableHash(input);
}

export function createCalibrationCase(input: {
  id: string;
  eventId: string;
  eventType: string;
  targetFrame: number;
  targetFps?: number;
  correspondence: CalibrationCorrespondence;
  reviewStatus?: CalibrationReviewStatus;
  unresolvedReasons?: string[];
  referenceMediaHash?: string;
  sourceFrameIndex?: number;
  sourcePtsSeconds?: number;
  sourceTimeBase?: string;
  targetTakeHash?: string;
  isolatedFixtureHash?: string;
  roi?: CalibrationRoi[];
}): CalibrationCase {
  const reviewStatus = input.reviewStatus ?? 'NOT_RUN';
  const value: CalibrationCase = {
    contract: 'bcs.calibration-case',
    contractVersion: BCS_CONTRACT_VERSION,
    id: input.id,
    targetFrame: input.targetFrame,
    targetFps: input.targetFps ?? 30,
    eventId: input.eventId,
    eventType: input.eventType,
    correspondence: input.correspondence,
    roi: input.roi ?? DEFAULT_CALIBRATION_ROIS,
    excludedRegions: [],
    reviewStatus,
    unresolvedReasons: input.unresolvedReasons ?? [],
  };
  if (input.referenceMediaHash !== undefined) value.referenceMediaHash = input.referenceMediaHash;
  if (input.sourceFrameIndex !== undefined) value.sourceFrameIndex = input.sourceFrameIndex;
  if (input.sourcePtsSeconds !== undefined) value.sourcePtsSeconds = input.sourcePtsSeconds;
  if (input.sourceTimeBase !== undefined) value.sourceTimeBase = input.sourceTimeBase;
  if (input.targetTakeHash !== undefined) value.targetTakeHash = input.targetTakeHash;
  if (input.isolatedFixtureHash !== undefined) value.isolatedFixtureHash = input.isolatedFixtureHash;
  return value;
}

export function expandGoldenSceneCases(
  scenes: GoldenSceneDefinition[],
  options: {
    correspondence: CalibrationCorrespondence;
    reviewStatus: CalibrationReviewStatus;
    unresolvedReasons: string[];
    referenceMediaHash?: string;
    sourceFps?: number;
    targetFps?: number;
    isolatedFixtureHash?: string;
    targetTakeHash?: string;
  },
): CalibrationCase[] {
  const cases: CalibrationCase[] = [];
  for (const scene of scenes) {
    for (const [anchor, frame] of [
      ['start', scene.startFrame],
      ['peak', scene.peakFrame],
      ['end', scene.endFrame],
    ] as const) {
      const sourcePts = options.sourceFps ? frame / options.sourceFps : undefined;
      cases.push(createCalibrationCase({
        id: `${scene.id}:${anchor}`,
        eventId: scene.id,
        eventType: scene.purpose,
        targetFrame: frame,
        targetFps: options.targetFps ?? 30,
        correspondence: options.correspondence,
        reviewStatus: options.reviewStatus,
        unresolvedReasons: options.unresolvedReasons,
        ...(options.referenceMediaHash !== undefined ? { referenceMediaHash: options.referenceMediaHash } : {}),
        sourceFrameIndex: frame,
        ...(sourcePts !== undefined ? { sourcePtsSeconds: sourcePts, sourceTimeBase : `${options.sourceFps}/1` } : {}),
        ...(options.targetTakeHash !== undefined ? { targetTakeHash: options.targetTakeHash } : {}),
        ...(options.isolatedFixtureHash !== undefined ? { isolatedFixtureHash: options.isolatedFixtureHash } : {}),
      }));
    }
  }
  return cases;
}

export interface GoldenBatchReport {
  contract: 'bcs.golden-batch-report';
  contractVersion: typeof BCS_CONTRACT_VERSION;
  generatedAt: string;
  designResolution: typeof DESIGN_RESOLUTION;
  cases: Array<{
    case: CalibrationCase;
    identity: string;
    metrics?: {
      meanAbsoluteError: number;
      rootMeanSquareError: number;
      changedPixelRatio: number;
      edgeMismatchRatio: number;
      alphaMismatchRatio: number;
      score: number;
    };
  }>;
  summary: Record<CalibrationReviewStatus, number>;
}

export function summarizeCalibrationCases(cases: CalibrationCase[]): Record<CalibrationReviewStatus, number> {
  const summary: Record<CalibrationReviewStatus, number> = {
    PASS: 0,
    FAIL: 0,
    BLOCKED: 0,
    NOT_COMPARABLE: 0,
    NOT_RUN: 0,
  };
  for (const item of cases) summary[item.reviewStatus] += 1;
  return summary;
}

export function renderGoldenReportHtml(report: GoldenBatchReport): string {
  const rows = report.cases.map((entry) => {
    const status = entry.case.reviewStatus;
    const score = entry.metrics ? entry.metrics.score.toFixed(1) : '—';
    return `<tr><td>${entry.case.id}</td><td>${entry.case.correspondence}</td><td>${status}</td><td>${score}</td><td>${entry.case.unresolvedReasons.join('; ')}</td></tr>`;
  }).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>Golden Batch Report</title>
<style>body{font-family:sans-serif;background:#111;color:#eee;padding:24px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #444;padding:6px 8px;text-align:left}th{background:#222}</style>
</head><body><h1>Golden Batch Report</h1>
<p>design ${report.designResolution.width}×${report.designResolution.height}</p>
<table><thead><tr><th>Case</th><th>Correspondence</th><th>Status</th><th>Score</th><th>Reasons</th></tr></thead>
<tbody>${rows}</tbody></table></body></html>`;
}
