# Developing this profile

This repository builds two public surfaces from one set of content and one ASCII character engine:

- `README.md` and `assets/`: the profile displayed on github.com/MatthewKim323.
- `site/`: the interactive companion published through GitHub Pages. The build writes all project content into HTML, so every entry and the native archive disclosure work without JavaScript.

The Pages address is **https://matthewkim323.github.io/MatthewKim323/**. This repository is named after the account, not `MatthewKim323.github.io`, so its Pages URL has a repository path.

## Local development

Use Node 24 (`.nvmrc`). Install with `npm ci`, then run `npm run check` and `npm run dev`. The server prints its URL and serves only the built `dist/` directory. After source edits, rebuild with `npm run build`.

`npm test` runs deterministic engine, content, generation, and build tests. `npm run test:e2e` runs desktop/mobile browser behavior and accessibility checks after `npx playwright install chromium`. CI installs its browser independently.

## Content and generated files

Edit `data/profile.json` for biography, links, and project descriptions. Run `npm run generate` to update the profile. Do not hand-edit generated README sections or graphics: generation replaces them. Research sources and claim boundaries live in `docs/CONTENT.md`.

`npm run stats` reads GitHub through the authenticated `gh` CLI. It writes a validated public activity snapshot to `data/activity.json`. `npm run generate` then draws the activity graphic. Rendering and tests also work offline with the committed snapshot. A failed network refresh leaves the last successful snapshot intact.

## Motion and accessibility

GitHub renders the bot as an SVG image with a deterministic idle animation. Images cannot read cursor coordinates. The Pages version uses the same geometry and character palette with real pointer input, independent eye/head movement, keyboard controls, a pause switch, reduced-motion behavior, and touch support. There is no model inference or backend in the interaction.

Each SVG includes a static first pose and a reduced-motion fallback. The 12-second performance has 96 poses. Light and dark images are selected with `picture`. The site hosts its own font and scripts; no runtime third-party requests are needed. JavaScript enhances gaze, theme, and motion controls; it does not fetch or construct the portfolio content.

## Publishing

The `Validate and publish` workflow validates changes, checks browser behavior, and builds the site. It publishes only validated `main` builds through GitHub's artifact deployment. `Refresh profile` runs daily at 10:23 UTC and can also be dispatched manually. It validates fetched data and generated files before committing only changed content. Its completion triggers a fresh validation and publication, because pushes made with `GITHUB_TOKEN` do not trigger ordinary push workflows. Workflow permissions are scoped to each job, and actions are pinned to immutable commits.

GitHub may delay scheduled runs. If a refresh fails, committed graphics keep loading; its failed Actions run is the diagnostic. No live stats service is required for profile visitors.

## Character design

The character is an original floating orb with rounded pill eyes, a curious tilt, and a gentle idle performance. A shared renderer keeps the GitHub image and live interaction consistent. The first armored concept remains in commit history; the shipped design follows the softer reference selected by matt.

## Verification and release

Run `npm run check`, then `npm run test:e2e`. Browser checks cover actual rendered pose changes, pause persistence, reduced motion, theme persistence, offscreen suspension, complete content without JavaScript, renderer failure, mobile overflow, and automated WCAG checks in both themes. Automated accessibility tests supplement keyboard and visual inspection; they do not constitute an accessibility certification.

Before publishing, inspect the generated README in GitHub's renderer and the site at desktop and mobile sizes. Verify the public profile, Pages deployment, and last Actions run after the main branch update. To roll back, revert the relevant commit and push normally; never rewrite shared history.

Keep commits focused on meaningful milestones. Never add credentials, local environment files, private repositories, or personal messages to the content snapshot.
