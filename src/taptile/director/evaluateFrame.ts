import type { TapTileGameState } from '../gameplay';
import { tapTileTraySlotCenter } from '../trayLayout';
import { easeProgress, frameProgress, lerp } from './easing';
import { seededSigned, seededUnit } from './seededNoise';
import type {
  CompiledDirectorAction,
  CompiledTapTileTake,
  PresentationEffect,
  PresentationMovingTile,
  TapTilePresentationFrame,
} from './types';

function cloneState(state: TapTileGameState): TapTileGameState {
  return {
    status: state.status,
    turn: state.turn,
    boardIds: [...state.boardIds],
    trayIds: [...state.trayIds],
    clearedIds: [...state.clearedIds],
    activeBlockerCount: { ...state.activeBlockerCount },
  };
}

function trayPoint(index: number): { xPx: number; yPx: number } {
  return tapTileTraySlotCenter(index);
}

function movingTile(compiled: CompiledTapTileTake, action: CompiledDirectorAction, frame: number): PresentationMovingTile | null {
  const { timing } = action;
  if (frame < timing.flightStartFrame || frame > timing.flightEndFrame) return null;
  const tile = compiled.level.tiles[action.tileId];
  if (!tile) return null;
  const raw = frameProgress(frame, timing.flightStartFrame, timing.flightEndFrame);
  const progress = easeProgress(raw, compiled.profile.tileFlight.easing);
  const target = trayPoint(action.transition.insertedIndex ?? action.transition.trayAfterInsert.indexOf(action.tileId));
  const arc = Math.sin(Math.PI * progress) * compiled.profile.tileFlight.arcHeightPx;
  return {
    tileId: action.tileId,
    xPx: lerp(tile.geometry.centerXPx, target.xPx, progress),
    yPx: lerp(tile.geometry.centerYPx, target.yPx, progress) - arc,
    rotationDeg: tile.geometry.rotationDeg * (1 - progress) + seededSigned(compiled.seed, action.index, 1) * 5 * Math.sin(Math.PI * progress),
    scale: lerp(1, 0.82, progress),
    progress,
    actionIndex: action.index,
  };
}

function presentationState(compiled: CompiledTapTileTake, frame: number): TapTileGameState {
  let state = cloneState(compiled.initialState);
  for (const action of compiled.actions) {
    if (frame >= action.timing.matchLogicVisibleFrame) {
      state = cloneState(action.transition.after);
      continue;
    }
    if (frame < action.timing.actionStartFrame) break;
    state = cloneState(action.transition.before);
    if (frame >= action.timing.flightStartFrame) {
      state.boardIds = state.boardIds.filter((id) => id !== action.tileId);
    }
    if (frame >= action.timing.flightEndFrame) {
      state.trayIds = [...action.transition.trayAfterInsert];
      state.turn = action.transition.after.turn;
    }
    break;
  }
  return state;
}

function matchEffect(compiled: CompiledTapTileTake, action: CompiledDirectorAction, frame: number): PresentationEffect | null {
  if (action.transition.matchedTileIds.length === 0) return null;
  const { matchStartFrame, matchVfxEndFrame } = action.timing;
  if (frame < matchStartFrame || frame > matchVfxEndFrame) return null;
  const progress = frameProgress(frame, matchStartFrame, matchVfxEndFrame);
  const slotIndexes = action.transition.matchedTileIds
    .map((tileId) => action.transition.trayAfterInsert.indexOf(tileId))
    .filter((index) => index >= 0);
  const slotCenters = slotIndexes.map((index) => trayPoint(index));
  const burstProgress = Math.max(0, Math.min(1, (progress - 0.16) / 0.84));
  const particles = slotCenters.flatMap((center, tileIndex) => Array.from({ length: 10 }, (_, shardIndex) => {
    const noiseIndex = tileIndex * 20 + shardIndex;
    const angle = seededUnit(compiled.seed + action.index * 101, tileIndex, shardIndex) * Math.PI * 2;
    const travel = 34 + seededUnit(compiled.seed, action.index, noiseIndex + 31) * 118;
    const radius = travel * burstProgress;
    const gravity = burstProgress ** 2 * (28 + seededUnit(compiled.seed, action.index, noiseIndex + 71) * 62);
    const fadeIn = Math.min(1, burstProgress * 10);
    return {
      id: `${action.actionId}:particle:${tileIndex}:${shardIndex}`,
      xPx: center.xPx + Math.cos(angle) * radius,
      yPx: center.yPx + Math.sin(angle) * radius + gravity,
      rotationDeg: seededSigned(compiled.seed, action.index, noiseIndex + 80) * 260 * burstProgress,
      scale: 0.45 + seededUnit(compiled.seed, action.index, noiseIndex + 120) * 0.9,
      opacity: fadeIn * Math.max(0, 1 - burstProgress),
      shape: shardIndex % 5 === 0 ? 'spark' as const : 'ceramic-shard' as const,
      tone: noiseIndex % 3,
    };
  }));
  const binding = compiled.profile.matchPresentation.particles ?? compiled.profile.matchPresentation.shatter;
  return {
    id: `${action.actionId}:match`,
    kind: 'match',
    progress,
    tileIds: [...action.transition.matchedTileIds],
    implementation: binding?.implementation ?? 'web-procedural',
    presetId: binding?.presetId ?? 'default-match',
    slotIndexes,
    particles,
  };
}

function semanticEffects(compiled: CompiledTapTileTake, frame: number): PresentationEffect[] {
  return compiled.events.flatMap<PresentationEffect>((entry): PresentationEffect[] => {
    if (frame < entry.frame || frame > entry.endFrame || entry.event.type === 'match.resolved') return [];
    const progress = frameProgress(frame, entry.frame, entry.endFrame);
    if (entry.event.type === 'tap.accepted' || entry.event.type === 'tap.rejected') {
      return [{
        id: entry.id,
        kind: 'click' as const,
        progress,
        tileIds: [entry.event.tileId],
        implementation: 'web-procedural' as const,
        presetId: entry.event.type === 'tap.accepted' ? 'click-ring' : 'rejected-ring',
        particles: [],
      }];
    }
    if (entry.event.type === 'tray.warning') {
      return [{ id: entry.id, kind: 'warning' as const, progress, tileIds: [], implementation: 'static-overlay' as const, presetId: 'tray-warning', particles: [] }];
    }
    if (entry.event.type === 'game.won') {
      return [{ id: entry.id, kind: 'win' as const, progress, tileIds: [], implementation: 'static-overlay' as const, presetId: 'game-win', particles: [] }];
    }
    if (entry.event.type === 'game.lost') {
      return [{ id: entry.id, kind: 'loss' as const, progress, tileIds: [], implementation: 'static-overlay' as const, presetId: 'game-loss', particles: [] }];
    }
    return [];
  });
}

export function evaluateTapTileFrame(compiled: CompiledTapTileTake, requestedFrame: number): TapTilePresentationFrame {
  const frameNumber = Math.max(0, Math.min(compiled.totalFrames - 1, Math.floor(requestedFrame)));
  const gameState = presentationState(compiled, frameNumber);
  const movingTiles = compiled.actions
    .map((action) => movingTile(compiled, action, frameNumber))
    .filter((tile): tile is PresentationMovingTile => tile !== null);
  const effects = [...compiled.actions
    .map((action) => matchEffect(compiled, action, frameNumber))
    .filter((effect): effect is PresentationEffect => effect !== null), ...semanticEffects(compiled, frameNumber)];
  const pointerAction = [...compiled.actions].reverse().find((action) => frameNumber >= action.timing.actionStartFrame && frameNumber <= action.timing.flightStartFrame + action.effectiveTiming.pressFrames);
  const pointerTile = pointerAction ? compiled.level.tiles[pointerAction.tileId] : undefined;
  let pointer = { visible: false, xPx: 540, yPx: 960, pressed: false } as TapTilePresentationFrame['pointer'];
  if (pointerAction && pointerTile) {
    const targetX = pointerTile.geometry.centerXPx;
    const targetY = pointerTile.geometry.centerYPx;
    const startX = targetX - compiled.profile.pointer.leadDistancePx;
    const startY = targetY + compiled.profile.pointer.leadDistancePx * 0.7;
    const travel = easeProgress(
      frameProgress(frameNumber, pointerAction.timing.actionStartFrame, pointerAction.timing.pointerArriveFrame),
      compiled.profile.pointer.easing,
    );
    pointer = {
      visible: true,
      xPx: lerp(startX, targetX, travel),
      yPx: lerp(startY, targetY, travel),
      pressed: frameNumber >= pointerAction.timing.pointerArriveFrame && frameNumber <= pointerAction.timing.pressFrame,
      actionIndex: pointerAction.index,
    };
  }
  const activeActionIndexes = compiled.actions
    .filter((action) => frameNumber >= action.timing.actionStartFrame && frameNumber <= action.timing.actionVisualEndFrame)
    .map((action) => action.index);
  const activeEventIds = compiled.events
    .filter((event) => frameNumber >= event.frame && frameNumber <= event.endFrame)
    .map((event) => event.id);
  const impact = effects.reduce((maximum, effect) => Math.max(maximum, 1 - effect.progress), 0);
  const cameraIntensity = compiled.profile.camera.shakePx * impact;
  return {
    frameNumber,
    totalFrames: compiled.totalFrames,
    progress: compiled.totalFrames <= 1 ? 1 : frameNumber / (compiled.totalFrames - 1),
    gameState,
    pointer,
    movingTiles,
    effects,
    camera: {
      xPx: seededSigned(compiled.seed, frameNumber, 501) * cameraIntensity,
      yPx: seededSigned(compiled.seed, frameNumber, 502) * cameraIntensity,
      zoom: 1 + compiled.profile.camera.zoomImpact * impact,
    },
    activeActionIndexes,
    activeEventIds,
  };
}
