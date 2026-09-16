# Developing this profile

This repository produces a GitHub profile README and a companion page from shared content and a shared moonlit ocean renderer. Engineering details stay in these documents, not in the public introduction or project list.

The companion page is published at [matthewkim323.github.io/MatthewKim323](https://matthewkim323.github.io/MatthewKim323/). The repository path is part of the Pages URL.

## Local workflow

Use Node 24 from `.nvmrc`.

```sh
npm ci
npm run check
npx playwright install chromium
npm run test:e2e
npm run dev
```

`check` generates assets, runs unit tests, and builds the site. `dev` serves only the built `dist/` directory and prints its URL. After source edits, run `npm run check` again before browser verification.

## Content and assets

Edit `data/profile.json` for biography, links, and project descriptions. The public README and site contain 16 projects; the six `tool` category records are retained only as editorial reference. Keep the same filtering rule in both generators. Research sources and claim boundaries live in [CONTENT.md](CONTENT.md).

Run `npm run generate` after content or renderer changes. Do not hand-edit generated README sections or graphics. `scripts/site-content.mjs` writes the public portfolio into HTML at build time, including the archive and contacts. JavaScript enhances the scene and preference controls; it does not construct or fetch the project list.

`npm run stats` uses the authenticated `gh` CLI to refresh `data/activity.json`. The fetcher validates the response before writing; a failure preserves the committed snapshot. Generation and tests work offline with that snapshot. Activity describes GitHub-reported contributions and public repository language bytes, with the date range retained in the data.

## Ocean motion

`src/ocean-core.mjs` supplies the same 144 by 58 reference composition and 18-second cycle to Canvas and SVG adapters. The browser animates the ocean locally. GitHub displays a sampled SVG loop. See [OCEAN.md](OCEAN.md) for rendering details.

The scene supports light and dark palettes, a still fallback, and reduced motion. The site provides pause/resume and suspends rendering while hidden or offscreen. Motion is independent of pointer movement. Fonts and scripts are local; no external service is needed to animate the scene.

When changing export quality, compare motion smoothness, file size, and the loop seam at actual profile width. Frame count is an implementation choice, not a public-facing feature or a fixed content contract.

## Verification

Run `npm run check` and `npm run test:e2e`. Keep tests aligned with the ocean experience: deterministic frames, cycle continuity, actual visible wave motion, pause persistence, reduced motion, theme changes, and hidden/offscreen suspension. Content checks must cover all 16 public projects and ensure editorial-only skill records are excluded.

Inspect the README in GitHub's renderer and the site at desktop and mobile sizes. Check the still fallback with JavaScript disabled and with the renderer unavailable. Confirm readable colors in both themes, no horizontal overflow, and usable keyboard navigation. Automated accessibility checks supplement visual and keyboard inspection.

## Publishing and rollback

`Validate and publish` runs validation, browser checks, and the build, then publishes validated `main` builds through GitHub's Pages artifact flow. `Refresh profile` runs daily at 10:23 UTC or by manual dispatch. Its successful completion triggers validation and publication because its `GITHUB_TOKEN` push does not trigger ordinary push workflows. Actions are pinned to immutable commits and permissions are scoped to their jobs.

Scheduled runs can be delayed. A failed refresh leaves existing graphics available; inspect the failed Actions run for diagnostics. After release, verify the public profile, Pages address, and latest workflow result. Roll back with a normal revert commit, without rewriting shared history.

Keep commits focused on meaningful milestones. Never add credentials, environment files, private repository contents, or personal messages to the content snapshot.
