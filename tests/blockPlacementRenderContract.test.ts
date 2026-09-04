import { describe, expect, it } from 'vitest';
import { REQUIRED_LOOK_SLOTS } from '../src/headless/variantCompiler';
import { REFERENCE_PASS_ORDER } from '../src/headless/contracts';
import { requiredSlotIds } from '../src/game-runtime/renderContract';
import { blockPlacementRenderContract } from '../src/games/block-placement/render/renderContract';

describe('block placement render contract', () => {
  it('replicates the current required look slots and reference passes', () => {
    expect(requiredSlotIds(blockPlacementRenderContract, 'fixed-camera-cinematic').sort()).toEqual(
      [...REQUIRED_LOOK_SLOTS].sort(),
    );
    expect(blockPlacementRenderContract.backends['reference-2d']?.passes.map((pass) => pass.id)).toEqual(
      [...REFERENCE_PASS_ORDER],
    );
    expect(blockPlacementRenderContract.eventCatalog.map((item) => item.type)).toContain('block-placement.line-cleared');
  });
});
