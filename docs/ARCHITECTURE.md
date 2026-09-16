# A profile with a living character

## Data flow

`data/profile.json` is the editorial source for identity, contact links, project descriptions, awards, and current interests. Strict validation rejects malformed data before publishing. `scripts/generate.mjs` creates the profile README and self-contained SVGs. `scripts/site-content.mjs` creates static HTML from the same records.

`src/bot-core.mjs` contains pure geometry and motion math. It has no browser or network dependencies. The image generator samples its deterministic 12-second idle performance into 96 SVG frames. The website passes live gaze and spring states to the same renderer, then draws the resulting glyphs with a cached font atlas.

The interactive experience is a separate GitHub Pages document. GitHub profile READMEs cannot run scripts or receive pointer coordinates through an embedded SVG. The profile image links directly to the live companion rather than implying that its idle animation is cursor tracking.

## Rendering choices

- ASCII is generated from geometry, not a collection of hand-drawn animation frames.
- A fixed character cell aspect ratio preserves the shape across the SVG and Canvas renderers.
- Fonts are local. The website uses the upstream JetBrains Mono font; images embed a renamed ASCII subset under the included SIL Open Font License.
- The SVG first pose is visible without animation support. A media query selects the still pose when reduced motion is preferred.
- The website makes pointer events cheap: they update targets; animation work occurs in the frame loop.
- The glyph atlas avoids repeatedly rasterizing every character. Device pixel ratio is capped, drawing adapts to measured cost, and hidden/offscreen views suspend the loop.
- Reduced motion starts still. Deliberate keyboard direction controls respond immediately. The user can explicitly enable motion.
- The entire portfolio is present before scripts execute. If the character module fails, the matching still image remains and all links still work.

## Activity integrity

The activity fetcher uses the GitHub GraphQL API through `gh`. The contribution calendar is GitHub-reported activity for the credential making the request. Aggregate private contribution visibility follows GitHub and account settings; no private repository names or contents are collected. Language distributions count bytes in owned public non-fork repositories, not skill proficiency or time spent coding.

Snapshots include their actual date range and refresh date. Fetching and generation are separate so local builds remain deterministic and offline. A failed or malformed API response does not replace the prior snapshot. Metrics are computed from the day records and reconciled before drawing.

## Security and maintenance

The public site is static, with no API keys, inference service, analytics, cookies, account flow, or runtime third-party scripts. Theme and pause choices use local storage when available. Every project and contact URL is validated and text is escaped in its output context.

Production deployment packages only `dist/`. Source tests, local state, and development dependencies are excluded. The two workflows separate scheduled content mutation from read-only validation and scoped Pages deployment. Publishing uses GitHub's OIDC-backed Pages action, not a custom deployment token.
