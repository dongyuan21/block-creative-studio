# Crush Wooood! reference reconstruction

This document is the implementation and regression contract for the `block-crush-drop` game package. The supplied source clips contain several visual skins, but share one gameplay grammar: a tall pre-built field, a vertically falling polyomino, a full-row fracture, and gravity-driven collapse above the cleared row.

## Scope

Included:

- gameplay-only reconstruction; live-action intros are intentionally excluded;
- deterministic 21 × 34 board runtime;
- authored piece queue and semantic replay;
- full-row detection, scoring, row removal, and stable collapse mapping;
- fixed portrait composition and deterministic 2.5D wood rendering;
- browser preview, Studio Project V2 JSON, frame capture, and 1080 × 1920 MP4 export.

Not represented as source assets:

- the proprietary original tile textures, typefaces, audio stems, or source DCC project;
- live-action footage before/after the gameplay crop.

The renderer therefore treats pixel matching as a measurable calibration target rather than claiming that unavailable source textures are identical.

## Measured composition

The stable frame in `CRUSHZR29980_gameplay3d_p01_006600-034750.mp4` was used as the primary geometric reference.

| Item | Source pixels | 720 × 1280 design coordinates |
| --- | ---: | ---: |
| Output | 1080 × 1920 | 720 × 1280 |
| Playfield left/top | approximately 24 / 210 | 16 / 140 |
| Playfield size | approximately 1032 × 1688 | 688 × 1125 |
| Grid | 21 × 34 | 21 × 34 |
| Cell pitch | approximately 49.1 × 49.6 | 32.76 × 33.09 |

The composition profile is `block-crush-drop.composition.reference.v1`; all browser and video renders use this contract.

## Reference occupancy mask

`#` is a pre-built wooden cube and `.` is an empty well. The exact mask is source-controlled in `levels.ts`.

```text
.....................
.....................
.....................
.....................
#...................#
####..............###
######..........#####
#######...###########
#########.###########
##########.##########
###########...#######
##############.######
###############.#####
#############...#####
############.########
#########...#########
########.############
#####...#############
####.################
####...##############
#######.#############
########...##########
###########.#########
############...######
###############.#####
################.####
##############...####
#############.#######
##########...########
#########.###########
######...############
#####.###############
#####...#############
########.############
```

## Deterministic reference take

The default take contains nine semantic actions. Expected cleared-row counts are:

```text
2, 1, 1, 1, 1, 0, 1, 1, 1
```

This reaches nine cleared rows and 900 points. At 30 fps the presentation compiler produces a roughly 24-second clip, aligned with the duration range of the gameplay references. The sixth action deliberately creates a setup state without clearing; this verifies that placement and clear animation are not incorrectly coupled.

## Package boundary

The game package owns:

- rules, state, actions, schemas, and state hashing;
- presentation phases and semantic events;
- visual skin selection and fracture direction;
- render contract, profiles, capture suite, and Studio workspace.

The platform continues to own:

- game/package registries;
- project/replay validation;
- generic render jobs and MP4 encoding;
- generic Studio routing and headless capture.

No `block-crush-drop` conditional is introduced into generic compiler, exporter, Studio Shell, render job, or capture code.

## Regression gates

Unit tests assert:

1. exact reference clear sequence and final state;
2. deterministic state and presentation hashes;
3. Studio Project V2 validation through the public registries;
4. all presentation phases (`idle`, `fall`, `impact`, `crush`, `collapse`, `settle`, `outcome`);
5. semantic event emission for impact, fracture, collapse, settle, and outcome.

The browser smoke gate captures four 1080 × 1920 PNG anchors:

- `idle.png`
- `fall.png`
- `crush.png`
- `collapse.png`

Their SHA-256 values are recorded in the capture report so future visual changes are explicit and reviewable.
