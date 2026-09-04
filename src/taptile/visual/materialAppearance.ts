import type { TileMaterialId } from '../stackModel';

export interface TapTileMaterialAppearance {
  id: TileMaterialId;
  radiusRatio: number;
  surfaceOffsetYRatio: number;
  edgeDepthRatio: number;
  fillStops: ReadonlyArray<readonly [offset: number, color: string]>;
  edgeColor: string;
  borderColor: string;
  /** Hairline used by the polished overlay and DOM material recipes. */
  keylineColor: string;
  keylineWidthRatio: number;
  shadowColor: string;
  contactShadowColor: string;
  shadowBlurRatio: number;
  shadowOffsetXRatio: number;
  shadowOffsetYRatio: number;
  textureOpacity: number;
  highlightInsetRatio: number;
  highlightColor: string;
  highlightWidthRatio: number;
}

export const TAPTILE_MATERIAL_APPEARANCES: Readonly<Record<TileMaterialId, TapTileMaterialAppearance>> = Object.freeze({
  porcelain: {
    id: 'porcelain',
    radiusRatio: 0.105,
    surfaceOffsetYRatio: 0,
    edgeDepthRatio: 0.034,
    fillStops: [[0, '#fffef9'], [0.44, '#f8f3e9'], [0.78, '#eee8dc'], [1, '#d6d0c5']],
    edgeColor: '#9d9b93',
    borderColor: 'rgba(48, 49, 49, 0.86)',
    keylineColor: 'rgba(24, 25, 25, 0.9)',
    keylineWidthRatio: 0.0065,
    shadowColor: 'rgba(5, 10, 19, 0.44)',
    contactShadowColor: 'rgba(3, 7, 13, 0.58)',
    shadowBlurRatio: 0.026,
    shadowOffsetXRatio: 0.018,
    shadowOffsetYRatio: 0.04,
    textureOpacity: 0.29,
    highlightInsetRatio: 0.026,
    highlightColor: 'rgba(255, 255, 255, 0.82)',
    highlightWidthRatio: 0.006,
  },
  ice: {
    id: 'ice',
    radiusRatio: 0.145,
    surfaceOffsetYRatio: 0,
    edgeDepthRatio: 0.04,
    fillStops: [[0, '#ffffff'], [0.4, '#f3f9ff'], [0.72, '#e3efff'], [1, '#c7daf8']],
    edgeColor: '#6f91c7',
    borderColor: 'rgba(55, 80, 116, 0.76)',
    keylineColor: 'rgba(36, 58, 91, 0.74)',
    keylineWidthRatio: 0.006,
    shadowColor: 'rgba(5, 22, 57, 0.43)',
    contactShadowColor: 'rgba(4, 18, 48, 0.57)',
    shadowBlurRatio: 0.03,
    shadowOffsetXRatio: 0.018,
    shadowOffsetYRatio: 0.044,
    textureOpacity: 0.1,
    highlightInsetRatio: 0.055,
    highlightColor: 'rgba(255, 255, 255, 0.9)',
    highlightWidthRatio: 0.009,
  },
  jelly: {
    id: 'jelly',
    radiusRatio: 0.14,
    surfaceOffsetYRatio: 0,
    edgeDepthRatio: 0.038,
    fillStops: [[0, 'rgba(255, 255, 255, 0.98)'], [0.42, 'rgba(229, 247, 255, 0.92)'], [0.72, 'rgba(190, 226, 250, 0.88)'], [1, 'rgba(137, 196, 235, 0.84)']],
    edgeColor: 'rgba(66, 137, 194, 0.9)',
    borderColor: 'rgba(62, 104, 139, 0.72)',
    keylineColor: 'rgba(39, 74, 105, 0.66)',
    keylineWidthRatio: 0.0055,
    shadowColor: 'rgba(4, 25, 55, 0.42)',
    contactShadowColor: 'rgba(4, 21, 48, 0.54)',
    shadowBlurRatio: 0.032,
    shadowOffsetXRatio: 0.016,
    shadowOffsetYRatio: 0.046,
    textureOpacity: 0.055,
    highlightInsetRatio: 0.045,
    highlightColor: 'rgba(255, 255, 255, 0.94)',
    highlightWidthRatio: 0.011,
  },
  paper: {
    id: 'paper',
    radiusRatio: 0.078,
    surfaceOffsetYRatio: 0,
    edgeDepthRatio: 0.024,
    fillStops: [[0, '#fffdf8'], [0.48, '#f4efe5'], [0.78, '#ece3d5'], [1, '#d8cab5']],
    edgeColor: '#a99577',
    borderColor: 'rgba(80, 68, 54, 0.72)',
    keylineColor: 'rgba(53, 44, 34, 0.78)',
    keylineWidthRatio: 0.0055,
    shadowColor: 'rgba(25, 23, 22, 0.37)',
    contactShadowColor: 'rgba(23, 19, 15, 0.5)',
    shadowBlurRatio: 0.023,
    shadowOffsetXRatio: 0.015,
    shadowOffsetYRatio: 0.034,
    textureOpacity: 0.48,
    highlightInsetRatio: 0.022,
    highlightColor: 'rgba(255, 255, 255, 0.66)',
    highlightWidthRatio: 0.0045,
  },
});

export function tapTileMaterialAppearance(material: TileMaterialId): TapTileMaterialAppearance {
  return TAPTILE_MATERIAL_APPEARANCES[material];
}
