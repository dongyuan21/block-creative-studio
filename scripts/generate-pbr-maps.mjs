#!/usr/bin/env node
/**
 * Generate synthetic, independently patterned PBR maps for the public
 * stainless-steel and oak-wood packs. These are original fixtures, not
 * photographic scans, so they can live in the public repository.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'examples/headless/materials/maps');
const publicDir = resolve(root, 'public/materials/maps');
const SIZE = 128;

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function writePng(path, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB
  const raw = Buffer.alloc(SIZE * (1 + SIZE * 3));
  let offset = 0;
  for (let y = 0; y < SIZE; y += 1) {
    raw[offset] = 0;
    offset += 1;
    raw.set(pixels.subarray(y * SIZE * 3, (y + 1) * SIZE * 3), offset);
    offset += SIZE * 3;
  }
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(path, png);
  return createHash('sha256').update(png).digest('hex');
}

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hash2(x, y, salt) {
  let n = Math.imul(x + salt * 17, 374761393) ^ Math.imul(y + salt * 31, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function fill(fn) {
  const pixels = Buffer.alloc(SIZE * SIZE * 3);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const [r, g, b] = fn(x, y);
      const i = (y * SIZE + x) * 3;
      pixels[i] = clamp(r);
      pixels[i + 1] = clamp(g);
      pixels[i + 2] = clamp(b);
    }
  }
  return pixels;
}

function gray(value) {
  return fill(() => {
    const v = value;
    return [v, v, v];
  });
}

mkdirSync(outDir, { recursive: true });
mkdirSync(publicDir, { recursive: true });

const steelColor = fill((x, y) => {
  const scratch = Math.max(0, Math.sin((y + x * 0.08) * 0.9) * 18 + hash2(x, y, 3) * 22 - 8);
  const stain = hash2(x, y, 9) * 10;
  return [168 + scratch - stain, 176 + scratch * 0.8, 186 + scratch * 0.4];
});
const steelRough = fill((x, y) => {
  const v = 28 + hash2(x, y, 4) * 36 + (y % 17 === 0 ? 40 : 0);
  return [v, v, v];
});
const steelMetal = fill((x, y) => {
  const v = 228 + hash2(x, y, 5) * 24;
  return [v, v, v];
});
const steelNormal = fill((x, y) => {
  const nx = 128 + (hash2(x + 1, y, 6) - hash2(x, y, 6)) * 28;
  const ny = 128 + (hash2(x, y + 1, 6) - hash2(x, y, 6)) * 18;
  return [nx, ny, 255];
});
const steelAo = fill((x, y) => {
  const v = 210 + hash2(x, y, 7) * 30 - (y % 17 === 0 ? 25 : 0);
  return [v, v, v];
});

const woodColor = fill((x, y) => {
  const grain = Math.sin(x * 0.38 + Math.sin(y * 0.07) * 3) * 28;
  const pore = hash2(x, Math.floor(y / 3), 11) * 18;
  return [118 + grain - pore, 72 + grain * 0.45, 38 + grain * 0.15];
});
const woodRough = fill((x, y) => {
  const grain = Math.abs(Math.sin(x * 0.38 + Math.sin(y * 0.07) * 3)) * 50;
  const v = 150 + grain + hash2(x, y, 12) * 20;
  return [v, v, v];
});
const woodMetal = gray(8);
const woodNormal = fill((x, y) => {
  const nx = 128 + Math.cos(x * 0.38) * 36;
  const ny = 128 + Math.sin(y * 0.11) * 10;
  return [nx, ny, 255];
});
const woodAo = fill((x, y) => {
  const grain = Math.abs(Math.sin(x * 0.38)) * 35;
  const v = 200 - grain;
  return [v, v, v];
});

const files = {
  'steel-basecolor.png': steelColor,
  'steel-roughness.png': steelRough,
  'steel-metallic.png': steelMetal,
  'steel-normal.png': steelNormal,
  'steel-ao.png': steelAo,
  'wood-basecolor.png': woodColor,
  'wood-roughness.png': woodRough,
  'wood-metallic.png': woodMetal,
  'wood-normal.png': woodNormal,
  'wood-ao.png': woodAo,
};

const hashes = {};
for (const [name, pixels] of Object.entries(files)) {
  hashes[name] = writePng(resolve(outDir, name), pixels);
  writeFileSync(resolve(publicDir, name), readFileSync(resolve(outDir, name)));
}

function bitmapRef(id, fileName) {
  return {
    id,
    version: '1.0.0',
    kind: 'bitmap',
    contentHash: `sha256:${hashes[fileName]}`,
  };
}

function patchPack(fileName, refs, sourceFiles) {
  const path = resolve(root, 'examples/headless/materials', fileName);
  const pack = JSON.parse(readFileSync(path, 'utf8'));
  pack.appearance.textureRefs = refs;
  pack.provenance = {
    ...pack.provenance,
    sourceUris: sourceFiles.map((name) => `examples/headless/materials/maps/${name}`),
  };
  writeFileSync(path, `${JSON.stringify(pack, null, 2)}\n`);
}

patchPack(
  'material.stainless-steel.json',
  {
    baseColor: bitmapRef('tex.steel.basecolor', 'steel-basecolor.png'),
    roughness: bitmapRef('tex.steel.roughness', 'steel-roughness.png'),
    metallic: bitmapRef('tex.steel.metallic', 'steel-metallic.png'),
    normal: bitmapRef('tex.steel.normal', 'steel-normal.png'),
    ao: bitmapRef('tex.steel.ao', 'steel-ao.png'),
  },
  ['steel-basecolor.png', 'steel-roughness.png', 'steel-metallic.png', 'steel-normal.png', 'steel-ao.png'],
);

patchPack(
  'material.oak-wood.json',
  {
    baseColor: bitmapRef('tex.wood.basecolor', 'wood-basecolor.png'),
    roughness: bitmapRef('tex.wood.roughness', 'wood-roughness.png'),
    metallic: bitmapRef('tex.wood.metallic', 'wood-metallic.png'),
    normal: bitmapRef('tex.wood.normal', 'wood-normal.png'),
    ao: bitmapRef('tex.wood.ao', 'wood-ao.png'),
  },
  ['wood-basecolor.png', 'wood-roughness.png', 'wood-metallic.png', 'wood-normal.png', 'wood-ao.png'],
);

writeFileSync(
  resolve(outDir, 'MANIFEST.json'),
  `${JSON.stringify(
    {
      origin: 'synthetic-public-fixture',
      license: 'CC0-1.0',
      note: 'Independently generated 128×128 maps. Steel uses horizontal scratches; wood uses vertical grain. Aurora-shell intentionally has no maps.',
      size: SIZE,
      files: Object.fromEntries(Object.entries(hashes).map(([name, sha]) => [name, `sha256:${sha}`])),
    },
    null,
    2,
  )}\n`,
);

writeFileSync(resolve(publicDir, 'MANIFEST.json'), readFileSync(resolve(outDir, 'MANIFEST.json')));
writeFileSync(
  resolve(outDir, 'LICENSE.txt'),
  'Synthetic PBR fixture maps generated for Block Creative Studio tests.\nDedicated to the public domain under CC0 1.0.\nNot derived from the commercial reference video.\n',
);

console.log(JSON.stringify({ ok: true, files: Object.keys(hashes).length, hashes }, null, 2));
