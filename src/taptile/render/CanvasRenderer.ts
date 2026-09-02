import type { CompiledTapTileLevel, TapTilePresentationRole, TapTileProjectV2 } from '../project';
import type { TapTilePresentationFrame } from '../director';
import { resolveStageAssembly, resolveTileVisual, type ResolvedTileVisual } from '../visual';
import type { TapTileAssetCache } from './AssetCache';

export const TAPTILE_Z_BANDS = Object.freeze({
  base: 0,
  ambient: 10,
  board: 20,
  boardFeedback: 30,
  moving: 40,
  tray: 50,
  pointer: 60,
  matchVfx: 70,
  praiseWarning: 80,
  hud: 90,
  outro: 100,
} as const);

export interface CanvasRenderTraceItem {
  band: number;
  id: string;
  bounds: { x: number; y: number; width: number; height: number };
}

export interface CanvasRenderTrace {
  frameNumber: number;
  width: number;
  height: number;
  items: CanvasRenderTraceItem[];
}

export interface TapTileCanvasRenderBundle {
  project: TapTileProjectV2;
  level: CompiledTapTileLevel;
  assets: TapTileAssetCache;
}

function round(value: number): number {
  return Math.round(value);
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const safe = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(x + safe, y);
  context.lineTo(x + width - safe, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safe);
  context.lineTo(x + width, y + height - safe);
  context.quadraticCurveTo(x + width, y + height, x + width - safe, y + height);
  context.lineTo(x + safe, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safe);
  context.lineTo(x, y + safe);
  context.quadraticCurveTo(x, y, x + safe, y);
  context.closePath();
}

function drawCover(context: CanvasRenderingContext2D, image: CanvasImageSource, x: number, y: number, width: number, height: number): void {
  context.drawImage(image, round(x), round(y), round(width), round(height));
}

function drawTile(
  context: CanvasRenderingContext2D,
  bundle: TapTileCanvasRenderBundle,
  archetypeId: string,
  role: TapTilePresentationRole,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  rotationDeg: number,
  scale = 1,
  opacity = 1,
): ResolvedTileVisual {
  const visual = resolveTileVisual(bundle.project, archetypeId, bundle.project.visuals.selectedThemeId, role);
  const drawWidth = round(width * scale * visual.roleScale);
  const drawHeight = round(height * scale * visual.roleScale);
  context.save();
  context.globalAlpha = opacity;
  context.translate(round(centerX), round(centerY));
  context.rotate(rotationDeg * Math.PI / 180);
  context.shadowColor = 'rgba(3, 13, 29, 0.38)';
  context.shadowBlur = role === 'match-ghost' ? 26 : 14;
  context.shadowOffsetY = role === 'board' ? 9 : 5;
  roundedRect(context, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight, visual.bodyStyle.cornerRadiusPx);
  context.fillStyle = visual.bodyStyle.fill ?? '#fff7e7';
  context.fill();
  const bodyImage = visual.bodyStyle.bodyAssetId ? bundle.assets.get(visual.bodyStyle.bodyAssetId) : undefined;
  if (bodyImage) {
    context.save();
    roundedRect(context, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight, visual.bodyStyle.cornerRadiusPx);
    context.clip();
    context.globalAlpha *= 0.44;
    drawCover(context, bodyImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    context.restore();
  }
  context.shadowColor = 'transparent';
  context.lineWidth = visual.bodyStyle.borderWidthPx;
  context.strokeStyle = 'rgba(112, 119, 126, 0.7)';
  roundedRect(context, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight, visual.bodyStyle.cornerRadiusPx);
  context.stroke();

  for (const part of visual.renderedFace.parts) {
    const partWidth = Math.abs(part.transform.scaleX) * drawWidth;
    const partHeight = Math.abs(part.transform.scaleY) * drawHeight;
    const x = (part.transform.x - 0.5) * drawWidth;
    const y = (part.transform.y - 0.5) * drawHeight;
    context.save();
    context.globalAlpha *= part.transform.opacity;
    context.translate(round(x), round(y));
    context.rotate(part.transform.rotationDeg * Math.PI / 180);
    if (part.source.kind === 'glyph') {
      context.font = `${Math.max(12, round(Math.min(partWidth, partHeight) * 0.82))}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = '#17233a';
      context.fillText(part.source.value, 0, round(partHeight * 0.04));
    } else {
      const image = bundle.assets.get(part.source.assetId);
      if (image) drawCover(context, image, -partWidth / 2, -partHeight / 2, partWidth, partHeight);
    }
    context.restore();
  }
  context.restore();
  return visual;
}

function sceneColors(project: TapTileProjectV2): [string, string] {
  if (project.authoring.sceneTheme === 'sunset') return ['#76375b', '#dd784f'];
  if (project.authoring.sceneTheme === 'candy') return ['#7251a8', '#d989bd'];
  if (project.authoring.sceneTheme === 'forest') return ['#184b48', '#4e8768'];
  return ['#163b78', '#24749b'];
}

export function renderTapTilePresentationFrame(
  canvas: HTMLCanvasElement,
  frame: TapTilePresentationFrame,
  bundle: TapTileCanvasRenderBundle,
): CanvasRenderTrace {
  if (canvas.width !== bundle.project.stage.exportWidth || canvas.height !== bundle.project.stage.exportHeight) {
    canvas.width = bundle.project.stage.exportWidth;
    canvas.height = bundle.project.stage.exportHeight;
  }
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('CANVAS_2D_CONTEXT_UNAVAILABLE');
  const width = canvas.width;
  const height = canvas.height;
  const trace: CanvasRenderTrace = { frameNumber: frame.frameNumber, width, height, items: [] };
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, width, height);

  const [topColor, bottomColor] = sceneColors(bundle.project);
  const background = context.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, topColor);
  background.addColorStop(1, bottomColor);
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  trace.items.push({ band: TAPTILE_Z_BANDS.base, id: 'stage:base', bounds: { x: 0, y: 0, width, height } });

  const stage = resolveStageAssembly(bundle.project);
  for (const layer of stage.layers.filter((candidate) => candidate.role === 'ambient')) {
    context.save();
    context.globalAlpha = layer.opacity;
    if (layer.color) { context.fillStyle = layer.color; context.fillRect(0, 0, width, height); }
    if (layer.assetId) {
      const image = bundle.assets.get(layer.assetId);
      if (image) drawCover(context, image, 0, 0, width, height);
    }
    context.restore();
    trace.items.push({ band: TAPTILE_Z_BANDS.ambient, id: `stage:${layer.id}`, bounds: { x: 0, y: 0, width, height } });
  }

  context.save();
  context.translate(frame.camera.xPx, frame.camera.yPx);
  context.translate(width / 2, height / 2);
  context.scale(frame.camera.zoom, frame.camera.zoom);
  context.translate(-width / 2, -height / 2);
  const boardTiles = frame.gameState.boardIds
    .map((id) => bundle.level.tiles[id])
    .filter((tile): tile is NonNullable<typeof tile> => Boolean(tile))
    .sort((left, right) => left.geometry.layer - right.geometry.layer || left.geometry.order - right.geometry.order || left.id.localeCompare(right.id));
  for (const tile of boardTiles) {
    drawTile(context, bundle, tile.archetypeId, 'board', tile.geometry.centerXPx, tile.geometry.centerYPx, tile.geometry.widthPx, tile.geometry.heightPx, tile.geometry.rotationDeg);
    trace.items.push({ band: TAPTILE_Z_BANDS.board, id: `board:${tile.id}`, bounds: { x: round(tile.geometry.centerXPx - tile.geometry.widthPx / 2), y: round(tile.geometry.centerYPx - tile.geometry.heightPx / 2), width: round(tile.geometry.widthPx), height: round(tile.geometry.heightPx) } });
  }
  for (const layer of stage.layers.filter((candidate) => candidate.role === 'foreground' || candidate.role === 'overlay')) {
    context.save();
    context.globalAlpha = layer.opacity;
    if (layer.color) { context.fillStyle = layer.color; context.fillRect(0, 0, width, height); }
    if (layer.assetId) {
      const image = bundle.assets.get(layer.assetId);
      if (image) drawCover(context, image, 0, 0, width, height);
    }
    context.restore();
    trace.items.push({ band: TAPTILE_Z_BANDS.boardFeedback, id: `stage:${layer.id}`, bounds: { x: 0, y: 0, width, height } });
  }
  for (const moving of frame.movingTiles) {
    const tile = bundle.level.tiles[moving.tileId];
    if (!tile) continue;
    drawTile(context, bundle, tile.archetypeId, 'flight', moving.xPx, moving.yPx, tile.geometry.widthPx, tile.geometry.heightPx, moving.rotationDeg, moving.scale);
    trace.items.push({ band: TAPTILE_Z_BANDS.moving, id: `moving:${moving.tileId}`, bounds: { x: round(moving.xPx - tile.geometry.widthPx / 2), y: round(moving.yPx - tile.geometry.heightPx / 2), width: round(tile.geometry.widthPx), height: round(tile.geometry.heightPx) } });
  }
  context.restore();

  const tray = bundle.project.stage.safeAreas.tray ?? { left: 75, top: 1640, right: 1005, bottom: 1830, width: 930, height: 190 };
  const trayGap = 14;
  const slotWidth = round((tray.width - trayGap * 8) / 7);
  const slotHeight = Math.min(round(tray.height - 24), slotWidth);
  roundedRect(context, tray.left, tray.top, tray.width, tray.height, 36);
  context.fillStyle = 'rgba(7, 27, 64, 0.78)';
  context.fill();
  for (let index = 0; index < 7; index += 1) {
    const centerX = tray.left + trayGap + slotWidth / 2 + index * (slotWidth + trayGap);
    const centerY = tray.top + tray.height / 2;
    roundedRect(context, centerX - slotWidth / 2, centerY - slotHeight / 2, slotWidth, slotHeight, 18);
    context.fillStyle = 'rgba(3, 17, 45, 0.65)';
    context.fill();
    const tileId = frame.gameState.trayIds[index];
    const tile = tileId ? bundle.level.tiles[tileId] : undefined;
    if (tile) drawTile(context, bundle, tile.archetypeId, 'tray', centerX, centerY, slotWidth, slotHeight, 0);
  }
  trace.items.push({ band: TAPTILE_Z_BANDS.tray, id: 'tray', bounds: { x: tray.left, y: tray.top, width: tray.width, height: tray.height } });

  if (frame.pointer.visible) {
    context.save();
    context.translate(round(frame.pointer.xPx), round(frame.pointer.yPx));
    context.rotate(-0.25);
    context.font = `${frame.pointer.pressed ? 96 : 108}px "Segoe UI Emoji", sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('☝️', 0, 0);
    context.restore();
    trace.items.push({ band: TAPTILE_Z_BANDS.pointer, id: 'pointer', bounds: { x: round(frame.pointer.xPx - 54), y: round(frame.pointer.yPx - 54), width: 108, height: 108 } });
  }

  for (const effect of frame.effects.filter((candidate) => candidate.kind === 'match')) {
    for (const [index, tileId] of effect.tileIds.entries()) {
      const tile = bundle.level.tiles[tileId];
      if (!tile) continue;
      drawTile(context, bundle, tile.archetypeId, 'match-ghost', 410 + index * 130, tray.top + tray.height / 2, slotWidth, slotHeight, 0, 1 + effect.progress * 0.5, 1 - effect.progress);
    }
    for (const particle of effect.particles) {
      context.save();
      context.globalAlpha = particle.opacity;
      context.translate(round(particle.xPx), round(particle.yPx));
      context.rotate(particle.rotationDeg * Math.PI / 180);
      context.fillStyle = indexColor(particle.id);
      context.fillRect(-7 * particle.scale, -7 * particle.scale, 14 * particle.scale, 14 * particle.scale);
      context.restore();
    }
    trace.items.push({ band: TAPTILE_Z_BANDS.matchVfx, id: effect.id, bounds: { x: tray.left, y: tray.top - 120, width: tray.width, height: tray.height + 240 } });
  }

  const warning = frame.gameState.status === 'playing' && frame.gameState.trayIds.length === 6;
  if (warning) {
    context.save();
    context.fillStyle = 'rgba(255, 186, 35, 0.94)';
    context.font = '700 42px "Segoe UI", sans-serif';
    context.textAlign = 'center';
    context.fillText('槽位即将填满 6 / 7', width / 2, tray.top - 38);
    context.restore();
    trace.items.push({ band: TAPTILE_Z_BANDS.praiseWarning, id: 'warning', bounds: { x: 260, y: tray.top - 88, width: 560, height: 64 } });
  }

  context.save();
  context.fillStyle = '#ffffff';
  context.font = '900 72px "Segoe UI", sans-serif';
  context.textAlign = 'center';
  context.fillText('LEVEL 07', width / 2, 122);
  context.font = '900 38px "Segoe UI", sans-serif';
  context.textAlign = 'right';
  context.fillText('TAP TILE', width - 62, 118);
  context.restore();
  trace.items.push({ band: TAPTILE_Z_BANDS.hud, id: 'hud', bounds: { x: 0, y: 0, width, height: 180 } });

  if (frame.gameState.status !== 'playing') {
    context.save();
    context.fillStyle = 'rgba(5, 13, 28, 0.64)';
    context.fillRect(0, 0, width, height);
    context.fillStyle = '#ffffff';
    context.font = '900 98px "Segoe UI", sans-serif';
    context.textAlign = 'center';
    context.fillText(frame.gameState.status === 'won' ? 'CLEAR!' : 'TRY AGAIN', width / 2, height / 2);
    context.restore();
    trace.items.push({ band: TAPTILE_Z_BANDS.outro, id: `status:${frame.gameState.status}`, bounds: { x: 0, y: 0, width, height } });
  }
  context.restore();
  trace.items.sort((left, right) => left.band - right.band || left.id.localeCompare(right.id));
  return trace;
}

function indexColor(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 31);
  const colors = ['#ffdc67', '#ff72c4', '#6fe3ff', '#8dff9b'];
  return colors[Math.abs(hash) % colors.length] ?? '#ffffff';
}
