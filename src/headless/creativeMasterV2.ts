import type { AssetRef, OutputSpec } from './contracts.js';

export const CREATIVE_MASTER_V2_CONTRACT = 'bcs.creative-master-v2' as const;
export const CREATIVE_MASTER_V2_CONTRACT_VERSION = '2.0.0' as const;
export const PLAN_SCHEMA_VERSION_V2 = '2.0.0' as const;

export interface CreativeMasterV2GameRef {
  id: string;
  moduleVersion: string;
  rulesetId: string;
  rulesetVersion: string;
}

export interface CreativeMasterV2 {
  contract: typeof CREATIVE_MASTER_V2_CONTRACT;
  contractVersion: typeof CREATIVE_MASTER_V2_CONTRACT_VERSION;
  id: string;
  game: CreativeMasterV2GameRef;
  renderContractId: string;
  renderContractVersion: string;
  compositionProfileId?: string;
  replay: {
    takeId: string;
    semanticHash: string;
    frameHash?: string;
    fps: number;
    totalFrames: number;
  };
  layoutProfileRef: AssetRef;
  cameraProfileRef: AssetRef;
  baseOutput: OutputSpec;
}

export type AnyCreativeMaster = import('./contracts.js').CreativeMaster | CreativeMasterV2;

export function isCreativeMasterV2(value: AnyCreativeMaster): value is CreativeMasterV2 {
  return value.contract === CREATIVE_MASTER_V2_CONTRACT;
}
