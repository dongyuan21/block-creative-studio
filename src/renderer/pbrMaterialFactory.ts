import * as THREE from 'three';
import type { DiagnosticViewId, MaterialRuntimeDescriptor } from '../headless/contracts';
import { combineFactorAndSample } from '../headless/materialRuntime';
import type { TileColor } from '../domain/types';
import { TILE_COLOR_HEX } from './materialPresets';

export interface RuntimeTextureSet {
  baseColor?: THREE.Texture;
  normal?: THREE.Texture;
  roughness?: THREE.Texture;
  metallic?: THREE.Texture;
  ao?: THREE.Texture;
}

function applyUv(texture: THREE.Texture, descriptor: MaterialRuntimeDescriptor): void {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(descriptor.uv.repeat[0], descriptor.uv.repeat[1]);
  texture.offset.set(descriptor.uv.offset[0], descriptor.uv.offset[1]);
  texture.rotation = descriptor.uv.rotationRadians;
  texture.needsUpdate = true;
}

function assignMaps(
  material: THREE.MeshPhysicalMaterial,
  textures: RuntimeTextureSet | undefined,
  descriptor: MaterialRuntimeDescriptor,
  mode: 'beauty' | 'albedo' | 'data' = 'beauty',
): void {
  if (!textures) return;
  if (mode === 'albedo') {
    if (textures.baseColor) {
      material.map = textures.baseColor;
      applyUv(textures.baseColor, descriptor);
    }
    return;
  }
  if (mode === 'data') return;
  if (textures.baseColor) {
    material.map = textures.baseColor;
    applyUv(textures.baseColor, descriptor);
  }
  if (textures.normal) {
    material.normalMap = textures.normal;
    applyUv(textures.normal, descriptor);
  }
  if (textures.roughness) {
    material.roughnessMap = textures.roughness;
    applyUv(textures.roughness, descriptor);
  }
  if (textures.metallic) {
    material.metalnessMap = textures.metallic;
    applyUv(textures.metallic, descriptor);
  }
  if (textures.ao) {
    material.aoMap = textures.ao;
    applyUv(textures.ao, descriptor);
  }
}

export function createPbrTileMaterial(options: {
  descriptor: MaterialRuntimeDescriptor;
  color: TileColor;
  opacity?: number;
  environmentIntensity?: number;
  textures?: RuntimeTextureSet;
  diagnosticView?: DiagnosticViewId;
}): THREE.MeshPhysicalMaterial {
  const opacity = options.opacity ?? 1;
  const ghosted = opacity < 0.99;
  const tile = new THREE.Color(TILE_COLOR_HEX[options.color]);
  const packColor = new THREE.Color(options.descriptor.baseColor);
  const color = options.descriptor.combine === 'replace'
    ? packColor.clone()
    : tile.clone().multiply(packColor);
  const roughness = combineFactorAndSample(options.descriptor.roughness, undefined, options.descriptor.combine);
  const metalness = combineFactorAndSample(options.descriptor.metalness, undefined, options.descriptor.combine);
  const diagnostic = options.diagnosticView ?? 'beauty';

  if (diagnostic === 'albedo') {
    const material = new THREE.MeshPhysicalMaterial({
      color,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0,
      emissive: 0x000000,
      transparent: ghosted,
      opacity,
    });
    assignMaps(material, options.textures, options.descriptor, 'albedo');
    return material;
  }
  if (diagnostic === 'roughness' || diagnostic === 'metalness') {
    const value = diagnostic === 'roughness' ? roughness : metalness;
    const dataMap = diagnostic === 'roughness' ? options.textures?.roughness : options.textures?.metallic;
    const gray = dataMap ? new THREE.Color(1, 1, 1) : new THREE.Color(value, value, value);
    const material = new THREE.MeshPhysicalMaterial({
      color: gray,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0,
    });
    if (dataMap) {
      material.map = dataMap;
      applyUv(dataMap, options.descriptor);
    }
    return material;
  }
  if (diagnostic === 'emission' || diagnostic === 'world-normal') {
    const emission = options.descriptor.emission ?? 0;
    return new THREE.MeshPhysicalMaterial({
      color: diagnostic === 'emission' ? new THREE.Color(emission, emission, emission) : color,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0,
      emissive: diagnostic === 'emission' ? color.clone().multiplyScalar(Math.max(0.05, emission)) : 0x000000,
      flatShading: diagnostic === 'world-normal',
    });
  }
  if (diagnostic === 'highlight-clip' || diagnostic === 'bloom-contribution') {
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness,
      metalness,
      envMapIntensity: 0.2,
      emissive: diagnostic === 'bloom-contribution' ? color.clone().multiplyScalar(0.15) : 0x000000,
    });
  }

  const material = new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness,
    transparent: ghosted,
    opacity,
    depthWrite: opacity >= 0.85,
    envMapIntensity: Math.max(0, options.environmentIntensity ?? 1),
    clearcoat: options.descriptor.clearcoat ?? 0,
    transmission: ghosted ? 0 : options.descriptor.transmission ?? 0,
    ior: options.descriptor.ior ?? 1.5,
    thickness: options.descriptor.thickness ?? 0,
    emissive: color.clone().multiplyScalar(options.descriptor.emission ?? 0),
  });
  if (options.descriptor.normalStrength !== undefined) {
    const yFlip = options.descriptor.maps.find((map) => map.slot === 'normal')?.normalY === 'directx' ? -1 : 1;
    material.normalScale = new THREE.Vector2(
      options.descriptor.normalStrength,
      options.descriptor.normalStrength * yFlip,
    );
  }
  assignMaps(material, options.textures, options.descriptor);
  if (options.textures?.normal) {
    const y = options.descriptor.maps.find((map) => map.slot === 'normal')?.normalY;
    if (y === 'directx') material.normalScale.y *= -1;
  }
  return material;
}
