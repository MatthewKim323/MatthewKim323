# Profile content

`data/profile.json` is the editorial source of truth for the GitHub profile and companion site. Both surfaces use the same biography, links, descriptions, awards, and project ordering. Engineering explanations stay in `docs/`.

## Primary portfolio source

At Matt's request, identity, current focus, contact details, and case-study content were reconciled against his portfolio in `~/dev/newmatt` on 2026-09-16:

- `src/data/portfolio.ts`: biography, tagline, education, location, interests, email, social links, and resume.
- `src/data/case-studies.ts`: project descriptions, technologies, award labels, and preferred project ordering.
- `src/lib/agent-content.ts`: canonical site address, [mykm.dev](https://mykm.dev).

The local working copy was read without changing it. It contains newer event labels than the previous GitHub README. Those labels take precedence. All fourteen case-study URLs, the portfolio homepage, and the resume returned HTTP 200 without redirects. Case-study titles and descriptions matched the corresponding source records; the resume response was a valid PDF. HTTP verification checks routing and metadata, not interactive product behavior.

The headline `13 hackathon wins in 6 months` comes from the portfolio and is self-reported. It is not recalculated from project entries. Nine winning projects can have multiple awards. The portfolio's separate `13 shipped systems` statistic is stale against its fourteen case studies, so it is not reproduced.

The personal contact is `matthewykim23@gmail.com`, as explicitly published in the portfolio. LinkedIn, X, Devpost, GitHub, and the resume use its canonical links. The source also lists `founders@kalilabs.ai` as a company contact; the public profile uses one primary email. Location and education copy follows `SAN FRANCISCO / UCSB` and `UCSB · STATS & DATA SCIENCE · ECON`. No graduation, completed degree, or employer affiliation beyond the stated Kali Labs work is inferred.

## Selected work

Selected work contains only projects explicitly identified as winners in the portfolio, plus jabby. It follows the portfolio's preferred order after filtering. Event participation alone is not a win.

| Project | Portfolio source | Award |
| --- | --- | --- |
| agartha | [case study](https://mykm.dev/work/agartha) | InsForge winner at AGI Summit 2026 |
| jabby | [case study](https://mykm.dev/work/jabby) | Personal always-on agent, no award claimed |
| angel | [case study](https://mykm.dev/work/angel) | Best Overall at Nozomio AI Agents Hackathon |
| iris | [case study](https://mykm.dev/work/iris) | 2nd place overall at CitrusHacks |
| nami | [case study](https://mykm.dev/work/nami) | 1st at FullyHacks |
| ione | [case study](https://mykm.dev/work/ione) | 1x winner at BroncoHacks |
| kali v0 | [case study](https://mykm.dev/work/kali-v0) | 1x winner at HackDavis |
| flow | [case study](https://mykm.dev/work/flow) | 2x winner at SBHacks |
| dialed | [case study](https://mykm.dev/work/dialed) | 2x winner at BeachHacks |
| bro | [case study](https://mykm.dev/work/bro) | 3x winner at DesignVerse |

Descriptions are condensed from the portfolio. Stacks are short subsets of its technology lists. Bro's copy describes the hackathon project documented in its case study; its GitHub repository previously described a later landing-page foundation. Linking the case study makes that distinction clear without adding implementation caveats to the public introduction. Jabby also links to its real case study rather than an invented public repository.

## Archive and retained sources

The other portfolio projects stay in the collapsed archive:

| Project | Source | Editorial treatment |
| --- | --- | --- |
| itto | [case study](https://mykm.dev/work/itto) | Minecraft co-op companion; no win claimed. |
| gopal | [case study](https://mykm.dev/work/gopal) | Real-time voice and vision companion; OpenAI Hack Night is an event, not an award. |
| cadence | [case study](https://mykm.dev/work/cadence) | Voice-aware writing agents; DiamondHacks is an event, not an explicit award result. Avoid the absolute claim that AI detection is always beaten. |
| tapn | [case study](https://mykm.dev/work/tapn) | Six-agent job pipeline; no win claimed. |

Five previously reviewed public projects remain in the archive. They are supplemental work absent from the portfolio's case-study set, not selected work or evidence of additional hackathon wins:

| Project | Public source | Basis for the copy |
| --- | --- | --- |
| syla | [README](https://github.com/MatthewKim323/syla_export#readme) | Canvas collection, academic context, remote MCP, Next.js, TypeScript, Postgres. Public export of the project. |
| editskill | [README](https://github.com/MatthewKim323/editskill#readme) | Browser capture, editable Recordly projects, headless Chromium MP4 rendering. Independent automation layer, not an official Recordly product. |
| 1to1 | [README](https://github.com/MatthewKim323/1to1#readme) | Layout/motion measurement and pixel-diff verification across breakpoints. |
| nerve | [README](https://github.com/MatthewKim323/agarstra#readme) | Nerve is the product name; agarstra is the repository. Local-first, single-switch input, explicit approval. Gaze remains experimental. |
| ace | [README](https://github.com/MatthewKim323/aceds#readme) | XGBoost over 104,549 course rows and 17 years of grades; PuLP/CBC scheduler. The 44ms p50 is repository-reported across 240 benchmark cases, not a universal guarantee. |

These repository sources were reviewed through the GitHub API on 2026-09-16. The original [profile README](https://github.com/MatthewKim323/MatthewKim323/blob/8445ce968e7a58d1c25fc42186cd96a13cc380c9/README.md) supplied the earlier project history. Six skill records remain in the dataset for editorial reference only and are excluded from both public surfaces.

Author-written portfolios and READMEs are primary project sources, not independent product audits. Public repository visibility does not imply an open-source license. Do not add funding, customer, revenue, compliance, or production-readiness claims.

## Editorial rules

- Ten selected entries and nine archive entries are public. The six tool entries stay hidden.
- The portfolio is the primary reference for biography, contacts, case studies, and awards. Supplemental public work belongs in the archive unless Matt selects it.
- The `now` list condenses the portfolio's current interests. It is an editorial snapshot, not a live tracker or availability promise.
- Section and project labels have no decorative numbering. The tools section and public build explanation remain removed.
- Public copy uses lower case where practical and avoids em dashes.
- A project without a verified public destination can have an empty URL. Render its name as text without an empty anchor.
- Project order in the JSON is intentional. Do not sort by stars, date, or award count at runtime.

## Update guide

1. Review the corresponding portfolio source before editing `data/profile.json`. Preserve field types and stable project IDs. Keep `featured` consistent with `category`.
2. For portfolio projects, use verified canonical `https://mykm.dev/work/SLUG` case-study links. For supplemental work, confirm the repository is public through `gh api repos/OWNER/REPO` and read its README.
3. Keep descriptions specific and brief. Select technologies from the source's stack without inventing usage or outcomes.
4. Do not infer award results from event attendance, or calculate the headline award count by adding project labels.
5. Record sources and material limitations here. Never copy private messages or unpublished operational information into the public content.
6. Run generation, validation, and tests. Verify selected/archive membership and ordering in both the README and site.
