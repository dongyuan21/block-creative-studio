import type { PresentationFrame, StyleSpec } from '../domain/types';

export type RuntimeAssetType = 'geometry' | 'material' | 'fracture' | 'particle' | 'background';

/** Stable seam for phase 2. Phase 1 only resolves provider="builtin" assets. */
export interface AssetRef {
  provider: 'builtin' | 'external';
  type: RuntimeAssetType;
  id: string;
  version: string;
  uri?: string;
}

export interface GeometryAsset {
  id: string;
  dispose(): void;
}

export interface RuntimeEffect {
  seek(progress: number): void;
  dispose(): void;
}

export interface GeometryProvider {
  resolve(ref: AssetRef): Promise<GeometryAsset>;
}

export interface EffectProvider {
  create(ref: AssetRef, context: { seed: number }): Promise<RuntimeEffect>;
}

export interface RendererBackend {
  readonly canvas: HTMLCanvasElement;
  resize(width: number, height: number, pixelRatio?: number): void;
  render(frame: PresentationFrame, style: StyleSpec): Promise<void> | void;
  dispose(): void;
}
