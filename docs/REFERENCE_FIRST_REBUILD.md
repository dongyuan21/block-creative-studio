# Reference-first 2D rebuild

## Why this document exists

The current codebase proves an architectural path from a deterministic block-placement game state to Replay, browser rendering, and video export. It does **not** yet reproduce the reference game's UI, layout, scoring feedback, placement preview, clear effects, celebratory overlays, or timing with sufficient fidelity.

The next production milestone is therefore not “add more 3D.” It is a reference-first 2D rebuild based on captured gameplay footage.

## Acceptance order

1. **Reference decomposition**
   - screen regions and safe areas;
   - background and board placement;
   - score/HUD placement and typography;
   - tray geometry and piece scale;
   - cell geometry, gaps, colors, highlights, and shadows;
   - drag pickup, finger offset, placement preview, invalid preview;
   - pre-clear fill/highlight;
   - row/column clear timing;
   - particles, rays, thumbs-up/celebration overlays, score popups;
   - score and combo event rules observed in the footage.

2. **2D faithful runtime**
   - deterministic gameplay core;
   - pixel-calibrated 9:16 layout;
   - human drag interaction;
   - semantic Replay;
   - event-driven 2D VFX;
   - reference comparison screenshots and timing tests.

3. **Video output**
   - real-time preview;
   - fixed-timestep offline replay;
   - 1080×1920, 30 fps export;
   - frame-accurate event timing.

4. **3D generalization**
   - geometry/material/camera/light as a separate presentation backend;
   - only after the 2D reference baseline passes visual and behavioral gates.

## Architectural rule

The game state and Replay remain renderer-independent. A 2D renderer and a 3D renderer consume the same semantic events, but the 2D implementation is the acceptance baseline for the next milestone.

## Non-goals for the next milestone

- DCC import/export;
- Blender or After Effects integration;
- generalized 3D asset authoring;
- LLM Agent orchestration;
- broad multi-game support.
