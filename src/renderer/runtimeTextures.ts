import * as THREE from 'three';
import type { MaterialMapBinding } from '../headless/contracts';
import type { RuntimeTextureSet } from './pbrMaterialFactory';

function slotTexture(set: RuntimeTextureSet, slot: MaterialMapBinding['slot'], texture: THREE.Texture): void {
  if (slot === 'baseColor') set.baseColor = texture;
  else if (slot === 'normal') set.normal = texture;
  else if (slot === 'roughness') set.roughness = texture;
  else if (slot === 'metallic') set.metallic = texture;
  else if (slot === 'ao') set.ao = texture;
  else if (slot === 'orm') {
    set.ao = texture;
    set.roughness = texture;
    set.metallic = texture;
  }
}

export function runtimeTextureCacheKey(maps: readonly MaterialMapBinding[]): string {
  return maps.map((map) => `${map.slot}:${map.contentHash}:${map.uri}`).join('|');
}

export async function loadRuntimeTextureSet(maps: readonly MaterialMapBinding[]): Promise<RuntimeTextureSet> {
  if (maps.length === 0) return {};
  const loader = new THREE.TextureLoader();
  const set: RuntimeTextureSet = {};
  const loaded: THREE.Texture[] = [];
  try {
    await Promise.all(
      maps.map(async (map) => {
        if (map.slot === 'emission') return;
        const texture = await loader.loadAsync(map.uri);
        texture.colorSpace = map.colorSpace === 'srgb' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.anisotropy = 4;
        texture.needsUpdate = true;
        loaded.push(texture);
        slotTexture(set, map.slot, texture);
      }),
    );
  } catch (error) {
    for (const texture of loaded) texture.dispose();
    throw new Error(`PBR map failed to load: ${error instanceof Error ? error.message : String(error)}`);
  }
  return set;
}

export function disposeRuntimeTextureSet(set: RuntimeTextureSet | undefined): void {
  if (!set) return;
  const seen = new Set<THREE.Texture>();
  for (const texture of Object.values(set)) {
    if (!texture || seen.has(texture)) continue;
    seen.add(texture);
    texture.dispose();
  }
}
