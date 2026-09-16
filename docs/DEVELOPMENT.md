# Developing this profile

This repository builds two public surfaces from one set of content and one ASCII character engine:

- `README.md` and `assets/`: the profile displayed on github.com/MatthewKim323.
- `site/`: the interactive companion published through GitHub Pages.

The Pages address is **https://matthewkim323.github.io/MatthewKim323/**. This repository is named after the account, not `MatthewKim323.github.io`, so its Pages URL has a repository path.

## Local development

Use Node 24 (`.nvmrc`). Install with `npm ci`, then run `npm run check` and `npm run dev`. The server prints its URL and serves only the built `dist/` directory. After source edits, rebuild with `npm run build`.

`npm test` runs deterministic engine, content, generation, and build tests. `npm run test:e2e` runs desktop/mobile browser behavior and accessibility checks after `npx playwright install chromium`. CI installs its browser independently.

## Content and generated files

Edit `data/profile.json` for biography, links, and project descriptions. Run `npm run generate` to update the profile. Do not hand-edit generated README sections or graphics: generation replaces them. Research sources and claim boundaries live in `docs/CONTENT.md`.

`npm run stats` reads GitHub through the authenticated `gh` CLI. It writes a validated public activity snapshot to `data/activity.json`. `npm run generate` then draws the activity graphic. Rendering and tests also work offline with the committed snapshot. A failed network refresh leaves the last successful snapshot intact.

## Motion and accessibility

GitHub renders the bot as an SVG image with a deterministic idle animation. Images cannot read cursor coordinates. The Pages version uses the same geometry and character palette with real pointer input, independent eye/head movement, keyboard controls, a pause switch, reduced-motion behavior, and touch support. There is no model inference or backend in the interaction.

Each SVG includes a static first pose and a reduced-motion fallback. Light and dark images are selected with `picture`. The site hosts its own font and scripts; no runtime third-party requests are needed.

## Publishing

The CI workflow validates changes, checks browser behavior, and builds the site. The Pages workflow publishes only validated `main` builds through GitHub's artifact deployment. A daily activity refresh commits only changed generated content and then deploys that same validated snapshot. Workflow permissions are scoped to each job.

Keep commits focused on meaningful milestones. Never add credentials, local environment files, private repositories, or personal messages to the content snapshot.
