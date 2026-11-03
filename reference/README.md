# Reference & proportion board

This folder is the calibration step before adding modeling detail: it records
what the current scene actually measures, and gives a clean place to compare it
against external Overwatch / Route 66 reference screenshots.

The project is a fan recreation and does not ship Blizzard assets. Use
reference screenshots only for visual comparison; do not commit them here.

## Files

- `current/*.jpg` — generated calibration captures (ignored by git; run `npm run calibrate` to rebuild)
- `measurements.json` — measured world-space bounds from the current build
- `board.html` — side-by-side comparison board; open it locally and load a
  reference screenshot into any card

Regenerate the current captures and measurements with:

```bash
npm run serve       # terminal 1
npm run calibrate   # terminal 2
```

## Current measured dimensions (meters)

| Landmark | X | Y | Z | Notes |
| --- | ---: | ---: | ---: | --- |
| Station overall | 20.04 | 11.45 | 17.05 | includes roof sign and work-yard props attached to the station group |
| Canopy | 19.81 | 5.05 | 7.50 | canopy top ≈ 5.02 m; underside ≈ 4.04 m |
| Roof sign | 12.15 | 6.78 | 0.89 | includes service ladder; top at 11.40 m |
| Water tower | 6.27 | 12.24 | 6.05 | top at 12.24 m |
| Pump island (each) | 3.36 | 3.23 | 1.76 | centers at x = -4.4 m and x = 1.9 m; 6.3 m apart |

## Reference shot list

Capture or collect these views at the same framing as `current/`:

1. **Front elevation** — camera roughly 5.4 m high, 42 m in front, 22° vertical FOV.
2. **Left elevation** — 42 m to the left of the station center.
3. **Top / roof** — high oblique view showing canopy, roof equipment and forecourt layout.
4. **3/4 hero** — the angle used by the main marketing screenshot.
5. **Pump island close-up** — one pump, one island, one hose/nozzle, from eye level.
6. **Canopy fascia + column** — rivets, seams, gutter and light fixtures.
7. **Roof sign + tower** — letter edges, bulbs, cable runs and ladder.
8. **Road approach** — guardrail, billboard, pylon and station silhouette.

## What to compare first

1. **Silhouette ratios** — station width vs canopy width vs sign tower height.
2. **Canopy height** — in the reference the underside should feel low and wide, not a tall box.
3. **Pump island spacing and scale** — a pump should read against a human/vehicle, not float in an oversized forecourt.
4. **Road relationship** — forecourt depth and the road angle drive every shot.
5. **Landmark positions** — water tower left/behind, billboard right, GAS pylon left of the canopy.

Record any deliberate deviations in a short note on the board; that keeps
"stylized choice" separate from "wrong proportion".
