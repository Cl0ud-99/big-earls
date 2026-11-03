# Six-shot visual regression

Build under test: `077fde1` — paint detail / dust / edge-wear pass
Baseline: `0fd0a93` — original checkout
Viewport: 1600 × 900, DPR 1, Chrome headless, desktop GPU path
Capture tool: `node tools/regression.mjs <url> <prefix>`

## Per-shot pixel comparison

| Shot | Mean abs diff / 255 | p95 | p99 | Pixels > 8 levels | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| 01 Arrival | 2.70 | 6 | 20 | 4.3% | new canopy/pump detail visible at distance |
| 02 The Sign | 5.04 | 15 | 103 | 8.8% | intentional: service ladder and sign frame added |
| 03 Service | 3.84 | 10 | 46 | 8.5% | pump paint-detail maps and bay hardware |
| 04 Golden Hour | 3.76 | 9 | 44 | 7.4% | paint/dust pass and 2048 shadow map |
| 05 Neon | 3.33 | 8 | 32 | 7.1% | practical-light scene, same composition |
| 06 Deadlock Gorge | 2.61 | 6 | 14 | 3.1% | silhouette unchanged |

**Verdict:** no blank frames, no missing geometry, no broken signage, no page errors. The larger per-pixel deltas are concentrated on deliberately added hero details (sign ladder, pump trim, paint wear, canopy gutters, edge rust) and the switch to a 2048 shadow map on HIGH quality.

## Acceptance checklist

- [x] All six shots load and render without page errors
- [x] Title/end cards and HUD hide correctly for a clean frame
- [x] Station, canopy, pumps, vehicles, sign, billboards and cliffs present
- [x] Water puddles and creek reflection remain visible
- [x] Day/golden/dusk/night transition still works
- [x] No dropped or floating hero props observed
- [x] `npm run build` and `npm run standalone` pass
- [x] `npm run perf` remains near the 680–690 draw-call budget

## Local comparison assets

`shots/regression/` contains `baseline-01..06.png`, `current-01..06.png` and `contact.png`. They are local review captures and are ignored by git.
