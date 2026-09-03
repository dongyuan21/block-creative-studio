#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const source = value;
    const result = {};
    for (const key of Object.keys(source).sort()) {
      if (source[key] !== undefined) result[key] = normalize(source[key]);
    }
    return result;
  }
  return value;
}

function omitContentHash(value) {
  const copy = { ...value };
  delete copy.contentHash;
  return copy;
}

const files = [
  'examples/headless/materials/material.stainless-steel.json',
  'examples/headless/materials/material.oak-wood.json',
  'examples/headless/materials/material.aurora-shell.json',
];

for (const rel of files) {
  const path = resolve(rel);
  const pack = JSON.parse(readFileSync(path, 'utf8'));
  const digest = createHash('sha256').update(JSON.stringify(normalize(omitContentHash(pack)))).digest('hex');
  pack.contentHash = `sha256:${digest}`;
  writeFileSync(path, `${JSON.stringify(pack, null, 2)}\n`);
  console.log(`${rel} ${pack.contentHash}`);
}
