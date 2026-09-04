import { describe, expect, it } from 'vitest';
import { compileTapTileTake, evaluateTapTileFrame } from '../src/taptile/director';
import {
  applyTapAction,
  compileTapTileLevel,
  createInitialTapTileGameState,
  type TapTileAction,
} from '../src/taptile/gameplay';
import { createTapTileTake } from '../src/taptile/gameplay/take';
import { createDefaultTapTileProject, type TapTileTakeAction } from '../src/taptile/project';
import { tapTileTraySlotCenter } from '../src/taptile/trayLayout';
import { TAPTILE_MATERIAL_APPEARANCES } from '../src/taptile/visual/materialAppearance';

function makeGroupedInsertionTake() {
  const project = createDefaultTapTileProject('free');
  const archetypes = Object.values(project.visuals.archetypes);
  const apple = archetypes.find((candidate) => candidate.matchKey === 'bear')!;
  const banana = archetypes.find((candidate) => candidate.matchKey === 'gift')!;
  project.level.tileInstances = [
    { id: 'apple-1', archetypeId: apple.id, geometry: { centerXPx: 250, centerYPx: 1140, widthPx: 170, heightPx: 170, rotationDeg: -4, layer: 0, order: 0 }, authoring: { editorLocked: false } },
    { id: 'banana-1', archetypeId: banana.id, geometry: { centerXPx: 540, centerYPx: 1240, widthPx: 170, heightPx: 170, rotationDeg: 3, layer: 0, order: 1 }, authoring: { editorLocked: false } },
    { id: 'apple-2', archetypeId: apple.id, geometry: { centerXPx: 820, centerYPx: 1100, widthPx: 170, heightPx: 170, rotationDeg: 5, layer: 0, order: 2 }, authoring: { editorLocked: false } },
  ];
  project.level.blockerOverrides = { forced: [], ignored: [] };
  const level = compileTapTileLevel(project);
  let state = createInitialTapTileGameState(level);
  const actions: TapTileTakeAction[] = [];
  for (const [index, tileId] of ['apple-1', 'banana-1', 'apple-2'].entries()) {
    const action: TapTileAction = { id: `motion-${index}`, type: 'tap', actor: 'script', tileId };
    const transition = applyTapAction(level, state, action);
    expect(transition.accepted).toBe(true);
    state = transition.after;
    actions.push({ ...action, startedAtFrame: index * 12, durationFrames: 3 });
  }
  expect(state.trayIds).toEqual(['apple-1', 'apple-2', 'banana-1']);
  const take = createTapTileTake(level, actions, state, {
    id: 'grouped-insertion-take',
    name: 'Grouped insertion fixture',
    createdAt: '1970-01-01T00:00:00.000Z',
  });
  const compiled = compileTapTileTake(
    level,
    take,
    project.director.profiles['human-natural']!,
    { seed: 29 },
  );
  return { project, compiled };
}

describe('TapTile movement and material polish', () => {
  it('animates an existing tray tile from slot two to slot three when a matching tile is grouped before it', () => {
    const { compiled } = makeGroupedInsertionTake();
    const action = compiled.actions[2]!;
    expect(action.transition.trayBefore).toEqual(['apple-1', 'banana-1']);
    expect(action.transition.trayAfterInsert).toEqual(['apple-1', 'apple-2', 'banana-1']);

    const frameNumber = Math.floor((action.timing.trayReorderStartFrame + action.timing.trayReorderEndFrame) / 2);
    const frame = evaluateTapTileFrame(compiled, frameNumber);
    const banana = frame.trayTiles.find((tile) => tile.tileId === 'banana-1');
    expect(banana).toMatchObject({ fromIndex: 1, toIndex: 2, phase: 'shifting' });
    const from = tapTileTraySlotCenter(1);
    const to = tapTileTraySlotCenter(2);
    expect(banana!.xPx).toBeGreaterThan(from.xPx);
    expect(banana!.xPx).toBeLessThan(to.xPx);
    expect(banana!.scale).toBeLessThan(1);
  });

  it('uses a lifted bezier flight and approaches the tray from its viewer-facing side', () => {
    const { compiled } = makeGroupedInsertionTake();
    const action = compiled.actions[2]!;
    const frameNumber = Math.round(action.timing.flightStartFrame
      + (action.timing.flightEndFrame - action.timing.flightStartFrame) * 0.8);
    const moving = evaluateTapTileFrame(compiled, frameNumber).movingTiles
      .find((tile) => tile.tileId === 'apple-2');
    expect(moving).toBeDefined();
    expect(moving!.targetX).toBe(tapTileTraySlotCenter(1).xPx);
    expect(moving!.targetY).toBe(tapTileTraySlotCenter(1).yPx);
    expect(moving!.liftPx).toBeGreaterThan(0);
    expect(moving!.yPx).toBeGreaterThanOrEqual(moving!.targetY - 4);
    expect(moving!.scale).toBeGreaterThan(0.86);
  });

  it('keeps four materially distinct bodies with a fine dark keyline and compact contact shadow', () => {
    const materials = Object.values(TAPTILE_MATERIAL_APPEARANCES);
    expect(materials).toHaveLength(4);
    expect(new Set(materials.map((material) => material.fillStops.map((stop) => stop[1]).join('|'))).size).toBe(4);
    for (const material of materials) {
      expect(material.keylineWidthRatio).toBeGreaterThan(0);
      expect(material.keylineWidthRatio).toBeLessThan(0.01);
      expect(material.contactShadowColor).not.toBe(material.shadowColor);
      expect(material.shadowOffsetYRatio).toBeGreaterThan(material.shadowOffsetXRatio);
    }
    expect(TAPTILE_MATERIAL_APPEARANCES.porcelain.borderColor).toContain('0.86');
  });
});
