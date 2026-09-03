import type {
  ColorSpaceTag,
  ContractIssue,
  MaterialMapBinding,
  MaterialPackManifest,
  MaterialRuntimeDescriptor,
  NormalYConvention,
} from './contracts.js';
import { BCS_CONTRACT_VERSION } from './contracts.js';
import { BcsHeadlessError } from './errors.js';
import { stableHash } from './stableHash.js';
import { validateAssetManifest } from './validation.js';

const UNSUPPORTED_TEXTURE_SLOTS = new Set(['height', 'opacity']);

export interface MaterialCompileInput {
  pack: MaterialPackManifest;
  maps?: Array<{
    slot: MaterialMapBinding['slot'];
    uri: string;
    contentHash: string;
    width?: number;
    height?: number;
    channels?: MaterialMapBinding['channels'];
    colorSpace?: ColorSpaceTag;
    normalY?: NormalYConvention;
    orm?: boolean;
  }>;
  uv?: MaterialRuntimeDescriptor['uv'];
  combine?: MaterialRuntimeDescriptor['combine'];
}

function issue(code: string, message: string, path: string): ContractIssue {
  return { code, severity: 'error', message, path, recoverable: true };
}

export function colorSpaceForSlot(slot: MaterialMapBinding['slot']): ColorSpaceTag {
  return slot === 'baseColor' || slot === 'emission' ? 'srgb' : 'linear';
}

export function channelsForOrmComponent(component: 'ao' | 'roughness' | 'metallic'): MaterialMapBinding['channels'] {
  if (component === 'ao') return 'r';
  if (component === 'roughness') return 'g';
  return 'b';
}

export function compileMaterialRuntime(input: MaterialCompileInput): MaterialRuntimeDescriptor {
  const packIssues = validateAssetManifest(input.pack).filter((candidate) => candidate.severity === 'error');
  if (packIssues.length > 0) {
    throw new BcsHeadlessError('MATERIAL_PACK_INVALID', 'Material pack failed validation.', {
      path: '$.pack',
      details: packIssues,
    });
  }

  const unsupportedFields: string[] = [];
  const maps: MaterialMapBinding[] = [];
  const issues: ContractIssue[] = [];

  for (const [slot, ref] of Object.entries(input.pack.appearance.textureRefs ?? {})) {
    if (!ref) continue;
    if (UNSUPPORTED_TEXTURE_SLOTS.has(slot)) {
      unsupportedFields.push(`appearance.textureRefs.${slot}`);
      continue;
    }
  }

  for (const map of input.maps ?? []) {
    const expectedSpace = colorSpaceForSlot(map.slot);
    const colorSpace = map.colorSpace ?? expectedSpace;
    if (colorSpace !== expectedSpace) {
      issues.push(issue(
        'MATERIAL_COLORSPACE_MISMATCH',
        `Map ${map.slot} must use ${expectedSpace} color space.`,
        `$.maps.${map.slot}.colorSpace`,
      ));
    }
    if (map.slot === 'normal' && (map.normalY === undefined || map.normalY === 'unspecified')) {
      issues.push(issue(
        'MATERIAL_NORMAL_Y_UNSPECIFIED',
        'Normal maps require an explicit OpenGL or DirectX Y convention.',
        '$.maps.normal.normalY',
      ));
    }
    if ((map.width !== undefined && map.width <= 0) || (map.height !== undefined && map.height <= 0)) {
      issues.push(issue('MATERIAL_MAP_SIZE_INVALID', `Map ${map.slot} has invalid dimensions.`, `$.maps.${map.slot}`));
    }
    const binding: MaterialMapBinding = {
      slot: map.slot,
      uri: map.uri,
      contentHash: map.contentHash,
      colorSpace,
      channels: map.channels ?? (map.slot === 'orm' ? 'rgb' : map.slot === 'baseColor' ? 'rgb' : 'r'),
    };
    if (map.slot === 'normal' && map.normalY && map.normalY !== 'unspecified') {
      binding.normalY = map.normalY;
    }
    maps.push(binding);
  }

  if (issues.length > 0) {
    throw new BcsHeadlessError('MATERIAL_RUNTIME_INVALID', 'Material runtime compile failed.', {
      path: '$.maps',
      details: issues,
    });
  }

  const descriptor: MaterialRuntimeDescriptor = {
    contract: 'bcs.material-runtime',
    contractVersion: BCS_CONTRACT_VERSION,
    id: input.pack.id,
    version: input.pack.version,
    contentHash: '',
    materialClass: input.pack.behavior.materialClass,
    baseColor: input.pack.appearance.baseColor,
    roughness: input.pack.appearance.roughness,
    metalness: input.pack.appearance.metalness,
    maps,
    uv: input.uv ?? { repeat: [1, 1], offset: [0, 0], rotationRadians: 0 },
    combine: input.combine ?? 'multiply-factor',
    capabilities: {
      heightDisplacement: 'unsupported',
      anisotropy: 'unsupported',
      subsurface: 'unsupported',
      complexTransmission: input.pack.appearance.transmission && input.pack.appearance.transmission > 0
        ? 'pending'
        : 'unsupported',
      materialAwareFracture: 'pending',
    },
    unsupportedFields,
    behaviorPending: true,
  };
  if (input.pack.appearance.specular !== undefined) descriptor.specular = input.pack.appearance.specular;
  if (input.pack.appearance.clearcoat !== undefined) descriptor.clearcoat = input.pack.appearance.clearcoat;
  if (input.pack.appearance.transmission !== undefined) descriptor.transmission = input.pack.appearance.transmission;
  if (input.pack.appearance.ior !== undefined) descriptor.ior = input.pack.appearance.ior;
  if (input.pack.appearance.thickness !== undefined) descriptor.thickness = input.pack.appearance.thickness;
  if (input.pack.appearance.normalStrength !== undefined) descriptor.normalStrength = input.pack.appearance.normalStrength;
  if (input.pack.appearance.emission !== undefined) descriptor.emission = input.pack.appearance.emission;

  descriptor.contentHash = input.pack.contentHash ?? `fnv1a32:${stableHash({
    id: descriptor.id,
    version: descriptor.version,
    appearance: input.pack.appearance,
    maps: descriptor.maps,
    uv: descriptor.uv,
    combine: descriptor.combine,
  }).slice(8)}`;
  return descriptor;
}

export function materialCacheKey(
  descriptor: MaterialRuntimeDescriptor,
  extras: { color?: string; opacity?: number; lookDevId?: string } = {},
): string {
  return stableHash({
    id: descriptor.id,
    version: descriptor.version,
    contentHash: descriptor.contentHash,
    maps: descriptor.maps,
    uv: descriptor.uv,
    combine: descriptor.combine,
    color: extras.color ?? null,
    opacity: extras.opacity ?? 1,
    lookDevId: extras.lookDevId ?? null,
  });
}

export function sampleOrmChannel(
  packed: { r: number; g: number; b: number },
  component: 'ao' | 'roughness' | 'metallic',
): number {
  if (component === 'ao') return packed.r;
  if (component === 'roughness') return packed.g;
  return packed.b;
}

export function combineFactorAndSample(
  factor: number,
  sample: number | undefined,
  mode: MaterialRuntimeDescriptor['combine'],
): number {
  if (sample === undefined) return factor;
  return mode === 'replace' ? sample : factor * sample;
}
