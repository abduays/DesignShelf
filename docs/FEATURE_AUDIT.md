# Feature and interface audit

**Build reviewed:** 0.8.3 development build  
**Purpose:** map every visible workspace area to its underlying workflow and current validation status.

## Extension shell

| Element | Behaviour / implementation | Status |
|---|---|---|
| Brand and toolbar icon | Original shelf/index mark, PNG toolbar sizes and local SVG in the workspace | Implemented; package asset check added |
| Guide | Six-step first-use walkthrough, completion state in local storage | Existing feature; copy updated |
| About | Explains local storage, visible text/URL capture and reuse/privacy cautions | Updated |
| Capture action | Requests current active tab, injects content script on demand, starts picker | Existing feature; message sender checks retained |
| Notice strip | Announces success and failure messages with `role=status` and `aria-live` | Existing feature; retained |
| Main navigation | Library, Boards, Checks, Page audit and Studio | Semantic tabs/panels, selected state, roving tabindex, Left/Right/Home/End navigation and skip link |

## Library and capture detail

| Element | Behaviour / implementation | Status |
|---|---|---|
| Search | Filters saved capture names, host, tags and extracted values | Existing feature; retained |
| History filter | All, today and last seven days | Existing feature; retained |
| Collection assignment | Adds a selected capture to a design flow | Existing feature; retained |
| Capture card | Preview thumbnail, name, host, dimensions and pin/delete actions | Existing feature; restyled |
| Pin capture | Exempts a capture from 15-day expiry | Existing feature; retained |
| Detail preview | Sandboxed `srcdoc`, sanitised markup/CSS, no external resources | Preview root style target corrected; sanitisation expanded |
| Component tree | Up to 24 captured nodes, depth-limited, child selection | Existing feature; generated selectors prefer unique stable attributes and avoid hash-like classes |
| HTML/CSS/Motion/Checks tabs | Displays captured code, motion data and local heuristics | Keyboard tab navigation and ARIA state added |
| Copy/download | HTML/CSS, Tailwind starter, React JSX and Vue template starter | Existing feature; labels clarified |
| Viewport controls | Changes saved preview width to common viewport sizes | Clarified as snapshot viewport sizing, not original responsive testing |
| Capture provenance | Source URL, capture time, element dimensions and viewport/DPR | Viewport and pixel ratio metadata added |
| Research note | Optional 2,000-character note attached to a saved capture | Added; exported in board Markdown |

## Boards

| Element | Behaviour / implementation | Status |
|---|---|---|
| Create board/flow | Creates a named local collection | Existing feature; retained |
| Add/remove capture | Adds selected capture or removes it from a flow without deleting source capture | Existing feature; retained |
| Reorder | Moves captures up/down in a flow | Existing feature; retained |
| Delete flow | Removes collection while preserving captures | Existing feature; retained |
| Board Markdown export | Exports ordered references, source context, viewport, observed tokens and notes | Added |
| Project backup | Exports/imports captures, collections, interaction events and audit history | Import normalisation and aggregate storage budget added |

## Checks and page audit

| Element | Behaviour / implementation | Status |
|---|---|---|
| Component checks | Local markup/CSS/accessibility heuristics | Extended with unlabeled controls, empty headings and generic link text; heuristic only, not axe-core or WCAG certification |
| Deep checks | Additional markup and computed-style heuristics | Existing feature; retained |
| Page performance scan | Resource, image, DOM and navigation timing snapshot | Existing feature; no claim of Lighthouse/Core Web Vitals equivalence |
| Audit history | Saves recent page scans and compares with previous scan for same host | Field-level import normalisation and storage budget check added |
| Export audit | Exports current scan report as JSON | Existing feature; retained |

## Studio tools

| Element | Behaviour / implementation | Status |
|---|---|---|
| Project storage | Estimated local storage use and counts | Existing feature; 7.5 MiB conservative write budget applied to capture/import/interaction/audit writes |
| Computed style review | Reviews captured declarations; not the original stylesheet cascade | Label corrected |
| Interaction recorder | Records click, hover, focus, change, keydown and submit metadata; does not record typed key values | Tab-specific stop behaviour fixed; prior history preserved; 300-event cap and storage limit added |
| Asset and page insights | Lists sampled visible images, fonts, scripts, stylesheets, controls, animations and CSS rules | Existing feature; input values and URL query strings are excluded from insights |
| Workbench | Sandboxed HTML/CSS editing with undo, redo, reset and export | Existing feature; preview sanitisation retained |
| Similarity finder | Finds saved captures with matching tags/tokens | Existing feature; retained |
| Token mapper | Aggregates observed colors, fonts, sizes, line heights, weights, spacing and radii | Expanded; DTCG/CSS/Tailwind exports added and unit-tested |
| Capture comparison | Compares markup, CSS, tree size, dimensions, viewport, tokens and animation metadata | Viewport provenance added; not a pixel-level visual diff |

## Background and content-script paths

| Path | Responsibility | Status |
|---|---|---|
| Active-tab injection | Injects `content.js` after user action | Existing least-privilege model; Chrome/Firefox package checks added |
| Message routing | Separates extension-page and web-content message senders | Runtime tests added |
| Capture storage | Validates origin, fields, structure nodes and aggregate payload size | Runtime tests added; page-level save success/failure toast added |
| Interaction storage | Whitelists event types, bounds nested state and checks active recording tab | Runtime tests added |
| Retention | Removes unpinned captures older than 15 days | Existing feature; pin behaviour tested |
| Preview sandbox | Removes scripts/unsafe resources and applies restrictive CSP | Static regression checks; browser validation still required |
| Form state | Removes input values, checked state and selected form values from captured clones | Static regression check; browser validation still required |

## Remaining gaps before public release

- No live Chrome or Firefox browser installation/workflow test has been completed in this environment.
- No full visual pixel-diff or screenshot-based capture is implemented.
- Original stylesheet cascade, pseudo-element states, media queries and JavaScript-driven state cannot be fully reconstructed from the current computed-style snapshot.
- Toolbox still needs a second UX pass to group long-form tools into smaller task-oriented sections.
- CSS and JavaScript maintainability still needs refactoring; some inherited functions remain compressed.
- Accessibility needs runtime keyboard, contrast, zoom and screen-reader checks.
- Security review is not independent certification; import fuzzing and hostile-page testing remain release gates.


## UI/accessibility upgrade (16 November 2026)

- Added skip navigation and a main content landmark.
- Workspace navigation now exposes tab semantics and keyboard roving focus with Left/Right/Home/End keys.
- Panels expose tabpanel relationships and keyboard focus targets.
- Increased interactive target sizes; added forced-colors and reduced-motion styling.
- Detail scrolling respects reduced-motion preference.
- Selector generation prefers unique IDs and stable test/QA attributes, validates uniqueness and filters hash-like class tokens.
- Added local heuristics for unnamed form controls, empty headings and generic link text.
- No external runtime package or remote asset was introduced. axe-core remains a candidate pending local bundle and cross-browser runtime validation.


## Permission recovery fix (16 November 2026)

- Added an explicit **Enable website access** control. It requests optional HTTP/HTTPS host access only after a user click; it does not grant access automatically at install.
- This permission allows page inspection to continue after tab switches and navigation, where `activeTab` alone may no longer apply.
- Kept `activeTab` as the least-privilege path when the user does not grant persistent optional access.
- Replaced misleading generic scan errors with a specific permission instruction or a protected-page explanation.
- Browser-level verification is still required in Chrome and Firefox after reloading the unpacked extension.


## Board metadata upgrade — 19 November 2026

- Added an editable board-level brief/intent field (3,000-character limit).
- Added up to 12 user-assigned semantic labels (32 characters each), case-insensitively deduplicated.
- Metadata is normalised on load/import, retained in project backups, shown on board cards and included in `DESIGN.md` evidence packs.


## Semantic token names — 19 November 2026

- Users can assign optional names to observed token values from the token mapper.
- Names are stored locally, normalised, deduplicated at export and included in full project backups.
- DTCG, CSS variables and Tailwind v4 exports use the assigned names; unnamed values retain deterministic observed sequence names.
