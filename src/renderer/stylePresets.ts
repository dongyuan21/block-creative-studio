import type {
  CameraPresetId,
  FxPresetId,
  GeometryPresetId,
  GeometryStyle,
  LightingPresetId,
  MaterialPresetId,
  StyleSpec,
} from '../domain/types';

export interface NamedPreset<T extends string> {
  id: T;
  label: string;
  description: string;
}

export const GEOMETRY_PRESETS: Record<GeometryPresetId, GeometryStyle> = {
  'soft-cube': { id: 'soft-cube', depth: 0.44, bevel: 0.14, gap: 0.07 },
  'premium-beveled': { id: 'premium-beveled', depth: 0.58, bevel: 0.1, gap: 0.055 },
  'candy-rounded': { id: 'candy-rounded', depth: 0.52, bevel: 0.2, gap: 0.08 },
};

export const GEOMETRY_OPTIONS: Array<NamedPreset<GeometryPresetId>> = [
  { id: 'soft-cube', label: '柔和方块', description: '圆润、清爽，适合标准试玩。' },
  { id: 'premium-beveled', label: '高级倒角', description: '更厚、更利落，强化 3D 体积。' },
  { id: 'candy-rounded', label: '糖果圆角', description: '更强圆角与高光，适合树脂风格。' },
];

export const MATERIAL_OPTIONS: Array<NamedPreset<MaterialPresetId>> = [
  { id: 'glossy-plastic', label: '亮面塑料', description: '稳定、清晰，适合高频变体。' },
  { id: 'candy-resin', label: '糖果树脂', description: '半透明涂层与柔和内部衰减。' },
  { id: 'crystal-glass', label: '水晶玻璃', description: '高透射、锐利高光和虹彩。' },
];

export const LIGHTING_OPTIONS: Array<NamedPreset<LightingPresetId>> = [
  { id: 'clean-studio', label: '清洁棚拍', description: '中性商业光，材质识别最稳定。' },
  { id: 'soft-candy', label: '柔和糖果', description: '暖主光、冷补光、粉色轮廓。' },
  { id: 'neon-contrast', label: '霓虹高对比', description: '冷暖对撞，适合爆发型画面。' },
];

export const CAMERA_OPTIONS: Array<NamedPreset<CameraPresetId>> = [
  { id: 'flat-gameplay', label: '正视玩法', description: '规则最清楚，接近标准试玩。' },
  { id: 'premium-perspective', label: '高级微透视', description: '轻俯拍，厚度表现更明显。' },
  { id: 'dynamic-clear', label: '动态消除', description: '消除时推近并增强镜头冲击。' },
];

export const FX_OPTIONS: Array<NamedPreset<FxPresetId>> = [
  { id: 'clean-pop', label: '清爽碎裂', description: '少量三维碎片，信息干净。' },
  { id: 'crystal-shatter', label: '水晶爆裂', description: '更多碎片与高光粒子。' },
  { id: 'energy-burst', label: '能量爆发', description: '加强次级粒子与冲击波。' },
];

export const DEFAULT_STYLE: StyleSpec = {
  geometry: { ...GEOMETRY_PRESETS['premium-beveled'] },
  material: 'candy-resin',
  lighting: 'soft-candy',
  camera: 'premium-perspective',
  fx: 'crystal-shatter',
  background: '#07142d',
  showPointer: true,
};

export function withGeometryPreset(style: StyleSpec, id: GeometryPresetId): StyleSpec {
  return { ...style, geometry: { ...GEOMETRY_PRESETS[id] } };
}

export const GEOMETRY_DEFAULTS = GEOMETRY_PRESETS;
