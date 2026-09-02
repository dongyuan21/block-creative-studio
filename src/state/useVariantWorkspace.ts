import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type {
  AssetManifest,
  VariantLockMode,
  VariantRecipe,
} from '../headless/contracts';
import {
  PROJECT_CURRENT_LOOK_KEY,
  createStudioAssetCatalog,
  parseImportedAssetBundle,
  styleForLookOption,
} from '../integration/studioAssetCatalog';
import {
  PROJECT_CURRENT_VARIANT_ID,
  createStudioVariantMatrix,
  parseImportedVariantRecipe,
  type StudioVariantRow,
} from '../integration/studioVariantBridge';
import type {
  CompiledTake,
  ProjectSpec,
  StudioMode,
  StyleSpec,
  Take,
} from '../domain/types';
import { downloadBlob, safeFileName } from '../utils/download';

const VARIANT_AUTOSAVE_KEY = 'block-creative-studio/variant-workspace/v1';

interface StoredVariantWorkspace {
  version: '1.0.0';
  selectedLookKey: string;
  lockMode: VariantLockMode;
  activeRecipeId: string;
  assets: AssetManifest[];
  recipes: VariantRecipe[];
}

export interface VariantWorkspacePanelModel {
  lockMode: VariantLockMode;
  selectedLookKey: string;
  activeRecipeId: string;
  lookOptions: ReturnType<typeof createStudioAssetCatalog>['lookOptions'];
  rows: StudioVariantRow[];
  importedAssetCount: number;
  importedRecipeCount: number;
  workspaceError: string | null;
  onLockMode(lockMode: VariantLockMode): void;
  onSelectLook(key: string): void;
  onSelectRecipe(id: string): void;
  onImportAssets(file: File): Promise<void>;
  onImportRecipe(file: File): Promise<void>;
  onExportArtifact(
    kind: 'master' | 'recipe' | 'plan' | 'quality' | 'asset-bundle',
  ): void;
}

export interface UseVariantWorkspaceInput {
  project: ProjectSpec;
  selectedTake: Take | null;
  compiledTake: CompiledTake | null;
  mode: StudioMode;
  setProject: Dispatch<SetStateAction<ProjectSpec>>;
}

export interface VariantWorkspaceController {
  resolvedStyle: StyleSpec;
  activeRow: StudioVariantRow | null;
  panel: VariantWorkspacePanelModel;
  resetToCurrentLook(): void;
}

function assetIdentity(asset: Pick<AssetManifest, 'id' | 'version'>): string {
  return `${asset.id}@${asset.version}`;
}

function cloneAssetManifest(asset: AssetManifest): AssetManifest {
  return structuredClone(asset);
}

function cloneVariantRecipe(recipe: VariantRecipe): VariantRecipe {
  return structuredClone(recipe);
}

function defaultVariantWorkspace(): StoredVariantWorkspace {
  return {
    version: '1.0.0',
    selectedLookKey: PROJECT_CURRENT_LOOK_KEY,
    lockMode: 'frame-exact',
    activeRecipeId: PROJECT_CURRENT_VARIANT_ID,
    assets: [],
    recipes: [],
  };
}

function loadVariantWorkspace(): StoredVariantWorkspace {
  if (typeof window === 'undefined') return defaultVariantWorkspace();
  try {
    const stored = window.localStorage.getItem(VARIANT_AUTOSAVE_KEY);
    if (!stored) return defaultVariantWorkspace();
    const source = JSON.parse(stored) as Partial<StoredVariantWorkspace>;
    const lockMode: VariantLockMode = source.lockMode === 'semantic' || source.lockMode === 'rule-only'
      ? source.lockMode
      : 'frame-exact';
    const assets = Array.isArray(source.assets)
      ? parseImportedAssetBundle(source.assets)
      : [];
    const recipes = Array.isArray(source.recipes)
      ? source.recipes.map((recipe) => parseImportedVariantRecipe(recipe))
      : [];
    return {
      version: '1.0.0',
      selectedLookKey: typeof source.selectedLookKey === 'string' && source.selectedLookKey
        ? source.selectedLookKey
        : PROJECT_CURRENT_LOOK_KEY,
      lockMode,
      activeRecipeId: typeof source.activeRecipeId === 'string' && source.activeRecipeId
        ? source.activeRecipeId
        : PROJECT_CURRENT_VARIANT_ID,
      assets,
      recipes,
    };
  } catch {
    window.localStorage.removeItem(VARIANT_AUTOSAVE_KEY);
    return defaultVariantWorkspace();
  }
}

function mergeImportedAssets(
  current: AssetManifest[],
  incoming: AssetManifest[],
): AssetManifest[] {
  const merged = new Map(
    current.map((asset) => [assetIdentity(asset), cloneAssetManifest(asset)]),
  );
  for (const asset of incoming) {
    const key = assetIdentity(asset);
    const existing = merged.get(key);
    if (existing && existing.contentHash !== asset.contentHash) {
      throw new Error(`资产 ${key} 已存在，但内容 Hash 不一致。请提升 version 后再导入。`);
    }
    merged.set(key, cloneAssetManifest(asset));
  }
  return [...merged.values()].sort((left, right) =>
    assetIdentity(left).localeCompare(assetIdentity(right)),
  );
}

export function useVariantWorkspace({
  project,
  selectedTake,
  compiledTake,
  mode,
  setProject,
}: UseVariantWorkspaceInput): VariantWorkspaceController {
  const [initial] = useState(loadVariantWorkspace);
  const [variantLockMode, setVariantLockModeState] = useState(initial.lockMode);
  const [selectedLookKey, setSelectedLookKey] = useState(initial.selectedLookKey);
  const [activeRecipeId, setActiveRecipeId] = useState(initial.activeRecipeId);
  const [importedAssets, setImportedAssets] = useState<AssetManifest[]>(
    () => initial.assets.map(cloneAssetManifest),
  );
  const [importedRecipes, setImportedRecipes] = useState<VariantRecipe[]>(
    () => initial.recipes.map(cloneVariantRecipe),
  );
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const workspace: StoredVariantWorkspace = {
        version: '1.0.0',
        selectedLookKey,
        lockMode: variantLockMode,
        activeRecipeId,
        assets: importedAssets.map(cloneAssetManifest),
        recipes: importedRecipes.map(cloneVariantRecipe),
      };
      window.localStorage.setItem(VARIANT_AUTOSAVE_KEY, JSON.stringify(workspace));
    } catch {
      // Manifest-only workspace persistence is best-effort.
    }
  }, [activeRecipeId, importedAssets, importedRecipes, selectedLookKey, variantLockMode]);

  const builtinCatalog = useMemo(
    () => createStudioAssetCatalog(project),
    [project],
  );

  const compilation = useMemo(() => {
    try {
      return {
        matrix: createStudioVariantMatrix({
          project,
          selectedTake,
          compiledTake,
          requestedLockMode: variantLockMode,
          selectedLookKey,
          importedAssets,
          importedRecipes,
        }),
        error: null as string | null,
      };
    } catch (error) {
      return {
        matrix: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }, [
    compiledTake,
    importedAssets,
    importedRecipes,
    project,
    selectedLookKey,
    selectedTake,
    variantLockMode,
  ]);

  const matrix = compilation.matrix;
  const lookOptions = matrix?.catalog.lookOptions ?? builtinCatalog.lookOptions;
  const activeRow = matrix?.rows.find((row) => row.recipe.id === activeRecipeId)
    ?? matrix?.rows[0]
    ?? null;
  const resolvedStyle = activeRow?.previewSupported
    ? activeRow.resolvedStyle
    : project.style;

  useEffect(() => {
    if (lookOptions.some((option) => option.key === selectedLookKey)) return;
    setSelectedLookKey(PROJECT_CURRENT_LOOK_KEY);
    setActiveRecipeId(PROJECT_CURRENT_VARIANT_ID);
  }, [lookOptions, selectedLookKey]);

  useEffect(() => {
    if (activeRecipeId === PROJECT_CURRENT_VARIANT_ID) return;
    if (matrix?.rows.some((row) => row.recipe.id === activeRecipeId)) return;
    setActiveRecipeId(PROJECT_CURRENT_VARIANT_ID);
  }, [activeRecipeId, matrix]);

  const resetToCurrentLook = useCallback((): void => {
    setSelectedLookKey(PROJECT_CURRENT_LOOK_KEY);
    setActiveRecipeId(PROJECT_CURRENT_VARIANT_ID);
    setWorkspaceError(null);
  }, []);

  const selectLook = useCallback((key: string): void => {
    if (mode === 'play' || mode === 'render') return;
    const catalog = matrix?.catalog ?? builtinCatalog;
    const resolved = styleForLookOption(catalog, key, project.style);
    setSelectedLookKey(key);
    setActiveRecipeId(PROJECT_CURRENT_VARIANT_ID);
    if (resolved.previewSupported) {
      setProject((current) => ({ ...current, style: resolved.style }));
      setWorkspaceError(null);
    } else {
      setWorkspaceError(
        '该 Look Pack 已进入 Asset Registry，但没有当前网页渲染器的 studio.style 预览绑定。可通过 CLI 编译，暂不能在页面中直接显示。',
      );
    }
  }, [builtinCatalog, matrix, mode, project.style, setProject]);

  const selectRecipe = useCallback((recipeId: string): void => {
    if (mode === 'play' || mode === 'render') return;
    const row = matrix?.rows.find((candidate) => candidate.recipe.id === recipeId);
    if (!row) return;
    setActiveRecipeId(recipeId);
    setSelectedLookKey(`${row.recipe.lookPackRef.id}@${row.recipe.lookPackRef.version}`);
    setVariantLockModeState(row.recipe.lockMode);
    if (row.previewSupported) {
      setProject((current) => ({ ...current, style: row.resolvedStyle }));
      setWorkspaceError(null);
    } else {
      setWorkspaceError(
        row.error
          ? `${row.error.code}: ${row.error.message}`
          : '该 Variant 可以作为 Headless Artifact 使用，但当前网页预览没有对应的渲染绑定。',
      );
    }
  }, [matrix, mode, setProject]);

  const setLockMode = useCallback((lockMode: VariantLockMode): void => {
    if (mode === 'play' || mode === 'render') return;
    setVariantLockModeState(lockMode);
    setActiveRecipeId(PROJECT_CURRENT_VARIANT_ID);
    setWorkspaceError(null);
  }, [mode]);

  const importAssets = useCallback(async (file: File): Promise<void> => {
    if (mode === 'play' || mode === 'render') return;
    try {
      const assets = parseImportedAssetBundle(JSON.parse(await file.text()));
      setImportedAssets((current) => mergeImportedAssets(current, assets));
      setWorkspaceError(null);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : String(error));
    }
  }, [mode]);

  const importRecipe = useCallback(async (file: File): Promise<void> => {
    if (mode === 'play' || mode === 'render') return;
    try {
      const recipe = parseImportedVariantRecipe(JSON.parse(await file.text()));
      setImportedRecipes((current) => [
        ...current.filter((candidate) => candidate.id !== recipe.id),
        cloneVariantRecipe(recipe),
      ]);
      setActiveRecipeId(recipe.id);
      setSelectedLookKey(`${recipe.lookPackRef.id}@${recipe.lookPackRef.version}`);
      setVariantLockModeState(recipe.lockMode);
      setWorkspaceError(null);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : String(error));
    }
  }, [mode]);

  const exportArtifact = useCallback((
    kind: 'master' | 'recipe' | 'plan' | 'quality' | 'asset-bundle',
  ): void => {
    const row = activeRow;
    let value: unknown;
    let suffix: string;
    switch (kind) {
      case 'master':
        value = matrix?.master;
        suffix = 'creative-master';
        break;
      case 'recipe':
        value = row?.recipe;
        suffix = 'variant-recipe';
        break;
      case 'plan':
        value = row?.plan;
        suffix = 'render-plan';
        break;
      case 'quality':
        value = row?.quality;
        suffix = 'quality-report';
        break;
      case 'asset-bundle':
        value = matrix ? {
          contract: 'bcs.asset-bundle',
          contractVersion: '1.0.0',
          assets: matrix.catalog.assets,
        } : null;
        suffix = 'asset-bundle';
        break;
    }
    if (!value) {
      setWorkspaceError(`当前没有可导出的 ${suffix}。`);
      return;
    }
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${safeFileName(project.name)}.${suffix}.json`);
    setWorkspaceError(null);
  }, [activeRow, matrix, project.name]);

  const effectiveError = workspaceError
    ?? compilation.error
    ?? activeRow?.error?.message
    ?? null;

  return {
    resolvedStyle,
    activeRow,
    resetToCurrentLook,
    panel: {
      lockMode: variantLockMode,
      selectedLookKey,
      activeRecipeId,
      lookOptions,
      rows: matrix?.rows ?? [],
      importedAssetCount: importedAssets.length,
      importedRecipeCount: importedRecipes.length,
      workspaceError: effectiveError,
      onLockMode: setLockMode,
      onSelectLook: selectLook,
      onSelectRecipe: selectRecipe,
      onImportAssets: importAssets,
      onImportRecipe: importRecipe,
      onExportArtifact: exportArtifact,
    },
  };
}
