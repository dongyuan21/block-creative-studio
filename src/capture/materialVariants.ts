import type { MaterialPackManifest, MaterialRuntimeDescriptor } from '../headless/contracts';
import { compileMaterialRuntime } from '../headless/materialRuntime';

export const VARIANT_PACK_PATHS = {
  'material.stainless-steel': 'examples/headless/materials/material.stainless-steel.json',
  'material.oak-wood': 'examples/headless/materials/material.oak-wood.json',
  'material.aurora-shell': 'examples/headless/materials/material.aurora-shell.json',
} as const;

export type VariantMaterialId = keyof typeof VARIANT_PACK_PATHS;

const SLOT_FILES: Record<string, Array<{ slot: 'baseColor' | 'normal' | 'roughness' | 'metallic' | 'ao'; file: string }>> = {
  'material.stainless-steel': [
    { slot: 'baseColor', file: 'steel-basecolor.png' },
    { slot: 'roughness', file: 'steel-roughness.png' },
    { slot: 'metallic', file: 'steel-metallic.png' },
    { slot: 'normal', file: 'steel-normal.png' },
    { slot: 'ao', file: 'steel-ao.png' },
  ],
  'material.oak-wood': [
    { slot: 'baseColor', file: 'wood-basecolor.png' },
    { slot: 'roughness', file: 'wood-roughness.png' },
    { slot: 'metallic', file: 'wood-metallic.png' },
    { slot: 'normal', file: 'wood-normal.png' },
    { slot: 'ao', file: 'wood-ao.png' },
  ],
};

export function compileVariantRuntime(
  pack: MaterialPackManifest,
  mapBaseUrl = '/materials/maps',
): MaterialRuntimeDescriptor {
  const refs = pack.appearance.textureRefs ?? {};
  const files = SLOT_FILES[pack.id] ?? [];
  return compileMaterialRuntime({
    pack,
    maps: files.map((item) => {
      const ref = refs[item.slot];
      if (!ref?.contentHash) {
        throw new Error(`Missing textureRef hash for ${pack.id} ${item.slot}`);
      }
      return {
        slot: item.slot,
        uri: `${mapBaseUrl}/${item.file}`,
        contentHash: ref.contentHash,
        colorSpace: item.slot === 'baseColor' ? 'srgb' as const : 'linear' as const,
        channels: item.slot === 'baseColor' || item.slot === 'normal' ? 'rgb' as const : 'r' as const,
        ...(item.slot === 'normal' ? { normalY: 'opengl' as const } : {}),
      };
    }),
  });
}
