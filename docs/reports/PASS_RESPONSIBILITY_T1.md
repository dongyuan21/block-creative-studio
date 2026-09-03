# Pass responsibility table (T1)

T1 is still one `Reference2DScene` with pass conditionals, not independently reusable Pass modules.

| Pass | Scene methods | Isolation | Honest notes |
|---|---|---|---|
| background | `drawBackground`, ambient petals/flower | save/restore; independent seededFloat ids | |
| board | board frame + slots | skipped when pass disabled | |
| tile | occupied cells / dissolving clear cells | skipped independently of board | |
| tray | `drawRack` | save/restore | |
| interaction | drag, ghost, pointer | save/restore | |
| placement | placement glow / thumb | save/restore | |
| clear | sweep, sparks, cell exit | save/restore | Current 2D implementation also draws praise here when `feedbackFx === 'praise-combo'`. |
| feedback | HUD / score | save/restore | `passes.ts` assigns praise/combo to feedback; the paint still lives in the clear pass. |
| endgame | continue modal | save/restore | |

Native capture draws at 1064×1788 with presentation-frame time. Overlay / guides are not in this paint path. Formal capture (`captureReferenceFrame` / `captureNativeFrame`) requires runtime assets; `capturePreviewFrame` is the explicit non-authoritative fallback path.
