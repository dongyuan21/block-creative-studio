export type MaterialRuntimeReadiness = 'idle' | 'loading' | 'ready' | 'error';

export interface MaterialRuntimeStatus {
  state: MaterialRuntimeReadiness;
  generation: number;
  resourceKey: string;
  descriptorKey: string;
  error: string | null;
}

export const IDLE_MATERIAL_RUNTIME_STATUS: MaterialRuntimeStatus = {
  state: 'idle',
  generation: 0,
  resourceKey: '',
  descriptorKey: '',
  error: null,
};
