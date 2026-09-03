export type MaterialRuntimeReadiness = 'idle' | 'loading' | 'ready' | 'error' | 'stale';

export interface MaterialRuntimeStatus {
  state: MaterialRuntimeReadiness;
  generation: number;
  resourceKey: string;
  descriptorKey: string;
  error: string | null;
  showingPrevious: boolean;
}

export const IDLE_MATERIAL_RUNTIME_STATUS: MaterialRuntimeStatus = {
  state: 'idle',
  generation: 0,
  resourceKey: '',
  descriptorKey: '',
  error: null,
  showingPrevious: false,
};

/** Formal 3D export may proceed only after the requested descriptor has committed. */
export function materialRuntimeBlocksExport(status: MaterialRuntimeStatus): boolean {
  return status.state !== 'ready';
}
