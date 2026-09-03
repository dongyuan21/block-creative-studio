# Known limitations

- Original reference MP4/frames are not in the public repo. All 39 Golden content cases remain BLOCKED. Public-fixture tool checks and native captures are not a substitute for exact-replay against the commercial video. Without a target Take hash, Golden batch correspondence is `isolated-presentation`.
- 1064×1788 → 1080×1920 letterbox is a transitional reference-transfer mapping, not a finished 9:16 production profile.
- `world-normal`, `highlight-clip` and `bloom-contribution` diagnostic ids are proxy visualizations, not named G-buffer / HDR clip / bloom buffers.
- T1 is still one `Reference2DScene` with pass conditionals. Praise is specified as a feedback concern but is currently painted from the clear pass.
- Browser capture ran on Headless Chrome 148 + SwiftShader. That proves WebCodecs/WebGL function, not high-end GPU performance or desktop interactive framerate.
- Before/after/diff against the pre-T1 proxy-upscale path was not frozen before the refactor; `review-package/frames/after/` are current native frames. `frames/before` is absent on purpose (NOT_RUN).
- Bloom is still UnrealBloomPass threshold-bloom. Not selective-bloom.
- Aurora-shell has no PBR maps (parameter-only custom ID). Steel and oak-wood have independent synthetic 128×128 maps. Material-aware fracture remains pending.
- CLI never reports `rendered: true`. Node material compile with maps still sets `resourcesReady: false` because it does not decode GPU textures.
- Visual status is ready-for-review, never visually-approved by this implementer.
- React UI drag / Inspector switching is covered only indirectly; the capture harness drives the same Scene/export path without the full App shell.
- Existing review MP4s remain in git for this PR. Going forward, large capture binaries should prefer CI artifacts over git.
- Formal `captureReferenceFrame()` requires runtime assets. `capturePreviewFrame()` is the explicit non-authoritative overlay path.
