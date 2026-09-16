# The moonlit ocean

The scene is a quiet ocean beneath a moon. A stable horizon anchors the composition while waves and reflected light move through a grid of ASCII characters. It is decorative, with no gaze tracking, direction controls, or response to pointer position.

## Shared scene contract

`src/ocean-core.mjs` exports `renderOcean` for both the browser and offline asset generator. The reference composition uses 144 columns and 58 rows. Its full cycle lasts 18 seconds.

Frame content is determined by scene geometry and periodic wave math. Identical inputs produce identical output, independent of browser font measurement or network access. Time wraps at the cycle boundary so the loop can repeat continuously. The adapters preserve matching glyph-cell proportions and supply the appropriate light or dark palette.

Keep the moon, horizon, and water readable when the full image is scaled to GitHub profile width. Character density should describe the scene, not make the water flicker like noise. Changes to wave timing must preserve the 18-second loop and its seam.

## Two rendering adapters

The browser draws frames to Canvas using local font assets. It owns animation scheduling, device scaling, theme changes, pause state, reduced-motion preferences, and offscreen/hidden-document suspension.

The SVG adapter uses a fixed glyph layout and samples brightness at 24 evenly spaced times. At most three neighboring glyphs of the same color share a brightness curve, keeping the image below 1 MB. SVG interpolates these curves over 18 seconds; the last value equals the first to close the loop. The Canvas adapter updates individual glyphs and brightness at 24 fps. Both share the composition and wave timing, rather than promising pixel-identical frames.

The animated SVG has a separate still presentation for reduced motion. Its markup exactly matches the standalone still asset. Without animation support, the animated layer retains its initial opacity values.

The static image must depict this same ocean. It remains available before the browser renderer starts or if rendering fails. Portfolio content, disclosure controls, and contact links are generated independently and remain usable without JavaScript.

## Motion behavior

- Reduced motion starts with a still scene.
- Pause freezes the visible scene; resume continues the local animation.
- Hidden documents and offscreen scenes stop scheduling rendering work.
- Returning to the scene must not trigger a large catch-up step or visible discontinuity.
- Theme changes update colors while preserving the composition.
- Pointer movement has no effect on the waves or moon.

These are implementation requirements, not copy for the public profile. Keep the public surface focused on the scene and Matt's work.

## Verification

Run `npm test` for deterministic scene, content, and generated-asset checks, then `npm run test:e2e` for browser behavior. Verify dimensions, valid ASCII output, repeatable frames, cycle equality, and continuity near the wrap point. Compare distinct timestamps to confirm visible motion rather than only changing internal counters.

Inspect the exported loop and live Canvas side by side in both themes. Check the moon's silhouette, horizon stability, water texture, reflection, frame transitions, and the loop seam at desktop and mobile widths. Exercise pause/resume, reduced motion, hidden/offscreen suspension, and the still fallback.
