import * as THREE from 'three';
import type { MaterialMapBinding, TextureChannel } from '../headless/contracts';
import { needsThreeJsChannelSwizzle, remapChannelsForThreeJsSlot } from '../headless/materialRuntime';
import type { RuntimeTextureSet } from './pbrMaterialFactory';

function slotTexture(set: RuntimeTextureSet, slot: MaterialMapBinding['slot'], texture: THREE.Texture): void {
  if (slot === 'baseColor') set.baseColor = texture;
  else if (slot === 'normal') set.normal = texture;
  else if (slot === 'roughness') set.roughness = texture;
  else if (slot === 'metallic') set.metallic = texture;
  else if (slot === 'ao') set.ao = texture;
  else if (slot === 'emission') set.emission = texture;
  else if (slot === 'orm') {
    set.ao = texture;
    set.roughness = texture;
    set.metallic = texture;
  }
}

export function runtimeTextureCacheKey(maps: readonly MaterialMapBinding[]): string {
  return maps.map((map) => `${map.slot}:${map.contentHash}:${map.uri}:${map.channels}`).join('|');
}

function imageSize(image: TexImageSource): { width: number; height: number } {
  if ('naturalWidth' in image && typeof image.naturalWidth === 'number') {
    return { width: image.naturalWidth, height: image.naturalHeight };
  }
  if ('width' in image && 'height' in image) {
    return { width: Number(image.width) || 0, height: Number(image.height) || 0 };
  }
  return { width: 0, height: 0 };
}

export function swizzleImageDataForThreeSlot(
  source: ImageData,
  slot: MaterialMapBinding['slot'],
  channels: TextureChannel,
): ImageData {
  if (!needsThreeJsChannelSwizzle(slot, channels)) return source;
  const output = new ImageData(source.width, source.height);
  const src = source.data;
  const dst = output.data;
  for (let index = 0; index < src.length; index += 4) {
    const remapped = remapChannelsForThreeJsSlot({
      r: src[index] ?? 0,
      g: src[index + 1] ?? 0,
      b: src[index + 2] ?? 0,
      a: src[index + 3] ?? 255,
    }, slot, channels);
    dst[index] = remapped.r;
    dst[index + 1] = remapped.g;
    dst[index + 2] = remapped.b;
    dst[index + 3] = remapped.a;
  }
  return output;
}

function swizzleTextureIfNeeded(texture: THREE.Texture, map: MaterialMapBinding): THREE.Texture {
  if (map.slot === 'orm' || !needsThreeJsChannelSwizzle(map.slot, map.channels)) return texture;
  const image = texture.image as TexImageSource | undefined;
  if (!image) return texture;
  const { width, height } = imageSize(image);
  if (width <= 0 || height <= 0) return texture;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return texture;
  context.drawImage(image as CanvasImageSource, 0, 0);
  const swizzled = swizzleImageDataForThreeSlot(
    context.getImageData(0, 0, width, height),
    map.slot,
    map.channels,
  );
  context.putImageData(swizzled, 0, 0);
  texture.dispose();
  const next = new THREE.CanvasTexture(canvas);
  next.colorSpace = map.colorSpace === 'srgb' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  next.anisotropy = 4;
  next.needsUpdate = true;
  return next;
}

export async function loadRuntimeTextureSet(maps: readonly MaterialMapBinding[]): Promise<RuntimeTextureSet> {
  if (maps.length === 0) return {};
  const loader = new THREE.TextureLoader();
  const set: RuntimeTextureSet = {};
  const loaded: THREE.Texture[] = [];
  try {
    await Promise.all(
      maps.map(async (map) => {
        const texture = swizzleTextureIfNeeded(await loader.loadAsync(map.uri), map);
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
