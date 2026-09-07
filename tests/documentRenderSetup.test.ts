import { describe, expect, it } from 'vitest';
import { ensureDefaultHeadlessPlatform } from '../src/bootstrap/headlessBootstrap';
import { compileFrameSourceFromDocument } from '../src/game-runtime/projectDocument';
import { CRUSH_WOOD_PRESENTATION_SCHEMA_ID } from '../src/games/block-crush-drop/presentation';
import { BLOCK_CRUSH_DROP_GAME_ID } from '../src/games/block-crush-drop/manifest';
import { BLOCK_PLACEMENT_CINEMATIC_BACKEND_ID } from '../src/games/block-placement/render/cinematicBackendAdapter';
import { BLOCK_PLACEMENT_PRESENTATION_SCHEMA_ID } from '../src/games/block-placement/presentation/legacyPresentationAdapter';
import { BLOCK_PLACEMENT_GAME_ID } from '../src/games/block-placement/manifest';
import { TAPTILE_PRESENTATION_SCHEMA_ID } from '../src/games/taptile-tray-match3/presentation';
import { TAPTILE_TRAY_MATCH3_GAME_ID } from '../src/games/taptile-tray-match3/manifest';
import { TAPTILE_CINEMATIC_BACKEND_ID } from '../src/games/taptile-tray-match3/render/cinematicBackendAdapter';
import { CRUSH_WOOD_CINEMATIC_BACKEND_ID } from '../src/games/block-crush-drop/render/cinematicBackendAdapter';
import { listRenderBackends } from '../src/rendering/backendRegistry';
import { listCompositionProfiles } from '../src/rendering/compositionRegistry';
import { resolveDocumentRenderSetup } from '../src/rendering/documentRenderSetup';
import { limitCompiledFrameSource } from '../src/rendering/limitFrameSource';

describe('document render setup', () => {
  it('registers a cinematic backend and composition for every demo game', () => {
    ensureDefaultHeadlessPlatform();
    const backendIds = listRenderBackends().map((item) => item.id).sort();
    expect(backendIds).toEqual(expect.arrayContaining([
      BLOCK_PLACEMENT_CINEMATIC_BACKEND_ID,
      TAPTILE_CINEMATIC_BACKEND_ID,
      CRUSH_WOOD_CINEMATIC_BACKEND_ID,
    ]));
    const games = listCompositionProfiles().map((item) => item.gameId).sort();
    expect(games).toEqual(expect.arrayContaining([
      BLOCK_CRUSH_DROP_GAME_ID,
      BLOCK_PLACEMENT_GAME_ID,
      TAPTILE_TRAY_MATCH3_GAME_ID,
    ]));
  });

  it('resolves backends from registries without a game-specific switch', () => {
    const platform = ensureDefaultHeadlessPlatform();
    const cases = [
      {
        gameId: BLOCK_PLACEMENT_GAME_ID,
        schema: BLOCK_PLACEMENT_PRESENTATION_SCHEMA_ID,
        backendId: BLOCK_PLACEMENT_CINEMATIC_BACKEND_ID,
      },
      {
        gameId: TAPTILE_TRAY_MATCH3_GAME_ID,
        schema: TAPTILE_PRESENTATION_SCHEMA_ID,
        backendId: TAPTILE_CINEMATIC_BACKEND_ID,
      },
      {
        gameId: BLOCK_CRUSH_DROP_GAME_ID,
        schema: CRUSH_WOOD_PRESENTATION_SCHEMA_ID,
        backendId: CRUSH_WOOD_CINEMATIC_BACKEND_ID,
      },
    ];
    for (const item of cases) {
      const setup = resolveDocumentRenderSetup({
        gameId: item.gameId,
        presentationSchemaId: item.schema,
        renderContracts: platform.renderContracts.list(),
      });
      expect(setup.backend.id).toBe(item.backendId);
      expect(setup.composition.gameId).toBe(item.gameId);
      expect(setup.renderContract.gameId).toBe(item.gameId);
      expect(setup.resourcePolicy.mode).toBe('procedural-no-assets');
    }
  });

  it('limits a compiled frame source without changing the original hash', async () => {
    const platform = ensureDefaultHeadlessPlatform();
    const authoring = platform.authoring.require(BLOCK_PLACEMENT_GAME_ID);
    const agent = platform.agents.require(BLOCK_PLACEMENT_GAME_ID);
    const scaffold = authoring.scaffold({ seed: 7, template: 'showcase' });
    const run = await Promise.resolve(agent.run({ config: scaffold.config, seed: 7, maxMoves: 5 }));
    expect(run.validation.valid).toBe(true);
    const document = authoring.emitDocument({
      config: scaffold.config,
      seed: 7,
      takes: [run.replay],
    });
    const source = compileFrameSourceFromDocument(document, platform, {
      takeId: document.takes[0]!.takeId,
      directorProfile: document.direction?.rhythm ?? {},
      fps: 30,
    });
    expect(source.totalFrames).toBeGreaterThan(4);
    const limited = limitCompiledFrameSource(source, 3);
    expect(limited.totalFrames).toBe(3);
    expect(limited.frameSourceHash).toBe(source.frameSourceHash);
    expect(limited.evaluate(2).identity.totalFrames).toBe(3);
    expect(limited.evaluate(2).identity.frameIndex).toBe(2);
  });
});
