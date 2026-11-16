# UI, inspection and accessibility improvement plan

**Repository:** abduays/DesignShelf  
**Baseline:** v0.8.3, commit 53f9eb96ccc0fe987ca4e609d3debfc9a79079ce  
**Execution branch:** ui-accessibility-upgrade  
**Plan date:** 16 November 2026

## Objective and guardrails

Make DesignShelf faster to understand and easier to operate without weakening its local-first model or replacing its lightweight extension architecture. Preserve capture, storage, retention, import/export, boards, comparison and workbench behaviour. Do not add permanent all-site permissions, remote scripts, remote fonts, analytics, accounts, paid APIs or automatic model downloads. Keep Chrome and Firefox shared UI files identical. Never label heuristic results as WCAG certification.

## Stages and exit criteria

1. **Research and audit:** review product, competitors, open-source projects and licences. Distinguish interaction patterns from code dependencies.
2. **Workspace UI:** add skip navigation, semantic tabs/panels, selected state, roving tabindex, arrow/Home/End navigation, larger controls, narrow-width reflow, forced-colors focus and reduced-motion handling.
3. **Selector quality:** prefer unique IDs and stable data/test/QA attributes; filter likely hash-generated classes; bound ancestor traversal and validate selector uniqueness.
4. **Accessibility findings:** extend local checks for form labels, heading names and generic link wording. Keep findings explainable and heuristic.
5. **Interaction accessibility:** keyboard operation, focus visibility, forced-colors and reduced-motion; record manual screen-reader/zoom checks separately.
6. **Optional AI assessment:** evaluate small vision-language models only as optional local tooling. Assess licence, download size, memory, latency, offline runtime and data flow. No external inference by default.
7. **Verification:** run automated tests and package checks; verify package parity, IDs, handlers, resources and selector edge cases.
8. **Repository update:** update research, roadmap, feature audit, QA plan, test report and changelog; merge only after checks pass.

## Deferred integrations

- **axe-core:** MPL-2.0. A pinned local distribution, notices, package-size review and Chrome/Firefox isolated-world test are required before shipping. Current pass improves local heuristics; it does not claim axe-core integration.
- **Tabster:** no dependency needed for a single native tablist with roving focus.
- **SmolVLM:** Apache-2.0 model card does not make a model suitable for embedding. Download and inference runtime are separate costs; keep it out of the extension.
- **AI visual analysis and screenshot diffs:** defer until capture consent, screenshot privacy, storage and runtime boundaries are designed and tested.

## Implementation record

Completed: research and licence review; primary workspace keyboard tabs; skip link and main landmark; tab/panel relationships; larger controls; reduced-motion-aware detail scrolling; forced-colors focus treatment; improved selector stability; extra form-control, heading and generic-link heuristics.

Pending validation: real Chrome/Firefox side-panel use, screen-reader testing, 200%/400% zoom, 320 CSS-pixel reflow, axe-core runtime integration and AI runtime assessment.
