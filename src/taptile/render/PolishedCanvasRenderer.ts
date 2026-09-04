import type { TapTilePresentationFrame } from '../director';
import { TAPTILE_POINTER_ASSET_ID } from '../presentation/assets';
import {
  normalizeTapTileTrayBounds,
  TAPTILE_TRAY_CAPACITY,
  tapTileTraySlotRect,
} from '../trayLayout';
import { resolveTileVisual, type ResolvedTileVisual } from '../visual';
import { tapTileMaterialAppearance } from '../visual/materialAppearance';
import {
  renderTapTilePresentationFrame,
  TAPTILE_Z_BANDS,
  type CanvasRenderTrace,
  type TapTileCanvasRenderBundle,
  type TapTileCanvasRenderOptions,
} from './CanvasRenderer';

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const safeRadius = Math.min(Math.max(0, radius), Math.abs(width) / 2, Math.abs(height) / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function drawContain(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const sourceWidth = Number((image as { videoWidth?: number; naturalWidth?: number; width?: number }).videoWidth
    ?? (image as { naturalWidth?: number }).naturalWidth
    ?? (image as { width?: number }).width
    ?? width);
  const sourceHeight = Number((image as { videoHeight?: number; naturalHeight?: number; height?: number }).videoHeight
    ?? (image as { naturalHeight?: number }).naturalHeight
    ?? (image as { height?: number }).height
    ?? height);
  const scale = Math.min(width / Math.max(1, sourceWidth), height / Math.max(1, sourceHeight));
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawPolishedMaterial(
  context: CanvasRenderingContext2D,
  bundle: TapTileCanvasRenderBundle,
  visual: ResolvedTileVisual,
  width: number,
  height: number,
  elevated: boolean,
): number {
  const material = tapTileMaterialAppearance(visual.material);
  const shortest = Math.min(width, height);
  const radius = shortest * material.radiusRatio;
  const edgeDepth = Math.max(2, height * material.edgeDepthRatio);
  const left = -width / 2;
  const top = -height / 2;
  const surfaceHeight = height - edgeDepth;

  context.save();
  context.shadowColor = elevated ? material.contactShadowColor : material.shadowColor;
  context.shadowBlur = shortest * material.shadowBlurRatio * (elevated ? 1.18 : 0.72);
  context.shadowOffsetX = shortest * material.shadowOffsetXRatio;
  context.shadowOffsetY = shortest * material.shadowOffsetYRatio * (elevated ? 1.18 : 0.74);
  context.fillStyle = 'rgba(5, 12, 20, 0.08)';
  roundedRect(context, left, top, width, height, radius);
  context.fill();
  context.restore();

  context.fillStyle = material.edgeColor;
  roundedRect(context, left, top, width, height, radius);
  context.fill();

  const surface = context.createLinearGradient(left, top, width / 2, top + surfaceHeight);
  for (const [offset, color] of material.fillStops) surface.addColorStop(offset, color);
  context.fillStyle = surface;
  roundedRect(context, left, top, width, surfaceHeight, radius);
  context.fill();

  const bodyImage = visual.bodyStyle.bodyAssetId ? bundle.assets.get(visual.bodyStyle.bodyAssetId) : undefined;
  if (bodyImage) {
    context.save();
    roundedRect(context, left, top, width, surfaceHeight, radius);
    context.clip();
    context.globalAlpha *= material.textureOpacity;
    context.drawImage(bodyImage, left, top, width, surfaceHeight);
    context.restore();
  }

  context.save();
  context.lineWidth = Math.max(0.8, shortest * material.keylineWidthRatio);
  context.strokeStyle = material.keylineColor;
  roundedRect(context, left, top, width, surfaceHeight, radius);
  context.stroke();
  const inset = shortest * material.highlightInsetRatio;
  context.lineWidth = Math.max(0.75, shortest * material.highlightWidthRatio);
  context.strokeStyle = material.highlightColor;
  roundedRect(
    context,
    left + inset,
    top + inset,
    width - inset * 2,
    surfaceHeight - inset * 2,
    Math.max(0, radius - inset * 0.4),
  );
  context.stroke();
  context.restore();
  return -edgeDepth / 2;
}

function drawPolishedTile(
  context: CanvasRenderingContext2D,
  bundle: TapTileCanvasRenderBundle,
  archetypeId: string,
  role: 'flight' | 'tray',
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  rotationDeg: number,
  scale: number,
  opacity = 1,
): void {
  const visual = resolveTileVisual(bundle.project, archetypeId, bundle.project.visuals.selectedThemeId, role);
  const drawWidth = width * scale * visual.roleScale;
  const drawHeight = height * scale * visual.roleScale;
  const material = tapTileMaterialAppearance(visual.material);
  context.save();
  context.globalAlpha = opacity;
  context.translate(round(centerX), round(centerY));
  context.rotate(rotationDeg * Math.PI / 180);
  const faceOffsetY = drawPolishedMaterial(context, bundle, visual, drawWidth, drawHeight, role === 'flight');
  context.save();
  roundedRect(
    context,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight,
    Math.min(drawWidth, drawHeight) * material.radiusRatio,
  );
  context.clip();
  for (const part of visual.renderedFace.parts) {
    const partWidth = Math.abs(part.transform.scaleX) * drawWidth;
    const partHeight = Math.abs(part.transform.scaleY) * drawHeight;
    const x = (part.transform.x - 0.5) * drawWidth;
    const y = (part.transform.y - 0.5) * drawHeight + faceOffsetY;
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
      if (image) drawContain(context, image, -partWidth / 2, -partHeight / 2, partWidth, partHeight);
    }
    context.restore();
  }
  context.restore();
  context.restore();
}

function redrawTrayBase(
  context: CanvasRenderingContext2D,
  bundle: TapTileCanvasRenderBundle,
): void {
  const tray = normalizeTapTileTrayBounds(bundle.project.stage.safeAreas.tray);
  context.save();
  roundedRect(context, tray.left, tray.top, tray.width, tray.height, 36);
  context.fillStyle = 'rgba(7, 27, 64, 0.96)';
  context.fill();
  context.strokeStyle = 'rgba(130, 169, 255, 0.68)';
  context.lineWidth = 5;
  context.stroke();
  for (let index = 0; index < TAPTILE_TRAY_CAPACITY; index += 1) {
    const slot = tapTileTraySlotRect(index, tray);
    roundedRect(context, slot.left, slot.top, slot.width, slot.height, 18);
    context.fillStyle = 'rgba(3, 17, 45, 0.72)';
    context.fill();
    context.strokeStyle = 'rgba(126, 158, 210, 0.16)';
    context.lineWidth = 1.2;
    context.stroke();
  }
  context.restore();
}

function drawFlightAccent(
  context: CanvasRenderingContext2D,
  frame: TapTilePresentationFrame,
): void {
  for (const moving of frame.movingTiles) {
    const travelOpacity = Math.sin(Math.PI * moving.progress);
    if (travelOpacity <= 0.01) continue;
    context.save();
    const trail = context.createLinearGradient(moving.xPx, moving.yPx, moving.targetX, moving.targetY);
    trail.addColorStop(0, `rgba(255,255,255,${0.03 + travelOpacity * 0.12})`);
    trail.addColorStop(1, 'rgba(154,224,255,0)');
    context.strokeStyle = trail;
    context.lineWidth = 8 + travelOpacity * 10;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(moving.xPx, moving.yPx + 12);
    context.lineTo(moving.targetX, moving.targetY + 4);
    context.stroke();
    if (moving.progress > 0.72) {
      const landing = Math.max(0, Math.min(1, (moving.progress - 0.72) / 0.28));
      context.globalAlpha = (1 - landing) * 0.5;
      context.strokeStyle = '#d9f7ff';
      context.lineWidth = 4;
      context.beginPath();
      context.ellipse(moving.targetX, moving.targetY, 24 + landing * 42, 10 + landing * 18, 0, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
  }
}

function redrawPointer(
  context: CanvasRenderingContext2D,
  frame: TapTilePresentationFrame,
  bundle: TapTileCanvasRenderBundle,
): void {
  if (!frame.pointer.visible) return;
  context.save();
  context.globalAlpha = frame.pointer.opacity;
  context.translate(round(frame.pointer.xPx), round(frame.pointer.yPx));
  context.rotate(frame.pointer.rotationDeg * Math.PI / 180);
  context.scale(frame.pointer.scale, frame.pointer.scale);
  const pointerImage = bundle.assets.get(TAPTILE_POINTER_ASSET_ID);
  const pointerWidth = 235;
  const pointerHeight = pointerWidth * 360 / 280;
  if (pointerImage) {
    context.drawImage(pointerImage, -pointerWidth * 58 / 280, -pointerHeight * 19 / 360, pointerWidth, pointerHeight);
  } else {
    context.font = '132px "Segoe UI Emoji", sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'top';
    context.fillText('👆🏻', -36, -22);
  }
  context.restore();
}

/**
 * Adds the high-touch movement pass after the reference renderer. The base
 * renderer remains the gameplay/visual authority; this pass only redraws the
 * active flight and grouped tray transition above the tray backplate so the
 * moving tile never appears to enter from behind it.
 */
export function renderPolishedTapTilePresentationFrame(
  canvas: HTMLCanvasElement,
  frame: TapTilePresentationFrame,
  bundle: TapTileCanvasRenderBundle,
  options: TapTileCanvasRenderOptions = {},
): CanvasRenderTrace {
  const baseFrame = frame.movingTiles.length > 0
    ? { ...frame, movingTiles: [] }
    : frame;
  const trace = renderTapTilePresentationFrame(canvas, baseFrame, bundle, options);
  if (frame.movingTiles.length === 0 && frame.trayTiles.length === 0) return trace;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('CANVAS_2D_CONTEXT_UNAVAILABLE');
  const pixelScale = Math.max(1, Math.min(2, options.pixelScale ?? 1));
  const tray = normalizeTapTileTrayBounds(bundle.project.stage.safeAreas.tray);
  context.save();
  context.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);

  if (frame.trayTiles.length > 0) {
    // Paint over the already-resolved static tray state, then place every tile
    // at its interpolated position. This is the fixed-frame equivalent of a
    // FLIP layout animation and makes e.g. [apple, banana] + apple visibly push
    // the banana from slot 2 to slot 3.
    redrawTrayBase(context, bundle);
    for (const trayTile of frame.trayTiles) {
      const tile = bundle.level.tiles[trayTile.tileId];
      if (!tile) continue;
      const slot = tapTileTraySlotRect(trayTile.toIndex, tray);
      drawPolishedTile(
        context,
        bundle,
        tile.archetypeId,
        'tray',
        trayTile.xPx,
        trayTile.yPx,
        slot.width,
        slot.height,
        trayTile.rotationDeg,
        trayTile.scale,
        trayTile.opacity,
      );
      trace.items.push({
        band: TAPTILE_Z_BANDS.tray + 1,
        id: `tray-motion:${trayTile.tileId}`,
        bounds: { x: trayTile.xPx - slot.width / 2, y: trayTile.yPx - slot.height / 2, width: slot.width, height: slot.height },
      });
    }
  }

  drawFlightAccent(context, frame);
  for (const moving of frame.movingTiles) {
    const tile = bundle.level.tiles[moving.tileId];
    if (!tile) continue;
    drawPolishedTile(
      context,
      bundle,
      tile.archetypeId,
      'flight',
      moving.xPx,
      moving.yPx,
      tile.geometry.widthPx,
      tile.geometry.heightPx,
      moving.rotationDeg,
      moving.scale,
    );
    trace.items.push({
      band: TAPTILE_Z_BANDS.tray + 2,
      id: `moving-front:${moving.tileId}`,
      bounds: {
        x: moving.xPx - tile.geometry.widthPx * moving.scale / 2,
        y: moving.yPx - tile.geometry.heightPx * moving.scale / 2,
        width: tile.geometry.widthPx * moving.scale,
        height: tile.geometry.heightPx * moving.scale,
      },
    });
  }
  // The base pass drew the pointer before this front-layer movement pass.
  // Redraw it once so the fingertip remains visually above the picked-up tile.
  redrawPointer(context, frame, bundle);
  context.restore();
  return trace;
}
