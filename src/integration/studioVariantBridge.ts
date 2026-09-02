import type {
  AssetManifest,
  AssetRef,
  CreativeMaster,
  QualityReport,
  ResolvedRenderPlan,
  VariantLockMode,
  VariantRecipe,
} from '../headless/contracts';
import { BcsHeadlessError } from '../headless/errors';
import { runQualityGate } from '../headless/qualityGate';
import { stableHash } from '../headless/stableHash';
import { validateVariantRecipe } from '../headless/validation';
import { compileVariant } from '../headless/variantCompiler';
import { compileTake } from '../director/presentationCompiler';
import type {
  CompiledTake,
  ProjectSpec,
  StyleSpec,
  Take,
} from '../domain/types';
import {
  PROJECT_CURRENT_LOOK_KEY,
  createStudioAssetCatalog,
  resolveStyleFromRenderPlan,
  type StudioAssetCatalog,
} from './studioAssetCatalog';

const CONTRACT_VERSION = '1.0.0' as const;

export const PROJECT_CURRENT_VARIANT_ID = 'project.current.variant';

export interface StudioVariantRow {
  recipe: VariantRecipe;
  plan: ResolvedRenderPlan | null;
  quality: QualityReport | null;
  error: {
    code: string;
    message: string;
    path?: string;
  } | null;
  previewSupported: boolean;
  resolvedStyle: StyleSpec;
}

export interface StudioVariantMatrix {
  master: CreativeMaster;
  catalog: StudioAssetCatalog;
  rows: StudioVariantRow[];
}

export interface CreateStudioVariantMatrixInput {
  project: ProjectSpec;
  selectedTake: Take | null;
  compiledTake: CompiledTake | null;
  requestedLockMode: VariantLockMode;
  selectedLookKey: string;
  importedAssets: AssetManifest[];
  importedRecipes: VariantRecipe[];
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function semanticReplayIdentity(take: Take | null, project: ProjectSpec): unknown {
  if (!take) {
    return {
      setupBoard: project.setupBoard,
      setupPieces: project.setupPieces,
      seed: project.seed,
    };
  }
  return {
    initial: take.initial,
    actions: take.actions.map((action) => ({
      actor: action.actor,
      pieceId: action.pieceId,
      anchor: action.anchor,
    })),
  };
}

function frameReplayIdentity(
  take: Take | null,
  compiledTake: CompiledTake | null,
  project: ProjectSpec,
): unknown {
  return {
    semantic: semanticReplayIdentity(take, project),
    actions: take?.actions.map((action) => ({
      durationFrames: action.durationFrames,
      pointerPath: action.pointerPath,
    })) ?? [],
    rhythm: project.rhythm,
    fps: project.render.fps,
    totalFrames: compiledTake?.totalFrames ?? 1,
  };
}

export function createStudioCreativeMaster(
  project: ProjectSpec,
  take: Take | null,
  compiledTake: CompiledTake | null,
  catalog: StudioAssetCatalog,
): CreativeMaster {
  const semanticHash = stableHash(semanticReplayIdentity(take, project));
  const frameHash = stableHash(frameReplayIdentity(take, compiledTake, project));
  return {
    contract: 'bcs.creative-master',
    contractVersion: CONTRACT_VERSION,
    id: project.id,
    ruleProfile: project.ruleProfile,
    board: {
      rows: project.setupBoard.rows,
      cols: project.setupBoard.cols,
    },
    replay: {
      takeId: take?.id ?? 'setup-preview',
      semanticHash,
      frameHash,
      fps: project.render.fps,
      totalFrames: compiledTake?.totalFrames ?? 1,
    },
    layoutProfileRef: clone(catalog.layoutProfileRef),
    cameraProfileRef: clone(catalog.cameraProfileRef),
    baseOutput: {
      width: project.render.width,
      height: project.render.height,
      fps: project.render.fps,
      quality: project.render.quality,
    },
  };
}

export function createProjectVariantRecipe(
  project: ProjectSpec,
  master: CreativeMaster,
  lockMode: VariantLockMode,
  lookRef: AssetRef,
): VariantRecipe {
  return {
    contract: 'bcs.variant-recipe',
    contractVersion: CONTRACT_VERSION,
    id: PROJECT_CURRENT_VARIANT_ID,
    masterId: master.id,
    lockMode,
    lookPackRef: clone(lookRef),
    seed: project.seed,
  };
}

export function createStudioVariantMatrix({
  project,
  selectedTake,
  compiledTake,
  requestedLockMode,
  selectedLookKey,
  importedAssets,
  importedRecipes,
}: CreateStudioVariantMatrixInput): StudioVariantMatrix {
  const catalog = createStudioAssetCatalog(project, importedAssets);
  const master = createStudioCreativeMaster(project, selectedTake, compiledTake, catalog);
  const selectedLook = catalog.lookOptions.find((option) => option.key === selectedLookKey)
    ?? catalog.lookOptions.find((option) => option.key === PROJECT_CURRENT_LOOK_KEY)
    ?? catalog.lookOptions[0];
  if (!selectedLook) throw new Error('No Look Pack is available.');

  const currentRecipe = createProjectVariantRecipe(
    project,
    master,
    requestedLockMode,
    selectedLook.ref,
  );
  const recipes = [
    currentRecipe,
    ...importedRecipes.filter((recipe) => recipe.id !== PROJECT_CURRENT_VARIANT_ID),
  ];

  const rows: StudioVariantRow[] = recipes.map((recipe) => {
    const recipeIssues = validateVariantRecipe(recipe).filter((candidate) => candidate.severity === 'error');
    if (recipeIssues.length) {
      const first = recipeIssues[0]!;
      return {
        recipe: clone(recipe),
        plan: null,
        quality: null,
        error: {
          code: first.code,
          message: first.message,
          ...(first.path ? { path: first.path } : {}),
        },
        previewSupported: false,
        resolvedStyle: clone(project.style),
      };
    }
    try {
      const plan = compileVariant(master, recipe, catalog.registry, {
        renderer: project.style.renderer,
        requireHashes: true,
      });
      const quality = runQualityGate(plan, {
        strict: true,
        requireHashes: true,
      });
      const resolved = resolveStyleFromRenderPlan(plan, project.style);
      return {
        recipe: clone(recipe),
        plan,
        quality,
        error: null,
        previewSupported: resolved.previewSupported,
        resolvedStyle: resolved.style,
      };
    } catch (error) {
      const resolved = error instanceof BcsHeadlessError
        ? error
        : new BcsHeadlessError(
            'VARIANT_COMPILE_FAILED',
            error instanceof Error ? error.message : String(error),
          );
      return {
        recipe: clone(recipe),
        plan: null,
        quality: null,
        error: {
          code: resolved.code,
          message: resolved.message,
          ...(resolved.path ? { path: resolved.path } : {}),
        },
        previewSupported: false,
        resolvedStyle: clone(project.style),
      };
    }
  });

  return { master, catalog, rows };
}

export function parseImportedVariantRecipe(value: unknown): VariantRecipe {
  const issues = validateVariantRecipe(value).filter((issue) => issue.severity === 'error');
  if (issues.length) {
    const first = issues[0]!;
    throw new BcsHeadlessError('IMPORTED_VARIANT_INVALID', first.message, {
      ...(first.path ? { path: first.path } : {}),
      details: issues,
    });
  }
  return clone(value as VariantRecipe);
}

export function compileTakeForMaster(take: Take | null, project: ProjectSpec): CompiledTake | null {
  return take ? compileTake(take, project.rhythm, project.render.fps) : null;
}
