import { describe, expect, it } from 'vitest';
import { createHeadlessPlatform } from '../../../src/bootstrap/gamePackage';
import { compileFrameSourceFromDocument, validateStudioProjectDocumentV2 } from '../../../src/game-runtime/projectDocument';
import { blockCrushDropPackage } from '../../../src/games/block-crush-drop/package';
import {
  CRUSH_WOOD_PRESENTATION_SCHEMA_ID,
  crushWoodPayloadFromPacket,
} from '../../../src/games/block-crush-drop/presentation';
import { createCrushWoodReferenceDocument, CRUSH_WOOD_REFERENCE_TAKE_ID } from '../../../src/games/block-crush-drop/project';

describe('Crush Wood project and presentation contract', () => {
  it('validates as Studio Project V2 and compiles deterministic phase packets', () => {
    const platform = createHeadlessPlatform([blockCrushDropPackage]);
    const document = createCrushWoodReferenceDocument();
    const validated = validateStudioProjectDocumentV2(document, platform.games);
    expect(validated.parsed.takes[0]?.actions).toHaveLength(9);

    const frameSource = compileFrameSourceFromDocument(document, platform, {
      takeId: CRUSH_WOOD_REFERENCE_TAKE_ID,
      directorProfile: document.direction?.rhythm ?? {},
      fps: 30,
    });
    const phases = new Set<string>();
    let crushPacket = frameSource.evaluate(0);
    for (let frame = 0; frame < frameSource.totalFrames; frame += 1) {
      const packet = frameSource.evaluate(frame);
      const payload = crushWoodPayloadFromPacket(packet);
      phases.add(payload.phase);
      if (payload.phase === 'crush') crushPacket = packet;
      expect(packet.identity.frameIndex).toBe(frame);
      expect(packet.payloadSchemaId).toBe(CRUSH_WOOD_PRESENTATION_SCHEMA_ID);
    }
    expect(phases).toEqual(new Set(['idle', 'fall', 'impact', 'crush', 'collapse', 'settle', 'outcome']));
    expect(crushPacket.semanticEvents.some((event) => event.type === 'block-crush.crush-resolved')).toBe(true);
    expect(frameSource.evaluate(0).identity.presentationHash).toBe(frameSource.evaluate(0).identity.presentationHash);
  });

  it('ends the authored reference take at 900 points', () => {
    const platform = createHeadlessPlatform([blockCrushDropPackage]);
    const document = createCrushWoodReferenceDocument('classic-maple');
    const frameSource = compileFrameSourceFromDocument(document, platform, {
      takeId: CRUSH_WOOD_REFERENCE_TAKE_ID,
      directorProfile: {},
      fps: 30,
    });
    const final = crushWoodPayloadFromPacket(frameSource.evaluate(frameSource.totalFrames - 1));
    expect(final.status).toBe('won');
    expect(final.score).toBe(900);
    expect(final.linesCleared).toBe(9);
  });
});
