# Repository import status

The `main` branch now contains the complete `v0.1.4-alpha` architecture prototype.

This snapshot validates the intended engineering chain:

```text
Game state -> Human/Bot Take -> Directed Replay -> Browser renderer -> Video export
```

It is **not** presented as a faithful visual or behavioral reproduction of Block Blast. The next product milestone is reference-first and 2D-first:

1. analyze real-device gameplay recordings frame by frame;
2. define the canonical 2D layout, UI atoms, block rendering, pre-clear fill, scoring, praise overlays, particles, timing and feedback rules;
3. implement and validate that 2D baseline;
4. retain the current Three.js renderer as an experimental backend, then generalize the validated 2D specification into higher-quality 3D styles.

See [`REFERENCE_FIRST_REBUILD.md`](./REFERENCE_FIRST_REBUILD.md) for the rebuild direction.
