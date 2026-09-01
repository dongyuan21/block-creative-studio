# Changelog

## 0.1.4 — 2026-09-01

### Changed

- Corrected Git Bundle recovery instructions to explicitly check out the `main` branch.
- Clarified that runtime source has no CDN dependency: network access is only needed to install pinned npm packages before local builds.
- Rebuilt and verified the source ZIP, Git Bundle and release checksums as one consistent handoff.

## 0.1.3 — 2026-09-01

### Added

- Collision-resistant runtime IDs for human and machine Takes.
- Dependency-free source-integrity check covering TypeScript syntax, relative imports, JSON files and required package scripts.
- Deterministic multi-seed Replay stress checks and camera-recovery regression coverage.

### Changed

- Locked setup, visual, rhythm, Take and project mutations while recording or rendering.
- Frozen a cloned Project/Take snapshot at export start so an MP4 render cannot drift when UI state changes.
- Hardened project import validation for candidate-set consistency, unique Take/action IDs, pointer-track duration bounds and even H.264 dimensions.
- Added an explicit browser AVC capability preflight before allocating the cinematic render pipeline.
- Preserved nonzero piece-set indexes and deterministic candidate IDs through shape edits.
- Made machine-player pointer paths originate from the actual candidate slot.
- Included camera-recovery time in the compiled director timeline.
- Corrected Three.js rack/drag cache keys so candidate color or shape changes always rebuild the scene.
- Pinned the currently verified Mediabunny package line and exact React/Three.js type packages.

## 0.1.2 — 2026-09-01

### Fixed

- Fixed fixed-frame presentation evaluation so a non-clearing placement releases the timeline and later actions can render.
- Added a deterministic regression scenario covering two sequential non-clearing placements.
- Removed invalid nested interactive controls from the candidate-piece cards.

## 0.1.1 — 2026-09-01

### Added

- Aggregate dependency-free validation commands, contribution guidance, third-party notices and a planning-to-code implementation map.
- Export preconditions for non-empty Takes, even video dimensions and font readiness.

## 0.1.0 — 2026-09-01

### Added

- Browser-first 8×8 block-placement gameplay core and deterministic three-piece tray generation.
- Human drag recording and rule-based machine-player Take generation through one semantic action protocol.
- Fixed-frame replay compiler with four rhythm profiles.
- Three.js 3D board, PBR materials, lighting/camera presets, deterministic 3D fracture, particles and post-processing.
- In-browser H.264/MP4 frame-by-frame export with three supersampling quality profiles and cancellation.
- Project JSON import/export, runtime hardening, LocalStorage autosave, example project and DCC extension interfaces.
