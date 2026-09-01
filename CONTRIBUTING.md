# Contributing

## Development baseline

- Node.js: use the version in `.nvmrc`.
- Package manager: npm 10.9.2 as declared in `package.json`.
- Browser target: a current desktop Chrome with WebGL2 and WebCodecs enabled.

```bash
nvm use
npm install
npm run check
npm test
npm run build
npm run dev
```

## Architecture rules

1. `src/domain` and `src/director` must remain independent of React and Three.js.
2. A Take records semantic placements; pointer samples are presentation data, never gameplay truth.
3. Rendering must be seekable by frame. Do not base exported motion on wall-clock delta time.
4. Geometry, material, lighting, camera, FX and rhythm must remain independently replaceable.
5. External/DCC concepts belong behind `src/extensions/contracts.ts`; phase-one project data must not contain `.blend`, `.aep`, Blender collection or AE layer semantics.
6. Any change to game rules requires a deterministic core test and, when relevant, an import-validation test.

## Pull request checklist

- `npm run check` passes.
- `npm test` passes after dependencies are installed.
- `npm run build` passes.
- A changed project schema remains backward compatible or increments its schema version.
- A changed render preset includes a before/after reference frame and performance notes.
- No third-party brand asset, audio, UI or proprietary source has been committed.
