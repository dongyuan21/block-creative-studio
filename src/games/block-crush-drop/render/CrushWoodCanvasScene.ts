import type { PresentationPacket } from '../../../game-runtime/presentationPacket';
import { crushWoodShape, crushWoodShapeSize } from '../shapes';
import { crushWoodCompositionProfile } from '../profiles/composition';
import { crushWoodPayloadFromPacket } from '../presentation';
import type {
  CrushWoodBoard,
  CrushWoodPieceId,
  CrushWoodPoint,
  CrushWoodPresentationPayload,
  CrushWoodSkinId,
} from '../types';

interface Palette {
  outerTop: string;
  outerBottom: string;
  outerLight: string;
  outerDark: string;
  frameLight: string;
  frameMid: string;
  frameDark: string;
  wellTop: string;
  wellBottom: string;
  wellGrain: string;
  tileTop: string;
  tileBottom: string;
  tileSide: string;
  tileEdge: string;
  tileHighlight: string;
  grain: string;
  studTop: string;
  studRight: string;
  studBottom: string;
  studLeft: string;
  hud: string;
  hudShadow: string;
  accent: string;
}

const PALETTES: Record<CrushWoodSkinId, Palette> = {
  'golden-embossed': {
    outerTop: '#d0a06a',
    outerBottom: '#9b6538',
    outerLight: '#e2bd84',
    outerDark: '#71411f',
    frameLight: '#c58c52',
    frameMid: '#8d542c',
    frameDark: '#3b1808',
    wellTop: '#6d3517',
    wellBottom: '#3b1708',
    wellGrain: '#9e5c2d',
    tileTop: '#f5dc94',
    tileBottom: '#d5a152',
    tileSide: '#b66f25',
    tileEdge: '#8d4f17',
    tileHighlight: '#fff2bc',
    grain: '#bb7c32',
    studTop: '#fff0b1',
    studRight: '#e7b55d',
    studBottom: '#b96f24',
    studLeft: '#d99536',
    hud: '#f7d98f',
    hudShadow: '#4b210c',
    accent: '#fff0a8',
  },
  'classic-maple': {
    outerTop: '#e6c493',
    outerBottom: '#b27943',
    outerLight: '#f4dab2',
    outerDark: '#79502c',
    frameLight: '#d7aa70',
    frameMid: '#9f6537',
    frameDark: '#4a260f',
    wellTop: '#7a401f',
    wellBottom: '#3f1f0e',
    wellGrain: '#aa6737',
    tileTop: '#efd09a',
    tileBottom: '#c2874d',
    tileSide: '#9b5d2e',
    tileEdge: '#75401d',
    tileHighlight: '#ffedc4',
    grain: '#a86635',
    studTop: '#fff1c9',
    studRight: '#dda96d',
    studBottom: '#9e5f30',
    studLeft: '#c48048',
    hud: '#fff6df',
    hudShadow: '#4a260f',
    accent: '#fff7c2',
  },
  'deep-mahogany': {
    outerTop: '#6f281c',
    outerBottom: '#2b0908',
    outerLight: '#a94c36',
    outerDark: '#260605',
    frameLight: '#8b3527',
    frameMid: '#5e1e17',
    frameDark: '#1d0304',
    wellTop: '#3a0d0b',
    wellBottom: '#140304',
    wellGrain: '#6f2119',
    tileTop: '#bd6042',
    tileBottom: '#6b2018',
    tileSide: '#4b100d',
    tileEdge: '#260706',
    tileHighlight: '#ed9b78',
    grain: '#54110e',
    studTop: '#f0a181',
    studRight: '#b14a35',
    studBottom: '#4b100d',
    studLeft: '#7e281f',
    hud: '#ffc6a4',
    hudShadow: '#210304',
    accent: '#ffb58e',
  },
  'checker-maze': {
    outerTop: '#d7bd8f',
    outerBottom: '#806243',
    outerLight: '#ead5aa',
    outerDark: '#473220',
    frameLight: '#c4a36e',
    frameMid: '#806142',
    frameDark: '#302015',
    wellTop: '#4c3927',
    wellBottom: '#20160f',
    wellGrain: '#75573b',
    tileTop: '#e9d4a5',
    tileBottom: '#a98458',
    tileSide: '#765233',
    tileEdge: '#3c291a',
    tileHighlight: '#fff2ca',
    grain: '#80613d',
    studTop: '#fff0c5',
    studRight: '#d2b079',
    studBottom: '#725033',
    studLeft: '#a17d52',
    hud: '#fff1ca',
    hudShadow: '#24170d',
    accent: '#f7d887',
  },
};

const DESIGN_WIDTH = crushWoodCompositionProfile.designResolution.width;
const DESIGN_HEIGHT = crushWoodCompositionProfile.designResolution.height;
const GRID = crushWoodCompositionProfile.playfield;
const WELL = { x: 7, y: 113, width: 706, height: 1160 } as const;
const HEADER_HEIGHT = 113;
const PREVIEW_SLOT_COUNT = 5;
const PREVIEW_SLOT = { x: 47, y: 10, width: 116, height: 96, gap: 11 } as const;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(left: number, right: number, progress: number): number {
  return left + (right - left) * progress;
}

function smoothstep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function easeOutBack(value: number): number {
  const t = clamp01(value);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

function easeInOutCubic(value: number): number {
  const t = clamp01(value);
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}

function hashUnit(value: string, salt: number): number {
  let hash = 0x811c9dc5 ^ salt;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 0xffff_ffff;
}

function mixHex(left: string, right: string, amount: number): string {
  const t = clamp01(amount);
  const parse = (value: string, offset: number) => Number.parseInt(value.slice(offset, offset + 2), 16);
  const channel = (offset: number) => Math.round(lerp(parse(left, offset), parse(right, offset), t))
    .toString(16)
    .padStart(2, '0');
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function drawPolygon(
  context: CanvasRenderingContext2D,
  points: ReadonlyArray<{ x: number; y: number }>,
  fill: string,
): void {
  if (points.length === 0) return;
  context.beginPath();
  context.moveTo(points[0]!.x, points[0]!.y);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index]!.x, points[index]!.y);
  }
  context.closePath();
  context.fillStyle = fill;
  context.fill();
}

function drawTextWithShadow(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  shadow: string,
  align: CanvasTextAlign = 'center',
): void {
  context.save();
  context.textAlign = align;
  context.textBaseline = 'middle';
  context.font = `900 ${size}px ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif`;
  context.lineJoin = 'round';
  context.lineWidth = Math.max(2, size * 0.13);
  context.strokeStyle = shadow;
  context.strokeText(text, x, y);
  context.fillStyle = color;
  context.fillText(text, x, y);
  context.restore();
}

function cellGeometry(rows: number, columns: number): { width: number; height: number } {
  return { width: GRID.width / columns, height: GRID.height / rows };
}

function cellCenter(point: CrushWoodPoint, rows: number, columns: number): { x: number; y: number } {
  const cell = cellGeometry(rows, columns);
  return {
    x: GRID.x + (point.col + 0.5) * cell.width,
    y: GRID.y + (point.row + 0.5) * cell.height,
  };
}

function previewRotation(pieceId: CrushWoodPieceId, slotIndex: number, batchIndex: number): 0 | 1 | 2 | 3 {
  const value = Math.floor(hashUnit(`${pieceId}:${slotIndex}:${batchIndex}`, 91) * 4);
  return value === 0 || value === 1 || value === 2 ? value : 3;
}

export class CrushWoodCanvasScene {
  private readonly context: CanvasRenderingContext2D;
  private logicalWidth: number = DESIGN_WIDTH;
  private logicalHeight: number = DESIGN_HEIGHT;
  private pixelRatio = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Crush Wood renderer requires a 2D canvas context.');
    this.context = context;
  }

  resize(width: number, height: number, pixelRatio = 1): void {
    this.logicalWidth = Math.max(1, width);
    this.logicalHeight = Math.max(1, height);
    this.pixelRatio = Math.max(0.5, Math.min(3, pixelRatio));
    this.canvas.width = Math.max(1, Math.round(this.logicalWidth * this.pixelRatio));
    this.canvas.height = Math.max(1, Math.round(this.logicalHeight * this.pixelRatio));
    this.canvas.style.width = `${this.logicalWidth}px`;
    this.canvas.style.height = `${this.logicalHeight}px`;
  }

  async warmup(packet: PresentationPacket): Promise<void> {
    this.renderAt(packet);
    await Promise.resolve();
  }

  renderAt(packet: PresentationPacket): void {
    const payload = crushWoodPayloadFromPacket(packet);
    const context = this.context;
    context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    context.clearRect(0, 0, this.logicalWidth, this.logicalHeight);
    context.save();
    const scale = Math.min(this.logicalWidth / DESIGN_WIDTH, this.logicalHeight / DESIGN_HEIGHT);
    const offsetX = (this.logicalWidth - DESIGN_WIDTH * scale) / 2;
    const offsetY = (this.logicalHeight - DESIGN_HEIGHT * scale) / 2;
    context.translate(offsetX, offsetY);
    context.scale(scale, scale);

    const shake = packet.feedback.screenShake ?? { x: 0, y: 0 };
    const zoom = 1 + packet.feedback.cameraPunch * 0.008;
    context.translate(DESIGN_WIDTH / 2 + shake.x, DESIGN_HEIGHT / 2 + shake.y);
    context.scale(zoom, zoom);
    context.translate(-DESIGN_WIDTH / 2, -DESIGN_HEIGHT / 2);

    const palette = PALETTES[payload.skinId];
    this.drawBackground(payload, palette);
    this.drawHeader(payload, palette);
    this.drawWell(payload, palette);
    this.drawBoard(payload, palette);
    this.drawActivePiece(payload, palette);
    this.drawFragments(payload, palette);
    this.drawHud(payload, palette);
    this.drawOutcome(payload, palette);

    if ((packet.feedback.exposurePulse ?? 0) > 0) {
      context.globalCompositeOperation = 'screen';
      context.globalAlpha = (packet.feedback.exposurePulse ?? 0) * 0.42;
      context.fillStyle = palette.accent;
      context.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    }
    context.restore();
  }

  dispose(): void {
    // The scene owns no external GPU or media resources.
  }

  hitTestCell(clientX: number, clientY: number, rows: number, columns: number): CrushWoodPoint | null {
    const bounds = this.canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0 || rows <= 0 || columns <= 0) return null;
    const localX = ((clientX - bounds.left) / bounds.width) * this.logicalWidth;
    const localY = ((clientY - bounds.top) / bounds.height) * this.logicalHeight;
    const scale = Math.min(this.logicalWidth / DESIGN_WIDTH, this.logicalHeight / DESIGN_HEIGHT);
    if (scale <= 0) return null;
    const offsetX = (this.logicalWidth - DESIGN_WIDTH * scale) / 2;
    const offsetY = (this.logicalHeight - DESIGN_HEIGHT * scale) / 2;
    const x = (localX - offsetX) / scale;
    const y = (localY - offsetY) / scale;
    if (x < GRID.x || y < GRID.y || x >= GRID.x + GRID.width || y >= GRID.y + GRID.height) return null;
    const col = Math.floor((x - GRID.x) / (GRID.width / columns));
    const row = Math.floor((y - GRID.y) / (GRID.height / rows));
    if (row < 0 || col < 0 || row >= rows || col >= columns) return null;
    return { row, col };
  }

  private drawBackground(payload: CrushWoodPresentationPayload, palette: Palette): void {
    const context = this.context;
    const gradient = context.createLinearGradient(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    gradient.addColorStop(0, palette.outerTop);
    gradient.addColorStop(0.48, mixHex(palette.outerTop, palette.outerBottom, 0.35));
    gradient.addColorStop(1, palette.outerBottom);
    context.fillStyle = gradient;
    context.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    context.save();
    context.globalAlpha = payload.skinId === 'golden-embossed' ? 0.23 : 0.16;
    context.lineCap = 'round';
    for (let index = 0; index < 82; index += 1) {
      const key = `outer-grain:${payload.skinId}:${index}`;
      const x = index * (DESIGN_WIDTH / 81) + (hashUnit(key, 2) - 0.5) * 5;
      const sway = 2 + hashUnit(key, 3) * 8;
      context.strokeStyle = hashUnit(key, 4) > 0.48 ? palette.outerLight : palette.outerDark;
      context.lineWidth = 0.35 + hashUnit(key, 5) * 1.15;
      context.beginPath();
      context.moveTo(x, -12);
      context.bezierCurveTo(x - sway, DESIGN_HEIGHT * 0.28, x + sway, DESIGN_HEIGHT * 0.72, x - sway * 0.35, DESIGN_HEIGHT + 12);
      context.stroke();
    }
    context.restore();

    const headerGlow = context.createLinearGradient(0, 0, 0, HEADER_HEIGHT);
    headerGlow.addColorStop(0, '#ffffff18');
    headerGlow.addColorStop(0.7, '#ffffff00');
    headerGlow.addColorStop(1, '#00000020');
    context.fillStyle = headerGlow;
    context.fillRect(0, 0, DESIGN_WIDTH, HEADER_HEIGHT);
  }

  private drawHeader(payload: CrushWoodPresentationPayload, palette: Palette): void {
    const context = this.context;
    const batchSlot = payload.queueIndex % PREVIEW_SLOT_COUNT;
    const batchStart = payload.queueIndex - batchSlot;
    const activeLeavesSlot = payload.phase === 'fall' ? 1 : 0;
    const consumed = Math.min(PREVIEW_SLOT_COUNT, batchSlot + activeLeavesSlot);

    for (let slotIndex = 0; slotIndex < PREVIEW_SLOT_COUNT; slotIndex += 1) {
      const x = PREVIEW_SLOT.x + slotIndex * (PREVIEW_SLOT.width + PREVIEW_SLOT.gap);
      const y = PREVIEW_SLOT.y;
      context.save();
      context.shadowColor = '#3a1609a8';
      context.shadowBlur = 8;
      context.shadowOffsetY = 4;
      roundedRectPath(context, x, y, PREVIEW_SLOT.width, PREVIEW_SLOT.height, 7);
      const cavity = context.createLinearGradient(x, y, x, y + PREVIEW_SLOT.height);
      cavity.addColorStop(0, mixHex(palette.outerDark, '#000000', 0.24));
      cavity.addColorStop(0.16, mixHex(palette.outerBottom, '#000000', 0.05));
      cavity.addColorStop(1, mixHex(palette.outerTop, '#ffffff', 0.08));
      context.fillStyle = cavity;
      context.fill();
      context.restore();

      context.save();
      roundedRectPath(context, x + 1.4, y + 1.4, PREVIEW_SLOT.width - 2.8, PREVIEW_SLOT.height - 2.8, 6);
      context.strokeStyle = `${palette.outerLight}80`;
      context.lineWidth = 1.3;
      context.stroke();
      context.beginPath();
      context.moveTo(x + 9, y + PREVIEW_SLOT.height - 2.5);
      context.lineTo(x + PREVIEW_SLOT.width - 9, y + PREVIEW_SLOT.height - 2.5);
      context.strokeStyle = `${palette.outerLight}b0`;
      context.lineWidth = 1.6;
      context.stroke();
      context.restore();

      if (slotIndex < consumed || payload.queue.length === 0) continue;
      const queueIndex = (batchStart + slotIndex) % payload.queue.length;
      const pieceId = payload.queue[queueIndex];
      if (!pieceId) continue;
      this.drawMiniPiece(
        pieceId,
        previewRotation(pieceId, slotIndex, Math.floor(batchStart / PREVIEW_SLOT_COUNT)),
        x + PREVIEW_SLOT.width / 2,
        y + PREVIEW_SLOT.height / 2 + 3,
        14.2,
        palette,
      );
    }
  }

  private drawMiniPiece(
    pieceId: CrushWoodPieceId,
    rotation: 0 | 1 | 2 | 3,
    centerX: number,
    centerY: number,
    size: number,
    palette: Palette,
  ): void {
    const context = this.context;
    const shape = crushWoodShape(pieceId, rotation);
    const bounds = crushWoodShapeSize(shape);
    const originX = centerX - (bounds.width * size) / 2;
    const originY = centerY - (bounds.height * size) / 2;
    const depth = 2.8;
    for (const point of shape) {
      const x = originX + point.col * size;
      const y = originY + point.row * size;
      context.save();
      context.shadowColor = '#3f1809a8';
      context.shadowBlur = 4;
      context.shadowOffsetY = 3;
      drawPolygon(context, [
        { x: x + size - 0.8, y: y + 0.8 },
        { x: x + size + depth, y: y + depth },
        { x: x + size + depth, y: y + size + depth },
        { x: x + size - 0.8, y: y + size - 0.8 },
      ], palette.tileSide);
      drawPolygon(context, [
        { x: x + 0.8, y: y + size - 0.8 },
        { x: x + size - 0.8, y: y + size - 0.8 },
        { x: x + size + depth, y: y + size + depth },
        { x: x + depth, y: y + size + depth },
      ], mixHex(palette.tileSide, palette.tileEdge, 0.28));
      context.fillStyle = palette.tileTop;
      context.fillRect(x + 0.5, y + 0.5, size - 1, size - 1);
      context.strokeStyle = palette.tileEdge;
      context.lineWidth = 0.65;
      context.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
      const cx = x + size / 2;
      const cy = y + size / 2;
      const dx = size * 0.28;
      const dy = size * 0.2;
      drawPolygon(context, [{ x: cx, y: cy }, { x: cx - dx, y: cy }, { x: cx, y: cy - dy }, { x: cx + dx, y: cy }], palette.studTop);
      drawPolygon(context, [{ x: cx, y: cy }, { x: cx + dx, y: cy }, { x: cx, y: cy + dy }], palette.studRight);
      drawPolygon(context, [{ x: cx, y: cy }, { x: cx, y: cy + dy }, { x: cx - dx, y: cy }], palette.studBottom);
      context.restore();
    }
  }

  private drawWell(payload: CrushWoodPresentationPayload, palette: Palette): void {
    const context = this.context;
    context.save();
    context.shadowColor = '#241006cc';
    context.shadowBlur = 12;
    context.shadowOffsetY = 4;
    roundedRectPath(context, WELL.x, WELL.y, WELL.width, WELL.height, 5);
    context.fillStyle = palette.frameDark;
    context.fill();
    context.restore();

    const inner = { x: WELL.x + 8, y: WELL.y + 5, width: WELL.width - 16, height: WELL.height - 12 };
    roundedRectPath(context, inner.x, inner.y, inner.width, inner.height, 2.5);
    const well = context.createLinearGradient(inner.x, inner.y, inner.x + inner.width, inner.y + inner.height);
    well.addColorStop(0, palette.wellTop);
    well.addColorStop(0.52, mixHex(palette.wellTop, palette.wellBottom, 0.32));
    well.addColorStop(1, palette.wellBottom);
    context.fillStyle = well;
    context.fill();

    context.save();
    roundedRectPath(context, inner.x, inner.y, inner.width, inner.height, 2.5);
    context.clip();
    context.globalAlpha = payload.skinId === 'golden-embossed' ? 0.34 : 0.2;
    for (let index = 0; index < 74; index += 1) {
      const key = `well-grain:${payload.skinId}:${index}`;
      const x = inner.x + index * (inner.width / 73) + (hashUnit(key, 1) - 0.5) * 5;
      const sway = 1 + hashUnit(key, 2) * 7;
      context.strokeStyle = hashUnit(key, 3) > 0.52 ? palette.wellGrain : mixHex(palette.wellBottom, '#000000', 0.18);
      context.lineWidth = 0.3 + hashUnit(key, 4) * 1.25;
      context.beginPath();
      context.moveTo(x, inner.y - 8);
      context.bezierCurveTo(x - sway, inner.y + inner.height * 0.28, x + sway, inner.y + inner.height * 0.72, x - sway * 0.4, inner.y + inner.height + 8);
      context.stroke();
    }
    const vignette = context.createRadialGradient(
      inner.x + inner.width / 2,
      inner.y + inner.height * 0.45,
      inner.width * 0.08,
      inner.x + inner.width / 2,
      inner.y + inner.height * 0.45,
      inner.height * 0.74,
    );
    vignette.addColorStop(0, '#ffffff06');
    vignette.addColorStop(0.74, '#00000004');
    vignette.addColorStop(1, '#00000044');
    context.fillStyle = vignette;
    context.fillRect(inner.x, inner.y, inner.width, inner.height);
    context.restore();

    const topRail = context.createLinearGradient(0, WELL.y - 5, 0, WELL.y + 10);
    topRail.addColorStop(0, palette.frameLight);
    topRail.addColorStop(0.45, palette.frameMid);
    topRail.addColorStop(1, palette.frameDark);
    context.beginPath();
    context.moveTo(WELL.x, WELL.y - 5);
    context.lineTo(WELL.x + WELL.width, WELL.y - 5);
    context.lineTo(WELL.x + WELL.width - 8, WELL.y + 7);
    context.lineTo(WELL.x + 8, WELL.y + 7);
    context.closePath();
    context.fillStyle = topRail;
    context.fill();

    const leftRail = context.createLinearGradient(WELL.x - 2, 0, WELL.x + 12, 0);
    leftRail.addColorStop(0, palette.frameLight);
    leftRail.addColorStop(0.46, palette.frameMid);
    leftRail.addColorStop(1, palette.frameDark);
    context.fillStyle = leftRail;
    context.fillRect(WELL.x - 2, WELL.y, 10, WELL.height);
    const rightRail = context.createLinearGradient(WELL.x + WELL.width - 10, 0, WELL.x + WELL.width + 2, 0);
    rightRail.addColorStop(0, palette.frameDark);
    rightRail.addColorStop(0.54, palette.frameMid);
    rightRail.addColorStop(1, palette.frameLight);
    context.fillStyle = rightRail;
    context.fillRect(WELL.x + WELL.width - 8, WELL.y, 10, WELL.height);

    const bottomRail = context.createLinearGradient(0, WELL.y + WELL.height - 11, 0, WELL.y + WELL.height + 3);
    bottomRail.addColorStop(0, palette.frameDark);
    bottomRail.addColorStop(0.46, palette.frameMid);
    bottomRail.addColorStop(1, palette.frameLight);
    context.fillStyle = bottomRail;
    context.fillRect(WELL.x, WELL.y + WELL.height - 8, WELL.width, 11);
  }

  private drawBoard(payload: CrushWoodPresentationPayload, palette: Palette): void {
    const rows = payload.board.length;
    const columns = payload.board[0]?.length ?? 1;
    const movement = new Map(payload.collapseMoves.map((move) => [move.cellId, move]));
    const collapseProgress = payload.phase === 'collapse' ? easeOutBack(payload.phaseProgress) : 1;

    for (const [rowIndex, row] of payload.board.entries()) {
      for (const [colIndex, cellId] of row.entries()) {
        if (cellId === null) continue;
        let drawRow = rowIndex;
        if (payload.phase === 'collapse') {
          const move = movement.get(cellId);
          if (move) drawRow = lerp(move.from.row, move.to.row, collapseProgress);
        }
        let opacity = 1;
        let tileScale = 1;
        const clearRow = payload.phase === 'crush' && payload.clearedRows.includes(rowIndex);
        if (clearRow) {
          opacity = 1 - smoothstep(payload.phaseProgress * 1.35);
          tileScale = 1 - smoothstep(payload.phaseProgress) * 0.22;
        }
        this.drawTile(
          { row: drawRow, col: colIndex },
          rows,
          columns,
          cellId,
          palette,
          payload.skinId,
          opacity,
          tileScale,
          clearRow ? payload.phaseProgress : 0,
          false,
        );
      }
    }
  }

  private drawActivePiece(payload: CrushWoodPresentationPayload, palette: Palette): void {
    const piece = payload.activePiece;
    if (!piece) return;
    const rows = payload.board.length;
    const columns = payload.board[0]?.length ?? 1;
    for (const [index, offset] of piece.shape.entries()) {
      this.drawTile(
        { row: piece.row + offset.row, col: piece.column + offset.col },
        rows,
        columns,
        `active-${payload.actionIndex}-${piece.pieceId}-${index}`,
        palette,
        payload.skinId,
        1,
        1.015,
        0,
        true,
      );
    }
  }

  private drawTile(
    point: CrushWoodPoint,
    rows: number,
    columns: number,
    cellId: string,
    palette: Palette,
    skinId: CrushWoodSkinId,
    opacity: number,
    scale: number,
    crackProgress: number,
    floating: boolean,
  ): void {
    const context = this.context;
    const cell = cellGeometry(rows, columns);
    const gap = Math.max(0.45, Math.min(cell.width, cell.height) * 0.015);
    const center = cellCenter(point, rows, columns);
    const width = (cell.width - gap) * scale;
    const height = (cell.height - gap) * scale;
    const x = center.x - width / 2;
    const y = center.y - height / 2;
    const random = hashUnit(cellId, 31);
    const checker = skinId === 'checker-maze' ? ((Math.round(point.row) + point.col) & 1) * 0.34 : 0;
    const faceTop = mixHex(palette.tileTop, '#ffffff', random * 0.07 - checker * 0.14);
    const faceBottom = mixHex(palette.tileBottom, palette.tileEdge, checker * 0.34 + random * 0.05);
    const depth = floating ? Math.max(3, cell.width * 0.1) : Math.max(0.9, cell.width * 0.035);

    context.save();
    context.globalAlpha = opacity;
    if (floating) {
      context.shadowColor = '#2d1007b8';
      context.shadowBlur = Math.max(4, cell.width * 0.18);
      context.shadowOffsetX = cell.width * 0.04;
      context.shadowOffsetY = cell.height * 0.12;
    }

    drawPolygon(context, [
      { x: x + width, y },
      { x: x + width + depth, y: y + depth },
      { x: x + width + depth, y: y + height + depth },
      { x: x + width, y: y + height },
    ], palette.tileSide);
    drawPolygon(context, [
      { x, y: y + height },
      { x: x + width, y: y + height },
      { x: x + width + depth, y: y + height + depth },
      { x: x + depth, y: y + height + depth },
    ], mixHex(palette.tileSide, palette.tileEdge, 0.23));

    const face = context.createLinearGradient(x, y, x + width * 0.82, y + height);
    face.addColorStop(0, mixHex(faceTop, palette.tileHighlight, 0.18));
    face.addColorStop(0.56, faceTop);
    face.addColorStop(1, faceBottom);
    context.fillStyle = face;
    context.fillRect(x, y, width, height);
    context.shadowColor = 'transparent';

    context.strokeStyle = palette.tileEdge;
    context.lineWidth = Math.max(0.55, cell.width * 0.018);
    context.strokeRect(x + 0.2, y + 0.2, width - 0.4, height - 0.4);

    context.save();
    context.beginPath();
    context.rect(x + 1, y + 1, Math.max(1, width - 2), Math.max(1, height - 2));
    context.clip();
    context.globalAlpha *= 0.24;
    context.lineCap = 'round';
    for (let index = 0; index < 4; index += 1) {
      const grainX = x + width * (0.16 + index * 0.23 + (hashUnit(cellId, index + 101) - 0.5) * 0.09);
      context.strokeStyle = index % 2 === 0 ? palette.grain : palette.tileHighlight;
      context.lineWidth = 0.35 + hashUnit(cellId, index + 201) * 0.45;
      context.beginPath();
      context.moveTo(grainX, y - 2);
      context.bezierCurveTo(grainX - 1.5, y + height * 0.34, grainX + 1.2, y + height * 0.7, grainX - 0.4, y + height + 2);
      context.stroke();
    }
    context.restore();

    context.globalAlpha = opacity * 0.75;
    context.strokeStyle = palette.tileHighlight;
    context.lineWidth = Math.max(0.45, cell.width * 0.014);
    context.beginPath();
    context.moveTo(x + 1.2, y + 1.2);
    context.lineTo(x + width - 1.6, y + 1.2);
    context.moveTo(x + 1.2, y + 1.2);
    context.lineTo(x + 1.2, y + height - 1.6);
    context.stroke();

    const studX = center.x;
    const studY = center.y - height * 0.01;
    const studWidth = width * 0.25;
    const studHeight = height * 0.17;
    context.globalAlpha = opacity * 0.98;
    drawPolygon(context, [
      { x: studX, y: studY },
      { x: studX - studWidth, y: studY },
      { x: studX, y: studY - studHeight },
      { x: studX + studWidth, y: studY },
    ], palette.studTop);
    drawPolygon(context, [
      { x: studX, y: studY },
      { x: studX + studWidth, y: studY },
      { x: studX, y: studY + studHeight },
    ], palette.studRight);
    drawPolygon(context, [
      { x: studX, y: studY },
      { x: studX, y: studY + studHeight },
      { x: studX - studWidth, y: studY },
    ], palette.studBottom);
    drawPolygon(context, [
      { x: studX, y: studY },
      { x: studX - studWidth, y: studY },
      { x: studX, y: studY - studHeight },
    ], palette.studLeft);

    if (crackProgress > 0.025) {
      context.globalAlpha = opacity * Math.min(1, crackProgress * 1.8);
      context.strokeStyle = palette.tileEdge;
      context.lineWidth = Math.max(0.8, cell.width * 0.036);
      const spread = width * (0.14 + crackProgress * 0.28);
      context.beginPath();
      context.moveTo(center.x, center.y);
      context.lineTo(center.x - spread, center.y - height * 0.34);
      context.moveTo(center.x, center.y);
      context.lineTo(center.x + spread, center.y - height * 0.2);
      context.moveTo(center.x, center.y);
      context.lineTo(center.x + spread * 0.72, center.y + height * 0.36);
      context.stroke();
    }
    context.restore();
  }

  private drawFragments(payload: CrushWoodPresentationPayload, palette: Palette): void {
    if (payload.clearedCells.length === 0 || (payload.phase !== 'crush' && payload.phase !== 'collapse')) return;
    const context = this.context;
    const rows = payload.placedBoard.length;
    const columns = payload.placedBoard[0]?.length ?? 1;
    const cell = cellGeometry(rows, columns);
    const globalProgress = payload.phase === 'crush'
      ? payload.phaseProgress * 0.66
      : 0.66 + payload.phaseProgress * 0.34;
    const fragmentsPerCell = payload.clearedRows.length > 1 ? 11 : 9;

    for (const cleared of payload.clearedCells) {
      const origin = cellCenter(cleared, rows, columns);
      const normalizedX = (origin.x - DESIGN_WIDTH / 2) / (GRID.width / 2);
      for (let fragmentIndex = 0; fragmentIndex < fragmentsPerCell; fragmentIndex += 1) {
        const key = `${payload.debrisSeed}:${cleared.cellId}:${fragmentIndex}`;
        const radial = Math.abs(normalizedX);
        const delay = radial * 0.18 + hashUnit(key, 1) * 0.1;
        const progress = clamp01((globalProgress - delay) / Math.max(0.01, 1 - delay));
        if (progress <= 0) continue;

        const randomSide = hashUnit(key, 2) < 0.5 ? -1 : 1;
        const side = Math.abs(normalizedX) > 0.08 ? Math.sign(normalizedX) : randomSide;
        const inward = hashUnit(key, 3) < 0.22;
        const horizontalDirection = inward ? -side : side;
        const horizontalDistance = 45 + hashUnit(key, 4) * (inward ? 190 : 390);
        const sweep = smoothstep(progress);
        const arch = Math.sin(progress * Math.PI);
        const x = origin.x
          + horizontalDirection * horizontalDistance * sweep
          + Math.sin(progress * Math.PI * (1.2 + hashUnit(key, 5) * 2.8)) * (8 + hashUnit(key, 6) * 24);
        const lift = 75 + hashUnit(key, 7) * 260;
        const fall = 170 + hashUnit(key, 8) * 520;
        const y = origin.y - lift * arch + fall * progress * progress;
        if (x < -80 || x > DESIGN_WIDTH + 80 || y < -80 || y > DESIGN_HEIGHT + 120) continue;

        const fadeStart = 0.82 + hashUnit(key, 9) * 0.11;
        const alpha = 1 - clamp01((progress - fadeStart) / Math.max(0.01, 1 - fadeStart));
        const rotation = (hashUnit(key, 10) - 0.5) * 13 * progress;
        const fragmentWidth = cell.width * (0.12 + hashUnit(key, 11) * 0.5);
        const fragmentHeight = cell.height * (0.08 + hashUnit(key, 12) * 0.38);
        const lightFace = hashUnit(key, 13) > 0.26;

        context.save();
        context.translate(x, y);
        context.rotate(rotation);
        context.globalAlpha = alpha * 0.98;
        context.shadowColor = '#32140680';
        context.shadowBlur = 2 + hashUnit(key, 14) * 5;
        context.shadowOffsetY = 2 + hashUnit(key, 15) * 4;
        const fragment = context.createLinearGradient(
          -fragmentWidth / 2,
          -fragmentHeight / 2,
          fragmentWidth / 2,
          fragmentHeight / 2,
        );
        fragment.addColorStop(0, lightFace ? palette.tileHighlight : palette.tileSide);
        fragment.addColorStop(0.48, lightFace ? palette.tileTop : palette.tileBottom);
        fragment.addColorStop(1, palette.tileEdge);
        context.fillStyle = fragment;
        context.beginPath();
        context.moveTo(-fragmentWidth / 2, -fragmentHeight * 0.14);
        context.lineTo(-fragmentWidth * (0.18 + hashUnit(key, 16) * 0.2), -fragmentHeight / 2);
        context.lineTo(fragmentWidth / 2, -fragmentHeight * (0.05 + hashUnit(key, 17) * 0.16));
        context.lineTo(fragmentWidth * (0.18 + hashUnit(key, 18) * 0.22), fragmentHeight / 2);
        context.lineTo(-fragmentWidth * (0.28 + hashUnit(key, 19) * 0.2), fragmentHeight * 0.34);
        context.closePath();
        context.fill();
        context.restore();
      }
    }

    context.save();
    context.globalCompositeOperation = 'screen';
    context.globalAlpha = (1 - smoothstep(Math.max(0, globalProgress - 0.42) / 0.58)) * 0.14;
    const flash = context.createRadialGradient(DESIGN_WIDTH / 2, GRID.y + 220, 4, DESIGN_WIDTH / 2, GRID.y + 220, 280);
    flash.addColorStop(0, palette.accent);
    flash.addColorStop(0.45, `${palette.tileTop}88`);
    flash.addColorStop(1, '#ffffff00');
    context.fillStyle = flash;
    context.fillRect(0, HEADER_HEIGHT, DESIGN_WIDTH, DESIGN_HEIGHT - HEADER_HEIGHT);
    context.restore();
  }

  private drawHud(payload: CrushWoodPresentationPayload, palette: Palette): void {
    if (payload.skinId === 'golden-embossed') return;
    const context = this.context;
    const seconds = Math.ceil(payload.remainingTimeMs / 1_000);
    drawTextWithShadow(context, `LEVEL ${payload.actionIndex + 29}`, 18, 24, 17, palette.hud, palette.hudShadow, 'left');
    drawTextWithShadow(context, String(payload.score), DESIGN_WIDTH - 18, 24, 20, palette.hud, palette.hudShadow, 'right');
    drawTextWithShadow(context, `${seconds}s`, DESIGN_WIDTH - 18, 50, 12, palette.hud, palette.hudShadow, 'right');

    if (payload.scoreDelta > 0 && (payload.phase === 'crush' || payload.phase === 'collapse')) {
      const floatProgress = payload.phase === 'crush' ? payload.phaseProgress * 0.65 : 0.65 + payload.phaseProgress * 0.35;
      context.save();
      context.globalAlpha = 1 - clamp01((floatProgress - 0.58) / 0.42);
      drawTextWithShadow(context, `+${payload.scoreDelta}`, DESIGN_WIDTH / 2, 164 - floatProgress * 48, 30, palette.accent, palette.hudShadow);
      context.restore();
    }
  }

  private drawOutcome(payload: CrushWoodPresentationPayload, palette: Palette): void {
    if (payload.phase !== 'outcome') return;
    const context = this.context;
    const progress = easeInOutCubic(payload.phaseProgress);
    context.save();
    context.globalAlpha = 0.66 * progress;
    context.fillStyle = '#000000';
    context.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    context.restore();

    const scale = 0.72 + easeOutBack(progress) * 0.28;
    context.save();
    context.translate(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);
    context.scale(scale, scale);
    const title = payload.status === 'won' ? 'WOOD CRUSHED!' : 'TRY AGAIN';
    drawTextWithShadow(context, title, 0, -28, 64, palette.accent, palette.hudShadow);
    drawTextWithShadow(context, `${payload.score} POINTS`, 0, 48, 31, palette.hud, palette.hudShadow);
    context.restore();
  }
}
