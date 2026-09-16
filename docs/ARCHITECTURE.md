# Profile architecture

Maintenance documentation belongs here. The public profile presents Matt, the moonlit ocean, and the work without a rendering tutorial or engineering controls beyond theme and motion preferences.

## Content flow

`data/profile.json` is the editorial source for identity, contact links, project descriptions, awards, and current interests. `scripts/lib.mjs` validates it before generation. `scripts/generate.mjs` writes the profile README and SVG assets; `scripts/site-content.mjs` generates the companion site's HTML from the same records.

The public surfaces show 16 projects. Six records with `category: "tool"` remain in the editorial source for reference and are excluded from public output. Project ordering is editorial. No client fetch is needed to read the biography, projects, archive disclosure, or contact links.

## Shared ocean renderer

`src/ocean-core.mjs` exports `renderOcean`, a deterministic renderer shared by the browser and asset generator. Its reference composition is a 144-column by 58-row ASCII grid with an 18-second cycle. Procedural geometry and periodic wave math produce a moonlit ocean; both adapters consume the same frame content.

- The image adapter samples the cycle into self-contained SVG animation. Its first frame remains visible without animation support, and reduced-motion preferences select a still image.
- The browser adapter draws the grid to Canvas with local font assets. It owns timing, theme selection, pause state, and suspension when the document is hidden or the scene is offscreen.
- Matching cell proportions preserve the composition across renderers. Light and dark palettes change presentation without changing the scene.
- A matching still image remains available before JavaScript starts and if rendering fails. The site content and links remain usable independently of the animation.

The ocean is decorative and runs on its own timeline. There are no gaze targets, direction buttons, or pointer-driven scene controls. See [OCEAN.md](OCEAN.md) for the scene contract and verification criteria.

## Activity integrity

The refresh script reads GitHub GraphQL through `gh`. Contribution totals reflect GitHub's response for the active credential; aggregate private contribution visibility follows GitHub and account settings. No private repository names or contents are collected. Languages measure bytes in owned public non-fork repositories, not proficiency or time spent coding.

Snapshots retain their actual date range and refresh date. Validation checks real dates, continuous ordering, weekdays, exact totals, and language percentages before a new snapshot replaces the old one. Fetching is separate from generation, so rendering remains deterministic and works offline.

## Deployment boundary

The site is static: no API keys, inference service, analytics, cookies, account flow, or runtime third-party scripts. Optional local storage remembers theme and pause preferences. URLs are validated and text is escaped for its output context.

Only `dist/` is published. Source tests, local state, and development dependencies stay outside the deployment artifact. Separate workflows handle scheduled content refresh and validation with scoped GitHub Pages deployment permissions. Pages publishing uses GitHub's artifact and OIDC flow.
