# Pass responsibility table (T1)

| Pass | Scene methods | Isolation |
|---|---|---|
| background | `drawBackground`, ambient petals/flower | save/restore; independent seededFloat ids |
| board | board frame + slots | skipped when pass disabled |
| tile | occupied cells / dissolving clear cells | skipped independently of board |
| tray | `drawRack` | save/restore |
| interaction | drag, ghost, pointer | save/restore |
| placement | placement glow / thumb | save/restore |
| clear | sweep, sparks, praise draw in clear fx | save/restore |
| feedback | HUD / score | save/restore |
| endgame | continue modal | save/restore |

Native capture draws at 1064×1788 with presentation-frame time. Overlay / guides are not in this paint path.
