import { describe, expect, it } from 'vitest';
import { RHYTHM_PRESETS } from '../src/director/rhythmPresets';
import { createCrossClearBoard } from '../src/domain/boardPresets';
import { createGame, createPieceSet, makeAgentTake } from '../src/domain/gameEngine';
import { parseStudioBundle, type StudioBundle } from '../src/domain/projectValidation';
import type { ProjectSpec } from '../src/domain/types';
import { DEFAULT_STYLE } from '../src/renderer/stylePresets';

function bundle(): StudioBundle {
  const seed = 41782;
  const setupPieces = createPieceSet(seed, 0, ['single', 'tri-h', 'square-2']);
  const project: ProjectSpec = {
    schemaVersion: '1.0.0',
    id: 'validation-fixture',
    name: 'Validation Fixture',
    ruleProfile: 'block-placement-classic-v1',
    seed,
    setupBoard: createCrossClearBoard(),
    setupPieces,
    style: structuredClone(DEFAULT_STYLE),
    rhythm: { ...RHYTHM_PRESETS['human-natural'] },
    render: { width: 1080, height: 1920, fps: 30, quality: 'standard' },
  };
  const initial = createGame(project.setupBoard, seed, setupPieces);
  return {
    format: 'block-creative-studio-project',
    version: '1.0.0',
    project,
    takes: [makeAgentTake(initial, 2)],
  };
}

describe('project validation', () => {
  it('accepts a complete project bundle', () => {
    const parsed = parseStudioBundle(structuredClone(bundle()));
    expect(parsed.project.seed).toBe(41782);
    expect(parsed.takes).toHaveLength(1);
  });

  it('rejects a take whose initial candidate tray no longer matches the project', () => {
    const payload = structuredClone(bundle());
    payload.takes[0]!.initial.pieces[0]!.color = 'violet';
    expect(() => parseStudioBundle(payload)).toThrow(/初始牌面、候选块/);
  });

  it('rejects malformed pointer coordinates before they reach the renderer', () => {
    const payload = structuredClone(bundle());
    payload.takes[0]!.actions[0]!.pointerPath[0]!.x = 2;
    expect(() => parseStudioBundle(payload)).toThrow(/pointerPath/);
  });

  it('rejects a pointer sample outside its action duration', () => {
    const payload = structuredClone(bundle());
    const action = payload.takes[0]!.actions[0]!;
    action.pointerPath[action.pointerPath.length - 1]!.frameOffset = action.durationFrames + 1;
    expect(() => parseStudioBundle(payload)).toThrow(/durationFrames/);
  });

  it('rejects odd H.264 output dimensions', () => {
    const payload = structuredClone(bundle());
    payload.project.render.width = 1079;
    expect(() => parseStudioBundle(payload)).toThrow(/偶数/);
  });

  it('rejects duplicate take ids', () => {
    const payload = structuredClone(bundle());
    payload.takes.push(structuredClone(payload.takes[0]!));
    expect(() => parseStudioBundle(payload)).toThrow(/take id/);
  });
});
