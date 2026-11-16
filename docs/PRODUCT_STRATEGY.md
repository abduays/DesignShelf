# DesignShelf Product Strategy

**Working release:** 0.8.3 development build  
**Product category:** Local-first browser design research workspace

## Product promise

DesignShelf helps designers and frontend developers understand real interfaces, preserve useful components, compare design decisions, and turn observed evidence into reusable implementation material.

It is not positioned as an AI website generator, a general-purpose browser DevTools replacement, or a CSS copy button.

## Primary users

1. **Product and UI designers** collecting patterns, layouts, typography, and interaction references.
2. **Frontend developers** reverse-engineering real UI components and translating observed styles into implementation starters.
3. **Design-system practitioners** identifying repeated values and documenting tokens across pages.
4. **Agencies and independent studios** organising competitor and client references into project-specific boards.

## Core workflow

1. **Discover** — inspect a live website and select a component.
2. **Capture** — preserve the rendered component, computed styles, structural outline, tokens, source page and capture timestamp.
3. **Organise** — group captures into named boards/flows and pin important references.
4. **Analyse** — inspect component structure, compare snapshots, identify repeated tokens and run clearly scoped quality checks.
5. **Reuse** — export HTML/CSS, framework starters, DTCG tokens, Tailwind themes, project backups and curated `DESIGN.md` evidence packs.

## Product differentiators

- **Evidence-first output:** distinguish measured browser values from inferred labels or heuristic recommendations.
- **Persistent reference library:** a captured component remains useful after the source page changes or disappears.
- **Project-level visual boards:** organise references by product, page, client, competitor or design system.
- **Snapshot comparison:** show what changed between two captures rather than only showing isolated CSS values.
- **Provenance:** preserve source URL without query strings, capture time, selector, viewport and extraction limitations.
- **Design evidence pack:** export a curated `DESIGN.md` with observed values, selectors, viewport context, user-authored notes and computed CSS snapshots.
- **Local-first privacy:** no account, no analytics, no remote processing and no page data upload by default.
- **Interoperable exports:** support standard token formats and practical developer outputs.

## Product principles

- Never invent a measured value. If a value is inferred, label it as an inference.
- Keep the core workflow fast; advanced tools should not dominate the first screen.
- Preserve original capture data separately from edited workbench variants.
- Make destructive actions explicit and recoverable where possible.
- Do not promise exact page reconstruction when source stylesheets, assets, fonts, responsive rules or scripts are unavailable.
- Make privacy controls visible and understandable.
- Keep extension permissions minimal and explain why access is requested.

## Release priorities

### P0 — required before public release

- Reliable capture and preview workflow.
- Safe message handling and imported-project validation.
- Storage budget, quota error handling and backup/recovery safeguards.
- Chrome and Firefox packaging with documented browser support.
- Coherent, accessible interface and responsive layouts.
- Functional tests for core workflows and browser smoke tests.
- Accurate README, privacy statement, known limitations and licensing decision.

### P1 — differentiating product improvements

Completed in the 0.8.3 development build: deduplicated token extraction, DTCG 2025.10/CSS/Tailwind exports, capture provenance, research notes and a curated `DESIGN.md` evidence pack.

Remaining: optional user-assigned semantic labels, richer comparison summaries, component states and pseudo-element capture where technically feasible.

### P2 — later roadmap

- Multi-page project scans and site-wide token aggregation.
- Advanced asset provenance and asset collections.
- Optional integrations (Figma or AI coding tools) only after a privacy and permissions review.
- Optional local screenshot snapshots and visual diffing after browser compatibility is proven.

## Non-goals for the initial public release

- Cloud accounts, sync or hosted storage.
- Uploading captured websites to an AI provider.
- Automatic website cloning or bypassing access controls.
- Claiming Lighthouse/Core Web Vitals equivalence from lightweight page heuristics.
- Guaranteeing that generated framework code is production-ready without developer review.
