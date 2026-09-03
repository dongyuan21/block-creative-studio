# Known limitations

- Original reference MP4/frames are not in the public repo. All 39 Golden content cases are BLOCKED.
- Browser E2E, native PNG capture evidence, and 1080×1920 MP4 variants were NOT_RUN in this agent VM (no WebCodecs/Playwright GPU path).
- Bloom is still UnrealBloomPass threshold-bloom. Not selective-bloom.
- PBR maps compile and Three.js material factory exists; GPU sampling of independent texture sets was not captured.
- Material-aware fracture remains pending.
- CLI has no headless video renderer and never reports `rendered: true`.
- Visual status is ready-for-review, never visually-approved by this implementer.
