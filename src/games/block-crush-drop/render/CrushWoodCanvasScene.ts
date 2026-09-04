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
  backgroundTop: string;
  backgroundBottom: string;
  well: string;
  wellEdge: string;
  tileTop: string;
  tileBottom: string;
  tileEdge: string;
  tileHighlight: string;
  grain: string;
  hud: string;
  hudShadow: string;
  accent: string;
}

const PALETTES: Record<CrushWoodSkinId, Palette> = {
  'golden-embossed': {
    backgroundTop: '#2a1508',
    backgroundBottom: '#080402',
    well: '#130904',
    wellEdge: '#6f3b15',
    tileTop: '#e8a63d',
    tileBottom: '#8d4817',
    tileEdge: '#4b240b',
    tileHighlight: '#ffd77b',
    grain: '#6a3210',
    hud: '#f6c56c',
    hudShadow: '#321305',
    accent: '#fff0a8',
  },
  'classic-maple': {
    backgroundTop: '#f3d19c',
    backgroundBottom: '#7d421f',
    well: '#482711',
    wellEdge: '#f0c488',
    tileTop: '#e9bd7a',
    tileBottom: '#a66c37',
    tileEdge: '#6e3d1e',
    tileHighlight: '#ffe2aa',
    grain: '#8f552d',
    hud: '#fff6df',
    hudShadow: '#4a260f',
    accent: '#fff7c2',
  },
  'deep-mahogany': {
    backgroundTop: '#44150f',
    backgroundBottom: '#120305',
    well: '#160405',
    wellEdge: '#8b3527',
    tileTop: '#a8442c',
    tileBottom: '#4c130f',
    tileEdge: '#260706',
    tileHighlight: '#e98360',
    grain: '#360907',
    hud: '#ffc6a4',
    hudShadow: '#210304',
    accent: '#ffb58e',
  },
  'checker-maze': {
    backgroundTop: '#d5b77f',
    backgroundBottom: '#382617',
    well: '#21170f',
    wellEdge: '#d6b172',
    tileTop: '#d9bd86',
    tileBottom: '#704a2c',
    tileEdge: '#322116',
    tileHighlight: '#fff0c4',
    grain: '#604227',
    hud: '#fff1ca',
    hudShadow: '#24170d',
    accent: '#f7d887',
  },
};

const DESIGN_WIDTH = crushWoodCompositionProfile.designResolution.width;
const DESIGN_HEIGHT = crushWoodCompositionProfile.designResolution.height;
const PLAYFIELD = crushWoodCompositionProfile.playfield;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(left: number, right: number, progress: number): number {
  return left + (right - left) * progress;
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
  return { width: PLAYFIELD.width / columns, height: PLAYFIELD.height / rows };
}

function cellCenter(point: CrushWoodPoint, rows: number, columns: number): { x: number; y: number } {
  const cell = cellGeometry(rows, columns);
  return {
    x: PLAYFIELD.x + (point.col + 0.5) * cell.width,
    y: PLAYFIELD.y + (point.row + 0.5) * cell.height,
  };
}

function locateCell(board: CrushWoodBoard, cellId: string): CrushWoodPoint | null {
  for (const [rowIndex, row] of board.entries()) {
    const col = row.indexOf(cellId);
    if (col >= 0) return { row: rowIndex, col };
  }
  return null;
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
    const zoom = 1 + packet.feedback.cameraPunch * 0.012;
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
      context.globalAlpha = packet.feedback.exposurePulse ?? 0;
      context.fillStyle = palette.accent;
      context.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    }
    context.restore();
  }

  dispose(): void {
    // The scene owns no external GPU or media resources.
  }

  private drawBackground(payload: CrushWoodPresentationPayload, palette: Palette): void {
    const context = this.context;
    const gradient = context.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
    gradient.addColorStop(0, palette.backgroundTop);
    gradient.addColorStop(1, palette.backgroundBottom);
    context.fillStyle = gradient;
    context.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    const glow = context.createRadialGradient(DESIGN_WIDTH / 2, 130, 20, DESIGN_WIDTH / 2, 360, 720);
    glow.addColorStop(0, `${palette.tileHighlight}55`);
    glow.addColorStop(0.45, `${palette.tileTop}18`);
    glow.addColorStop(1, '#00000000');
    context.fillStyle = glow;
    context.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    context.save();
    context.globalAlpha = payload.skinId === 'classic-maple' ? 0.16 : 0.09;
    context.strokeStyle = palette.grain;
    context.lineWidth = 1;
    for (let index = 0; index < 28; index += 1) {
      const y = 18 + index * 48 + hashUnit(`background-${index}`, 17) * 22;
      context.beginPath();
      context.moveTo(-30, y);
      context.bezierCurveTo(190, y - 18, 410, y + 25, 750, y - 8);
      context.stroke();
    }
    context.restore();
  }

  private drawHeader(payload: CrushWoodPresentationPayload, palette: Palette): void {
    const context = this.context;
    if (payload.skinId === 'classic-maple') {
      drawTextWithShadow(context, 'LEVEL 29', 24, 43, 28, palette.hud, palette.hudShadow, 'left');
      return;
    }

    const visible = Math.min(5, payload.queue.length);
    const slotWidth = 58;
    const startX = DESIGN_WIDTH / 2 - ((visible - 1) * slotWidth) / 2;
    for (let index = 0; index < visible; index += 1) {
      const pieceId = payload.queue[(payload.queueIndex + index) % payload.queue.length];
      if (!pieceId) continue;
      const x = startX + index * slotWidth;
      context.save();
      context.shadowColor = '#00000088';
      context.shadowBlur = 8;
      context.shadowOffsetY = 4;
      const slot = context.createRadialGradient(x - 7, 48, 4, x, 58, 29);
      slot.addColorStop(0, palette.tileHighlight);
      slot.addColorStop(0.5, palette.tileTop);
      slot.addColorStop(1, palette.tileEdge);
      context.fillStyle = slot;
      context.beginPath();
      context.arc(x, 58, 25, 0, Math.PI * 2);
      context.fill();
      context.restore();
      this.drawMiniPiece(pieceId, x, 58, 8.2, palette, index === 0);
    }
  }

  private drawMiniPiece(pieceId: CrushWoodPieceId, centerX: number, centerY: number, size: number, palette: Palette, active: boolean): void {
    const context = this.context;
    const shape = crushWoodShape(pieceId, 0);
    const bounds = crushWoodShapeSize(shape);
    const originX = centerX - (bounds.width * size) / 2;
    const originY = centerY - (bounds.height * size) / 2;
    for (const point of shape) {
      context.fillStyle = active ? palette.accent : mixHex(palette.tileTop, palette.tileBottom, 0.2);
      roundedRectPath(context, originX + point.col * size + 0.5, originY + point.row * size + 0.5, size - 1, size - 1, 1.8);
      context.fill();
    }
  }

  private drawWell(payload: CrushWoodPresentationPayload, palette: Palette): void {
    const context = this.context;
    context.save();
    context.shadowColor = '#000000cc';
    context.shadowBlur = 18;
    context.shadowOffsetY = 8;
    roundedRectPath(context, PLAYFIELD.x - 5, PLAYFIELD.y - 5, PLAYFIELD.width + 10, PLAYFIELD.height + 10, 8);
    context.fillStyle = palette.wellEdge;
    context.fill();
    context.restore();

    roundedRectPath(context, PLAYFIELD.x, PLAYFIELD.y, PLAYFIELD.width, PLAYFIELD.height, 4);
    const well = context.createLinearGradient(0, PLAYFIELD.y, 0, PLAYFIELD.y + PLAYFIELD.height);
    well.addColorStop(0, mixHex(palette.well, '#000000', 0.08));
    well.addColorStop(1, mixHex(palette.well, '#000000', 0.45));
    context.fillStyle = well;
    context.fill();

    const rows = payload.board.length;
    const columns = payload.board[0]?.length ?? 1;
    const cell = cellGeometry(rows, columns);
    context.save();
    context.globalAlpha = 0.14;
    context.strokeStyle = palette.wellEdge;
    context.lineWidth = 0.5;
    for (let column = 1; column < columns; column += 1) {
      const x = PLAYFIELD.x + column * cell.width;
      context.beginPath();
      context.moveTo(x, PLAYFIELD.y);
      context.lineTo(x, PLAYFIELD.y + PLAYFIELD.height);
      context.stroke();
    }
    for (let row = 1; row < rows; row += 1) {
      const y = PLAYFIELD.y + row * cell.height;
      context.beginPath();
      context.moveTo(PLAYFIELD.x, y);
      context.lineTo(PLAYFIELD.x + PLAYFIELD.width, y);
      context.stroke();
    }
    context.restore();
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
          opacity = 1 - clamp01(payload.phaseProgress * 1.45);
          tileScale = 1 - clamp01(payload.phaseProgress) * 0.32;
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
        `active-${piece.pieceId}-${index}`,
        palette,
        payload.skinId,
        1,
        1.03,
        0,
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
  ): void {
    const context = this.context;
    const cell = cellGeometry(rows, columns);
    const gap = Math.max(0.65, Math.min(cell.width, cell.height) * 0.025);
    const center = cellCenter(point, rows, columns);
    const width = (cell.width - gap) * scale;
    const height = (cell.height - gap) * scale;
    const x = center.x - width / 2;
    const y = center.y - height / 2;
    const random = hashUnit(cellId, 31);
    const checker = skinId === 'checker-maze' ? ((Math.round(point.row) + point.col) & 1) * 0.24 : 0;
    const top = mixHex(palette.tileTop, '#ffffff', random * 0.08 - checker * 0.15);
    const bottom = mixHex(palette.tileBottom, '#120703', checker + random * 0.08);

    context.save();
    context.globalAlpha = opacity;
    context.shadowColor = '#000000aa';
    context.shadowBlur = Math.max(2, cell.width * 0.12);
    context.shadowOffsetX = cell.width * 0.035;
    context.shadowOffsetY = cell.height * 0.09;
    roundedRectPath(context, x, y, width, height, Math.max(2.4, cell.width * 0.105));
    const gradient = context.createLinearGradient(x, y, x + width * 0.85, y + height);
    gradient.addColorStop(0, top);
    gradient.addColorStop(0.5, palette.tileTop);
    gradient.addColorStop(1, bottom);
    context.fillStyle = gradient;
    context.fill();
    context.shadowColor = 'transparent';

    context.lineWidth = Math.max(0.8, cell.width * 0.025);
    context.strokeStyle = palette.tileEdge;
    context.stroke();

    context.save();
    roundedRectPath(context, x + 1.6, y + 1.6, width - 3.2, height - 3.2, Math.max(1.5, cell.width * 0.08));
    context.clip();
    context.globalAlpha *= 0.24;
    context.strokeStyle = palette.grain;
    context.lineWidth = 0.7;
    for (let index = 0; index < 3; index += 1) {
      const grainY = y + height * (0.25 + index * 0.24 + hashUnit(cellId, index + 101) * 0.08);
      context.beginPath();
      context.moveTo(x - 3, grainY);
      context.bezierCurveTo(x + width * 0.3, grainY - 2, x + width * 0.68, grainY + 3, x + width + 3, grainY - 1);
      context.stroke();
    }
    context.restore();

    context.globalAlpha *= 0.72;
    context.strokeStyle = palette.tileHighlight;
    context.lineWidth = Math.max(0.8, cell.width * 0.025);
    context.beginPath();
    context.moveTo(x + width * 0.16, y + height * 0.15);
    context.lineTo(x + width * 0.78, y + height * 0.15);
    context.stroke();

    if (skinId === 'golden-embossed') {
      context.globalAlpha *= 0.62;
      context.strokeStyle = mixHex(palette.tileHighlight, palette.tileEdge, 0.28);
      context.lineWidth = Math.max(0.8, cell.width * 0.032);
      context.beginPath();
      context.moveTo(center.x, y + height * 0.23);
      context.lineTo(x + width * 0.77, center.y);
      context.lineTo(center.x, y + height * 0.77);
      context.lineTo(x + width * 0.23, center.y);
      context.closePath();
      context.stroke();
    }

    if (crackProgress > 0.04) {
      context.globalAlpha = opacity * Math.min(0.95, crackProgress * 1.5);
      context.strokeStyle = palette.tileEdge;
      context.lineWidth = Math.max(1, cell.width * 0.045);
      const spread = width * (0.18 + crackProgress * 0.2);
      context.beginPath();
      context.moveTo(center.x, center.y);
      context.lineTo(center.x - spread, center.y - height * 0.35);
      context.moveTo(center.x, center.y);
      context.lineTo(center.x + spread, center.y - height * 0.22);
      context.moveTo(center.x, center.y);
      context.lineTo(center.x + spread * 0.75, center.y + height * 0.38);
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
      ? payload.phaseProgress * 0.62
      : 0.62 + payload.phaseProgress * 0.38;

    for (const cleared of payload.clearedCells) {
      const origin = cellCenter(cleared, rows, columns);
      for (let fragmentIndex = 0; fragmentIndex < 5; fragmentIndex += 1) {
        const key = `${payload.debrisSeed}:${cleared.cellId}:${fragmentIndex}`;
        const delay = hashUnit(key, 1) * 0.16;
        const progress = clamp01((globalProgress - delay) / (1 - delay));
        if (progress <= 0) continue;
        const side = hashUnit(key, 2) < 0.5 ? -1 : 1;
        const centerBias = (origin.x - DESIGN_WIDTH / 2) / DESIGN_WIDTH;
        const velocityX = side * (75 + hashUnit(key, 3) * 330) - centerBias * 120;
        const velocityY = -(190 + hashUnit(key, 4) * 500);
        const gravity = 720 + hashUnit(key, 5) * 540;
        const x = origin.x + velocityX * progress + Math.sin(progress * Math.PI * (1.5 + hashUnit(key, 6) * 2)) * 34;
        const y = origin.y + velocityY * progress + gravity * progress * progress * 0.56;
        if (x < -60 || x > DESIGN_WIDTH + 60 || y > DESIGN_HEIGHT + 80) continue;
        const rotation = (hashUnit(key, 7) - 0.5) * 9 * progress;
        const fragmentWidth = cell.width * (0.16 + hashUnit(key, 8) * 0.34);
        const fragmentHeight = cell.height * (0.09 + hashUnit(key, 9) * 0.28);
        context.save();
        context.translate(x, y);
        context.rotate(rotation);
        context.globalAlpha = (1 - clamp01((progress - 0.72) / 0.28)) * 0.96;
        context.shadowColor = '#000000aa';
        context.shadowBlur = 5;
        context.shadowOffsetY = 4;
        const fragment = context.createLinearGradient(-fragmentWidth / 2, -fragmentHeight / 2, fragmentWidth / 2, fragmentHeight / 2);
        fragment.addColorStop(0, palette.tileHighlight);
        fragment.addColorStop(0.45, palette.tileTop);
        fragment.addColorStop(1, palette.tileEdge);
        context.fillStyle = fragment;
        context.beginPath();
        context.moveTo(-fragmentWidth / 2, -fragmentHeight * 0.2);
        context.lineTo(-fragmentWidth * 0.12, -fragmentHeight / 2);
        context.lineTo(fragmentWidth / 2, -fragmentHeight * 0.12);
        context.lineTo(fragmentWidth * 0.28, fragmentHeight / 2);
        context.lineTo(-fragmentWidth * 0.42, fragmentHeight * 0.34);
        context.closePath();
        context.fill();
        context.restore();
      }
    }
  }

  private drawHud(payload: CrushWoodPresentationPayload, palette: Palette): void {
    const context = this.context;
    const seconds = Math.ceil(payload.remainingTimeMs / 1_000);
    if (payload.skinId === 'golden-embossed') {
      drawTextWithShadow(context, String(payload.score), 683, 57, 31, palette.hud, palette.hudShadow, 'right');
      return;
    }

    context.save();
    context.globalAlpha = 0.94;
    roundedRectPath(context, 535, 18, 166, 82, 18);
    const panel = context.createLinearGradient(535, 18, 701, 100);
    panel.addColorStop(0, `${palette.tileTop}dd`);
    panel.addColorStop(1, `${palette.tileBottom}ee`);
    context.fillStyle = panel;
    context.fill();
    context.strokeStyle = palette.tileHighlight;
    context.lineWidth = 2;
    context.stroke();
    context.restore();
    drawTextWithShadow(context, String(payload.score), 618, 52, 29, palette.hud, palette.hudShadow);
    drawTextWithShadow(context, `${seconds}s`, 618, 82, 17, palette.hud, palette.hudShadow);

    if (payload.scoreDelta > 0 && (payload.phase === 'crush' || payload.phase === 'collapse')) {
      const floatProgress = payload.phase === 'crush' ? payload.phaseProgress * 0.6 : 0.6 + payload.phaseProgress * 0.4;
      context.save();
      context.globalAlpha = 1 - clamp01((floatProgress - 0.55) / 0.45);
      drawTextWithShadow(context, `+${payload.scoreDelta}`, DESIGN_WIDTH / 2, 175 - floatProgress * 55, 38, palette.accent, palette.hudShadow);
      context.restore();
    }
  }

  private drawOutcome(payload: CrushWoodPresentationPayload, palette: Palette): void {
    if (payload.phase !== 'outcome') return;
    const context = this.context;
    const progress = easeInOutCubic(payload.phaseProgress);
    context.save();
    context.globalAlpha = 0.68 * progress;
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
