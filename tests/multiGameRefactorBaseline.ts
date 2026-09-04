import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CAPTURE_ASSET_PATHS, compileRegisteredMaterialPlan } from '../src/capture/materialVariants';
import {
  publicSceneCatalog,
  sceneStateIdentity,
  takeStateIdentity,
} from '../src/domain/publicFixtures';
import type {
  AssetManifest,
  CreativeMaster,
  MaterialPackManifest,
  VariantRecipe,
} from '../src/headless/contracts';
import { materialDescriptorKey } from '../src/headless/materialRuntime';
import { stableHash } from '../src/headless/stableHash';
import { planRenderEvidence, resolveStyleFromRenderPlan } from '../src/integration/studioAssetCatalog';
import { shotExecutionFromPlan } from '../src/renderer/planShotAdapter';
import { DEFAULT_STYLE } from '../src/renderer/stylePresets';
import { FIXED_SHOT_PROFILE } from '../src/renderer/shotProfile';

const BASE_SHA = 'f1c1052226eeaba92aff4cb4727a8fc7ee66ce74';

function loadJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(resolve(process.cwd(), relativePath), 'utf8')) as T;
}

const PACK_FILES = {
  steel: 'examples/headless/materials/material.stainless-steel.json',
  wood: 'examples/headless/materials/material.oak-wood.json',
  aurora: 'examples/headless/materials/material.aurora-shell.json',
} as const;

export function collectMultiGameRefactorBaselineIdentities() {
  const master = loadJson<CreativeMaster>('examples/headless/master.demo.json');
  const recipe = loadJson<VariantRecipe>('examples/headless/variant.copper.demo.json');
  const assets = CAPTURE_ASSET_PATHS.map((path) => loadJson<AssetManifest>(path));

  const materials = Object.fromEntries(
    Object.entries(PACK_FILES).map(([key, file]) => {
      const pack = loadJson<MaterialPackManifest>(file);
      const compiled = compileRegisteredMaterialPlan(pack, { master, recipe, assets });
      const { style } = resolveStyleFromRenderPlan(compiled.plan, structuredClone(DEFAULT_STYLE));
      const shot = shotExecutionFromPlan(compiled.plan);
      return [
        key,
        {
          packId: pack.id,
          packContentHash: pack.contentHash ?? null,
          runtimeContentHash: compiled.runtime.contentHash,
          materialDescriptorKey: materialDescriptorKey(compiled.runtime),
          planHash: compiled.plan.planHash,
          lockMode: compiled.plan.lockMode,
          renderer: compiled.plan.renderer,
          clearPrimary: compiled.plan.slots['clear.primary']?.manifest.id ?? null,
          evidence: planRenderEvidence(compiled.plan, style),
          shot: {
            cameraProfileId: shot.cameraProfileId,
            layoutProfileId: shot.layoutProfileId,
            designResolution: shot.designResolution,
            boardScreenRect: shot.boardScreenRect,
            maximumScreenZoom: shot.maximumScreenZoom,
            poseSource: shot.poseSource,
            fovSource: shot.fovSource,
          },
        },
      ];
    }),
  );

  return {
    baseSha: BASE_SHA,
    publicFixtures: publicSceneCatalog().map((scene) => ({
      id: scene.id,
      snapshotHash: stableHash(sceneStateIdentity(scene.snapshot)),
      takeHash: scene.take ? stableHash(takeStateIdentity(scene.take)) : null,
      status: scene.snapshot.status,
    })),
    materials,
    fallbackShot: {
      id: FIXED_SHOT_PROFILE.id,
      designResolution: FIXED_SHOT_PROFILE.designResolution,
      boardScreenRect: FIXED_SHOT_PROFILE.boardScreenRect,
      maximumScreenZoom: FIXED_SHOT_PROFILE.maximumScreenZoom,
      compositionAspect: FIXED_SHOT_PROFILE.compositionAspect,
    },
  };
}
