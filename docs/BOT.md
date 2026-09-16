# KIM/01 renderer

KIM/01 is original geometry: a rounded armored helmet, tapered jaw, separate temple housings, chamfered visor, narrow emissive eyes and stationary shoulders. It does not use a stock character, copied logo, remote image or model download.

## Engine contract

`src/bot-core.mjs` is a pure ES module shared by the browser and offline asset generator. It has no package dependencies and works in Node without a DOM.

```js
import { renderAscii, idlePose, advanceSpring } from './src/bot-core.mjs';
const frame = renderAscii({ cols: 96, rows: 50, ...idlePose(2.5) });
// frame.lines: exact-width ASCII rows, including spaces
// frame.tones: Uint8Array indexed by row * frame.cols + column
```

Use glyph cells with a width to height ratio of `CHARACTER_ASPECT`, which is 0.5. For example, a 7px glyph advance uses a 14px row advance. The projection accounts for this ratio; a different font cell ratio will stretch the character. Place each glyph on that explicit grid when rendering to Canvas or SVG.

Palette indices are 0 for empty background, 1 for shadows and the visor, 2 for the shell, 3 for highlights and 4 for the emissive eyes. The caller supplies the actual colors. All glyphs are printable ASCII. Nonempty cells always have a nonzero tone.

Yaw and pitch are radians, clamped to +/-0.7 and +/-0.4. Gaze X/Y use normalized values in [-1, 1], with positive Y looking up. Blink is in [0, 1]. Grid dimensions are bounded to 16 to 200 columns and 12 to 120 rows. Invalid numeric inputs fall back to defaults.

## Geometry and shading

Each cell casts an orthographic ray through a signed distance field. The camera ray is inverse-rotated into head space, then conservatively sphere-traced against the tapered rounded shell and temple housings. The gradient of the same field supplies the normal. A fixed world-space light gives diffuse metal shading, a restrained highlight and an edge response as the head turns. The torso and neck use analytical ellipsoid intersections and compete with the head in a depth test.

The visor and seams are defined in object coordinates, so they rotate with the geometry. Eye position moves independently in visor space. A blink collapses the eye opening. This is actual 3D head rotation; neither the ASCII string nor a flat image is skewed to simulate it.

No random sampling or environment-specific font measurement affects frame content. Identical arguments produce identical glyphs and tones. Rendering is CPU-based because this modest grid does not require a 3D runtime or WebGL initialization. The browser adapter can render the resulting cells to Canvas, while the offline adapter can serialize them into SVG and GIF.

## Motion

This is decorative motion on a personal profile, intended for first-visit delight and pointer feedback. `idlePose` repeats every 12 seconds with continuous head motion, subtle breathing and two compact blink pulses. Its first and last pose are identical. Negative times wrap correctly.

`advanceSpring` carries velocity across target changes and uses the animate skill's traditional spring preset: stiffness 100, damping 10, implicit unit mass. Numerical integration is substepped at least 120 times per simulated second, with additional steps for high damping. Catch-up is capped at 250ms to bound work after a suspended tab. The caller should reset its animation timestamp after a visibility change.

The browser layer owns pointer gating, keyboard controls, pause state, reduced-motion preference, offscreen/hidden-tab suspension and accessible descriptive text. None of these policies should be bypassed by the pure renderer. In particular, reduced-motion mode should render a stable pose and apply user-requested direction changes immediately.

## Verification

Run `node --test tests/bot.test.mjs`. Tests cover ASCII-only output, exact dimensions, color/grid coherence, mobile eye visibility, changing geometry, independent gaze, blinks, deterministic output, invalid-input bounds, exact idle looping, seam continuity, spring convergence, interruption and extreme frame gaps.
