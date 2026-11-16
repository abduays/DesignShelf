# Initial source audit and remediation record

**Audited baseline:** DesignShelf 0.8.2 source package  
**Remediation build:** 0.8.3 development build  
**Date:** 14 November 2026

## Source inventory

- `background.js`: message routing, injection, local storage, retention and tab-scoped interaction recording.
- `content.js`: element picker, DOM capture, component tree, computed styles, page audit, page insights and interaction recording.
- `sidebar.html`: extension workspace and controls.
- `sidebar.css`: Field Notes visual system and interface styles.
- `sidebar.js`: state, rendering, export, import, comparisons, quality checks and user interactions.
- `token-export.js`: pure token aggregation and DTCG/CSS/Tailwind export helpers.
- `project-import.js`: pure project-import normalisers and field-level validation.
- `chrome/` and `firefox/`: installable browser-specific packages.
- `tests/`: runtime background tests, static security regression checks and token-export unit tests.

## Baseline checks

- The original 0.8.2 test suite had 7 static checks.
- All 94 declared HTML IDs were referenced by the UI script; no duplicate IDs were found. `deleteFlowBtn` is created dynamically.
- The original stylesheet mixed dark and light root themes, several important labels were too small, and advanced tools were concentrated in a long view.
- The original capture validator did not deeply validate component-tree nodes or nested interaction state.
- Project import normalised capture records but did not fully normalise imported audit history or estimate the combined local storage footprint.
- Interaction recording was tied to whichever tab was active when stopping, and starting a session cleared previous saved events.
- The original token export was a proprietary aggregate JSON format rather than an interoperable token format.

## Remediation in 0.8.3 development build

- Replaced the mixed stylesheet with one consistent Field Notes visual system and an original shelf/index icon.
- Added accessible active-state announcements and keyboard arrow/Home/End navigation for inspector tabs.
- Corrected preview root CSS application and expanded the preview's blocked resource/navigation attributes.
- Added nested capture-tree and interaction payload validation, sender/origin checks, aggregate payload bounds and a conservative 7.5 MiB storage estimate for capture/import/interaction/audit writes.
- Normalised imported audit records and interaction state; added import aggregate storage checks.
- Made recording tab-specific, preserved prior interaction history and capped retained interaction events.
- Added capture viewport and device-pixel-ratio provenance.
- Added DTCG 2025.10, CSS variable and Tailwind v4 theme export with unit tests.
- Added Node runtime tests, package parity checks, GitHub Actions CI and repository documentation.

## Still open

- Toolbox information architecture and second-pass UI simplification.
- More maintainable decomposition of the remaining large UI/background/content scripts.
- Full browser runtime tests, import fuzzing, storage quota stress tests and hostile-page tests.
- Screen-reader, zoom, keyboard, contrast and responsive side-panel verification.
- Independent security review and public-release licensing decision.

## Scope note

The 0.8.3 checks are automated source and simulated-background tests. They are not proof of runtime correctness, a penetration test, browser-store review or accessibility certification. No live Chrome or Firefox test has been recorded yet.
