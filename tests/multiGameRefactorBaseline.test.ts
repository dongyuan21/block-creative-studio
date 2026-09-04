import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectMultiGameRefactorBaselineIdentities } from './multiGameRefactorBaseline';

const identitiesPath = resolve(process.cwd(), 'docs/reports/multi-game-refactor-baseline-identities.json');

describe('multi-game refactor baseline identities', () => {
  it('freezes public fixtures, V1 plan hashes, material runtime hashes, and shot evidence', () => {
    const identities = collectMultiGameRefactorBaselineIdentities();
    if (process.env.DUMP_REFACTOR_BASELINE === '1') {
      writeFileSync(identitiesPath, `${JSON.stringify(identities, null, 2)}\n`);
    }
    const frozen = JSON.parse(readFileSync(identitiesPath, 'utf8')) as unknown;
    expect(identities).toEqual(frozen);
    expect(identities.baseSha).toBe('f1c1052226eeaba92aff4cb4727a8fc7ee66ce74');
    expect(identities.publicFixtures.map((item) => item.id)).toEqual([
      'idle',
      'pickup',
      'legal-preview',
      'illegal-preview',
      'single-clear',
      'cross-clear',
      'consecutive',
      'endgame',
    ]);
    expect(identities.materials.steel.planHash).toMatch(/^fnv1a32:[0-9a-f]{8}$/);
    expect(identities.materials.steel.evidence.cameraDrivesPixels).toBe(true);
    expect(identities.materials.steel.evidence.layoutDrivesPixels).toBe(true);
    expect(identities.materials.steel.shot.poseSource).toBe('fallback-fixed-shot');
  });
});
