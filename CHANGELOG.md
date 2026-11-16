# Changelog

## 0.8.3 — Development build

- Added the Field Notes / Specimen Archive visual direction and a local-only design token stylesheet.
- Reworked the brand, capture workflow copy, navigation labels, component library styling and supporting tool surfaces.
- Added programmatic active-state announcements for primary navigation and inspector tabs.
- Corrected component preview styling so captured root declarations apply to the captured root element rather than the preview document root.
- Tightened preview sanitisation by removing additional resource and navigation attributes, including `poster`, `background`, `manifest` and `ping`.
- Added nested validation for captured component trees and interaction events.
- Added an estimated local storage budget check for new captures and project imports.
- Normalised imported audit history and preserved validated interaction context.
- Corrected duplicate capture dimension assignment and project export version metadata.
- Added product strategy, competitor research, visual system, audit and QA documentation.

## 0.8.2

- Added pinned captures and security hardening for capture messaging, previews and imports.
- Split browser packaging into Chrome and Firefox builds.
- Added standards-based Design Tokens Format Module 2025.10 export, plus CSS variable and Tailwind v4 theme exports.
- Added unit-tested `project-import.js` normalisers for captures, events, tokens and audit history.
- Added per-capture research notes and Markdown `DESIGN.md` evidence-pack export for design boards.
- Added page-level success/failure feedback for component capture and stopped recording when local storage rejects event writes.
- Improved page-insight privacy by excluding input values and stripping URL query strings.
- Added a custom shelf/index browser icon set and accessible keyboard navigation for inspector tabs.
- Fixed interaction recording so it stops on the tab where it began and preserves previous sessions.
- Expanded delete-all history to include page audit and interaction history.


## Unreleased — UI and accessibility improvements

- Added semantic workspace tabs, roving keyboard navigation, skip navigation and focusable content panels.
- Improved focus visibility, target sizing, narrow-panel navigation, forced-colors support and reduced-motion behaviour.
- Improved captured element selector stability using unique IDs, stable attributes and uniqueness checks.
- Expanded local accessibility heuristics for form controls, headings and generic link text.
- Documented competitor research, project licences, third-party adoption decisions and staged implementation plan.
- No third-party runtime dependency or remote service added.
