# Profile content

`data/profile.json` is the editorial source of truth for the GitHub profile and companion site. Project descriptions are deliberately short. They describe the public work without adding client counts, funding, affiliations, production-readiness guarantees, or personal details.

## Source review

Reviewed on 2026-09-16 using the GitHub API through `gh`. All 21 nonempty project URLs resolved as public repositories. The public user profile confirmed the handle `MatthewKim323`, display name `matt`, and bio `for the love of the game`. Sources were read, not executed.

The previous [profile README](https://github.com/MatthewKim323/MatthewKim323/blob/8445ce968e7a58d1c25fc42186cd96a13cc380c9/README.md) is the source for the existing project list, award labels, and the overall `13x hackathon winner` claim. That claim is self-reported. It has been preserved exactly, not incremented or independently verified against event results. The individual award labels do not establish an exhaustive award history.

The contact address `founders@kalilabs.ai` was explicitly supplied by Matt and is also published in the [Syla README](https://github.com/MatthewKim323/syla_export#built-by). Older personal and university email addresses are omitted to avoid redundant contacts. UCSB is mentioned only as the audience for ACE; no attendance, degree, employment, or location is inferred.

| Project | Public source | Basis for the copy |
| --- | --- | --- |
| syla | [README](https://github.com/MatthewKim323/syla_export#readme) | Canvas collection, classroom context, remote MCP, Next.js, TypeScript, Supabase/Postgres. This is a public export, not the live development repository. |
| editskill | [README](https://github.com/MatthewKim323/editskill#readme) | Browser capture, editable Recordly projects, headless Chromium MP4 rendering. Independent automation layer powered by Recordly, not an official Recordly product. |
| 1to1 | [README](https://github.com/MatthewKim323/1to1#readme) | Layout/motion measurement, CLI and skill, pixel-diff verification across breakpoints. |
| nerve | [README](https://github.com/MatthewKim323/agarstra#readme), [package.json](https://github.com/MatthewKim323/agarstra/blob/main/package.json) | The product is Nerve; the public repository is agarstra. Local-first, single-switch input, explicit approvals. Gaze is experimental and not validated with people with disabilities. No mind-reading or medical-grade tracking claim. |
| flow | [README](https://github.com/stephenhungg/flow#readme) | Voice input, generated Gaussian-splat scenes, first-person exploration, narrator. Award label from the previous profile. |
| nami | [README](https://github.com/MatthewKim323/nami#readme) | Pixel-art student counseling, specialists, graph-backed source receipts. Award label from the previous profile. No absolute guarantee of fabrication-free output. |
| jabby | [previous profile](https://github.com/MatthewKim323/MatthewKim323/blob/8445ce968e7a58d1c25fc42186cd96a13cc380c9/README.md) | Discord-native, always-on Claude Code agent. Also directly described by Matt in task context. No public repository was present in the public repository listing. |
| kali v0 | [README](https://github.com/stephenhungg/kali-v0#readme) | Eleven-plus tool context layer for nonprofits with source citations. Award from previous profile. Customer identities, revenue, financial claims, compliance claims, and usage metrics were not carried over. |
| dialed | [README](https://github.com/MatthewKim323/dialed#readme) | Feed classification, agent coordination, interventions. Award from previous profile. No claim that classification accuracy or behavioral outcomes were independently validated. |
| bro | [README](https://github.com/MatthewKim323/bro#readme), [Syla history](https://github.com/MatthewKim323/syla_export#readme) | Important distinction: the public bro repo describes a phase-0 landing foundation and says its app surface is not built there. The old profile and Syla describe a three-award personal-agent project. The new copy preserves the history without claiming the public repo contains a completed agent. |
| ione | [README](https://github.com/MatthewKim323/ione#readme) | Screen-aware math tutoring, OCR/reasoning/intervention, ElevenLabs, Hono, Supabase. Award from previous profile. |
| iris | [README](https://github.com/stephenhungg/iris#readme) | Localized prompt-based video editing, continuity propagation, optional SAM/CLIP worker, FastAPI. The previous profile says only `2nd place`; no event is invented. |
| angel | [README](https://github.com/stephenhungg/angel#readme) | Embodied desktop coworker, Electron, React Three Fiber, Convex, Nia. Award from previous profile. |
| ace | [README](https://github.com/MatthewKim323/aceds#readme) | The product is ACE; the repo is aceds. 104,549 rows over 17 years; XGBoost; PuLP/CBC scheduler. The 44ms figure is the repo-reported p50 across 240 benchmark cases, not a universal runtime guarantee. |
| cadence | [README](https://github.com/MatthewKim323/cadence#readme) | Voice-aware multi-agent writing pipeline with detector feedback. Avoids repeating an absolute claim that AI detection is always beaten. |
| tapn | [README](https://github.com/MatthewKim323/tapn#readme) | Six-agent job pipeline, applications, interview scheduling, voice practice. |
| prodcheck | [repository](https://github.com/MatthewKim323/prodcheck) | Public repository description: eight-dimension production readiness audit skill. |
| seccheck | [repository](https://github.com/MatthewKim323/seccheck) | Public repository description: ten-domain security skill, prompt injection, agent auth, LLM cost caps. |
| prwrite | [repository](https://github.com/MatthewKim323/prwrite) | Public repository description: template-aware PR descriptions, issue references, risk. |
| testwrite | [repository](https://github.com/MatthewKim323/testwrite) | Public repository description: six test categories and project framework matching. |
| contextcheck | [repository](https://github.com/MatthewKim323/contextcheck) | Public repository description: company stack/compliance/pattern alignment. |
| research | [repository](https://github.com/MatthewKim323/research) | Public repository description: company research with gbrain ingestion. |

Repository descriptions and READMEs are primary project-author sources, not independent product audits. Public visibility is not a license grant: some linked repositories expressly retain private or restricted licenses. The profile describes them as projects and tools, not collectively as open source.

## Editorial structure

- Six featured projects balance recent infrastructure and tools (syla, editskill, 1to1, nerve) with existing award-winning work (flow, nami).
- Ten archive entries preserve every remaining project from the previous profile.
- Six tool entries preserve all previously linked engineering skills individually.
- The `now` list is an editorial snapshot of recently published work, not a live activity tracker or promise of ongoing availability.
- All visible copy uses lower case where practical and avoids em dashes.
- `jabby.url` is an empty string. Render its name as plain text; never invent a repository URL or produce an empty anchor.
- Project order in the JSON is intentional. Do not sort by stars, date, or award count at runtime.

## Update guide

1. Edit `data/profile.json`, retaining the same field types. Project IDs must be unique and stable. `category` is `featured`, `archive`, or `tool`; keep `featured` consistent with the category.
2. Check the target repository through `gh api repos/OWNER/REPO`. Confirm it is public before adding its URL. Use canonical GitHub repository URLs, not temporary previews or unverified demo deployments.
3. Read its README and, when needed, its dependency manifest before naming technologies. Keep descriptions specific and short.
4. Ask Matt for the basis of any new award count; do not infer wins from event attendance or add individual entries into the headline count.
5. Add the source and any limitation to this document. Never copy private data or unpublished operational information into public content.
6. Run the repository's generation, validation, and test commands after editing. The generated README and site should use this one dataset.

Public checks can be repeated without accessing private repositories:

```sh
gh api users/MatthewKim323
gh api users/MatthewKim323/repos --paginate
gh api repos/MatthewKim323/editskill/readme --jq .content | base64 --decode
```
