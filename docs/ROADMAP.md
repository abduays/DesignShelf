# DesignShelf development roadmap

**Target release line:** 0.8.3 development build  
**Status date:** 16 November 2026

## Stage 1 — Product and competitor audit

**Goal:** decide what DesignShelf should do better instead of copying every inspector or extraction CLI.

- [x] Inventory existing UI, background, content-script and export workflows.
- [x] Review CSS Peeper, CSS Scan, VisBug, MiroMiro, Design Context, Design System Extractor, PeekCSS and designlang.
- [x] Identify the strongest product position: a local-first, human-curated archive of interface evidence.
- [x] Record competitors' strengths, limitations and source links.

**Exit condition:** product promise and non-goals documented.

## Stage 2 — Product design and visual identity

**Goal:** replace generic AI-dashboard styling with a coherent product identity and usable side-panel layout.

- [x] Establish Field Notes / Specimen Archive visual direction.
- [x] Define colour, typography, spacing and interaction tokens.
- [x] Create original shelf/index SVG mark and browser PNG icon sizes.
- [x] Rebuild the workspace stylesheet and update navigation, cards, tabs, boards and tool surfaces.
- [x] Add visible focus, reduced-motion support, keyboard tab navigation and programmatic state.
- [x] Add skip navigation, semantic workspace tabs/panels, roving tabindex, larger targets and forced-colors focus treatment.
- [x] Test colour contrast pairs and render narrow/wide static UI previews.
- [ ] Complete live screen-reader, keyboard, zoom and browser side-panel checks.

**Exit condition:** no major visual inconsistency; accessibility runtime checks recorded.

## Stage 3 — Capture engine and privacy/security

**Goal:** ensure a page cannot forge extension messages or turn saved content into active preview code.

- [x] Keep user-initiated active-tab injection and remove persistent all-site host access.
- [x] Validate message senders, source origin, capture fields, tree structure and aggregate payload size.
- [x] Validate interaction event types and nested state; bind events to the tab that started recording.
- [x] Strip query strings and fragments from saved source URLs.
- [x] Exclude form values and keyboard values from captures/interaction history.
- [x] Sanitise preview HTML/CSS and apply restrictive CSP in sandboxed iframes.
- [x] Show success/failure feedback after a component capture.
- [x] Add deterministic hostile/malformed capture and interaction-message mutation tests to the CI suite.
- [x] Test invalid sender metadata and secret-bearing interaction URLs are rejected.
- [ ] Run browser-level preview network/navigation checks in installed Chrome and Firefox.

**Exit condition:** no known high-severity issue; hostile-input tests and browser security checks recorded.

## Stage 4 — Research archive and project workflow

**Goal:** make captured references useful after the user leaves the source website.

- [x] Keep saved component library, search, history filter and similarity finder.
- [x] Preserve important captures with pinning.
- [x] Organise references into boards/flows and reorder them.
- [x] Add per-capture research notes.
- [x] Export a curated `DESIGN.md` evidence pack with source, selector, viewport, notes, observed values and computed CSS.
- [x] Preserve capture viewport and device-pixel-ratio metadata.
- [x] Add optional board-level brief/intent and user-assigned semantic labels (bounded, normalised and included in evidence-pack exports).

**Exit condition:** a board can be exported as a self-contained research hand-off.

## Stage 5 — Standards-based token and code exports

**Goal:** avoid proprietary exports and preserve measured values without inventing design semantics.

- [x] Aggregate observed colours, font families, sizes, line heights, weights, spacing and radii.
- [x] Export Design Tokens Format Module 2025.10 JSON.
- [x] Export CSS custom properties.
- [x] Export Tailwind v4 theme variables.
- [x] Unit-test color conversion, dimension parsing, frequency counts and output types.
- [ ] Add optional semantic labels assigned by the user.
- [x] Validate output against an independent DTCG 2025.10 implementation in CI.

**Exit condition:** exports pass unit tests and an external format validator.

## Stage 6 — Advanced inspection and design quality

**Goal:** provide trustworthy evidence and useful design diagnostics rather than inflated scores.

- [x] Component tree, computed-style snapshots, motion inventory, asset explorer and page insights.
- [x] Component comparison and viewport metadata comparison.
- [x] Local quality heuristics with explicit limitations.
- [x] Add pseudo-element snapshots (`::before`/`::after`) where safe.
- [x] Capture accessibility evidence candidates (role, name source, ARIA hidden state and tab index) without claiming full accessibility-tree computation.
- [x] Record conservative runtime/framework markers and label utility-class detection as heuristic.
- [x] Add a user-triggered picker state mode to capture hover/focus/expanded/current component states with bounded state evidence.
- [ ] Verify state capture interactions in installed Chrome and Firefox.
- [x] Add local pixel-level visual comparison for matching-size stored screenshots; diff data never leaves the browser.
- [x] Group Studio tools into accessible Inspect & Compare, Collect & Manage and Build & Export sections.
- [x] Improve selector stability with unique IDs, stable attributes and uniqueness checks.

**Exit condition:** each diagnostic is explainable, reproducible and labelled as measured or heuristic.

## Stage 7 — Storage, recovery and reliability

**Goal:** prevent silent data loss and make local storage limits understandable.

- [x] Keep 15-day retention with pinned-capture exemption.
- [x] Add a conservative 7.5 MiB estimated storage budget to capture, import, interaction and audit writes.
- [x] Preserve old interaction history when a new recording begins.
- [x] Stop recording when storage rejects event writes.
- [x] Validate imports in a separate pure module and avoid mutating in-memory state before successful writes.
- [x] Add explicit storage usage warning thresholds and an easy export-before-delete recovery flow.
- [ ] Stress-test real browser storage quotas with large projects.

**Exit condition:** quota exhaustion is tested without silent loss or inconsistent UI state.

## Stage 8 — Chrome and Firefox runtime compatibility

**Goal:** verify each installable package in its actual target browser.

- [x] Separate Manifest V3 Chrome and Firefox manifests.
- [x] Use Chrome `sidePanel` and Firefox `sidebar_action` packaging.
- [x] Add package parity and local-resource validation.
- [x] Run Chrome stable UI and content-script smoke tests in CI.
- [ ] Install the complete extension package in Chrome stable and verify side-panel opening, permissions and background lifecycle.
- [x] Run Firefox UI and content-script smoke tests in CI.
- [ ] Install the complete extension package in Firefox stable and verify sidebar opening, permissions and background lifecycle.
- [ ] Verify service-worker/background lifecycle, action opening, picker injection and cross-tab recording in both browsers.

**Exit condition:** browser-specific test records completed. This stage is not complete yet.

## Stage 9 — Automated QA and GitHub preparation

**Goal:** make changes repeatable and catch regressions before publication.

- [x] Add 76 Node tests across background runtime simulation, import normalisation, token export, design contrast, storage warnings and security regression checks.
- [x] Add syntax, manifest, package parity, local-resource and CSS checks.
- [x] Add GitHub Actions CI workflow and issue templates.
- [x] Add README, contributing guide, security policy, feature audit and release checklist.
- [ ] Choose licence and confirm Firefox add-on ID.
- [ ] Build final ZIPs and verify installation from archives.

**Exit condition:** CI passes and release metadata is confirmed.

## Stage 10 — User review and GitHub publication

**Goal:** publish only the build that has been reviewed and approved.

- [ ] Present source package, Chrome ZIP, Firefox ZIP, test report and known limitations.
- [ ] Obtain explicit approval for the first GitHub push and repository visibility.
- [ ] Create/push the repository only after approval.
- [ ] Tag and publish a release only after browser runtime gates pass.

**Exit condition:** explicit approval received. No GitHub upload or public release has been performed.


See [IMPROVEMENT_PLAN.md](IMPROVEMENT_PLAN.md) for the staged execution plan and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for project/licence review. axe-core and SmolVLM remain candidates, not shipped dependencies.
