declare module '../scripts/check-architecture.mjs' {
  export interface ArchitectureAllowlistItem {
    id: string;
    importer: string;
    target: string;
    retireIn: string;
  }

  export interface ArchitectureViolation {
    code: string;
    importer: string;
    target: string;
    pattern?: string;
    id?: string;
  }

  export interface ArchitectureAnalysis {
    ok: boolean;
    violations: ArchitectureViolation[];
    debt: Array<ArchitectureAllowlistItem & { pattern: string }>;
    allowlist: ArchitectureAllowlistItem[];
  }

  export const LEGACY_ALLOWLIST: ArchitectureAllowlistItem[];

  export function analyzeArchitecture(
    repositoryRoot?: string,
    options?: { allowlist?: ArchitectureAllowlistItem[]; checkStale?: boolean },
  ): ArchitectureAnalysis;

  export function formatArchitectureReport(result: ArchitectureAnalysis): string;
}
