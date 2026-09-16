# The floating companion

The character is an original soft orb with two rounded vertical capsule eyes. Its slightly egg-shaped body, small eye tilt and slow float give it a curious, friendly expression. There is no mouth, antenna, armor, visor or torso. The geometry is procedural and does not use a copied logo, stock character, downloaded model or remote image.

## Engine contract

`src/bot-core.mjs` is a pure ES module shared by the browser and offline asset generator. It has no package dependencies and works in Node without a DOM.

```js
import { renderAscii, idlePose, advanceSpring } from './src/bot-core.mjs';
const frame = renderAscii({ cols: 96, rows: 50, ...idlePose(2.5) });
// frame.lines: exact-width ASCII rows, including spaces
// frame.tones: Uint8Array indexed by row * frame.cols + column
```

Use glyph cells with a width to height ratio of `CHARACTER_ASPECT`, which is 0.5. For example, a 7px glyph advance uses a 14px row advance. The projection accounts for this ratio; a different font cell ratio stretches the character. Place each glyph on that explicit grid when rendering to Canvas or SVG.

Palette indices are 0 for empty background, 1 for soft shadow, 2 for the body, 3 for highlights and 4 for the eyes. The caller supplies the actual colors. All glyphs are printable ASCII. Nonempty cells always have a nonzero tone.

Yaw and pitch are radians, clamped to +/-0.7 and +/-0.4. Optional roll is clamped to +/-0.25 and defaults to the small tilt of the idle loop. Gaze X/Y use normalized values in [-1, 1], with positive Y looking up. Browser pointer Y usually increases downward, so the adapter negates it for gaze. Blink is in [0, 1]. Grid dimensions are bounded to 16 to 200 columns and 12 to 120 rows. Invalid numeric inputs fall back to defaults.

## Geometry and shading

Each cell casts an orthographic ray through an ellipsoid. Inverse rotation brings that ray into the character's local coordinates, and an exact quadratic intersection locates the visible surface. The analytical ellipsoid gradient supplies its normal. A fixed world-space light adds broad, soft shading and a restrained highlight. This is true 3D rotation rather than a skewed ASCII string or flat image.

Both eyes are capsule distance fields in object coordinates. They rotate with the face and shift independently to follow gaze. A blink smoothly reduces their height until each becomes a small horizontal capsule. They remain separate and readable at mobile resolution.

No randomness or environment-specific font measurement affects frame content. Identical arguments produce identical glyphs and tones. Analytical intersections avoid a ray-marching loop or graphics runtime. The browser adapter paints the resulting cells to Canvas; the offline adapter serializes them into SVG and GIF.

## Motion

This is decorative motion on a personal profile, intended for first-visit delight and pointer feedback. `idlePose` repeats every 12 seconds with continuous looking, a gentle float, slight tilt and two compact blink pulses. Its first and last pose are identical. Negative times wrap correctly. The core derives floating and default tilt from the same loop time, so both remain continuous even when adapters only forward the original pose fields.

`advanceSpring` carries velocity across target changes and uses the animate skill's traditional spring preset: stiffness 100, damping 10, implicit unit mass. Numerical integration is substepped at least 120 times per simulated second, with additional steps for high damping. Catch-up is capped at 250ms to bound work after a suspended tab. The caller should reset its animation timestamp after a visibility change.

The browser layer owns pointer gating, keyboard controls, pause state, reduced-motion preference, offscreen/hidden-tab suspension and accessible descriptive text. Reduced-motion mode renders a stable pose and applies deliberate direction changes immediately.

## Verification

Run `node --test tests/bot.test.mjs`. Tests cover ASCII-only output, exact dimensions, color/grid coherence, two distinct mobile-readable capsule eyes, changing geometry, independent gaze, blinks, deterministic output, invalid-input bounds, exact idle looping, seam continuity, spring convergence, interruption and extreme frame gaps.
