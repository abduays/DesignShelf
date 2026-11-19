undefined

## Capture security validation expansion — 19 November 2026

- Added deterministic mutation coverage for malformed capture fields, structures, viewport metadata, tokens, animation, semantics, screenshots and framework signals.
- Added invalid sender metadata cases including mismatched origins, protected protocols and missing tab identity.
- Added interaction-event mutation cases for query/hash secrets, invalid event names, oversized labels/selectors, invalid timestamps, dimensions and nested state.
- These tests run in GitHub Actions. They are simulated message-validation tests and do not replace live hostile-page/browser network checks.
- Chrome/Firefox live preview network, navigation and extension-runtime tests remain outstanding.


## Research archive metadata validation — 19 November 2026

- Added import-normalisation tests for board briefs and semantic labels, including limits, deduplication and capture-ID filtering.
- Added static regression checks for board metadata UI, escaping and evidence-pack export.
- Live browser editing/import/export verification remains pending.


## Stage 5 validation result — 19 November 2026

- Node test suite: 64 passed, 0 failed.
- Package, syntax, manifest, parity, resource and CSS checks: passed.
- Independent DTCG 2025.10 validator: valid, 9 tokens, 8 groups, 0 aliases, 0 issues, 0 warnings.
- Validator package is pinned to `open-design-tokens@0.7.0` and invoked only by CI.


## Stage 6A — component state snapshots

- Added a picker state mode that lets users interact with a selected component without the selection overlay intercepting clicks.
- Captures are triggered with `Alt+Shift+S` while the selected component is in the desired state; the snapshot records hover/focus/expanded/pressed/selected evidence and a state label.
- Added background validation and import-normalisation tests for state metadata.
- Browser-level state capture remains pending.


## Stage 6B — pixel visual comparison

- Added a pure pixel comparison helper with threshold, changed-pixel percentage and mean RGB difference metrics.
- Added unit tests for identical images, threshold behaviour, heatmap output and malformed buffers.
- UI reads stored data URLs locally, requires matching dimensions and renders A/B/heatmap.
- Browser-level image/canvas verification remains pending.


## Stage 6C — Studio toolbox organisation

- Added three native details/summary groups to reduce the flat tool-card list.
- Preserved existing control IDs and event handlers; static regression checks cover the grouped structure.
- Live keyboard and responsive UI verification remains pending.


## Stage 7 — Storage warnings and recovery

- Added pure threshold tests for 60%, 80% and 95% warnings.
- Added static checks for recovery backup, dialog choices and storage progress UI.
- Actual browser quota exhaustion and recovery download tests remain pending.


## Stage 8 — Browser smoke validation

- Added Playwright smoke tests for Chrome stable and Firefox.
- Tests cover sidebar rendering/navigation, storage and board UI, plus content-script picker state capture.
- CI installs browser engines and runs these tests automatically on PRs.
- Full extension package installation, side-panel/sidebar APIs, background lifecycle and cross-tab recording remain manual/browser-extension gates.


## Stage 8 runner correction

- Initial browser setup failed before launching tests because GitHub's Ubuntu 26.04 runner image is not supported by Playwright 1.57.0 for its FFmpeg dependency.
- Pin the smoke-test job to Ubuntu 24.04 and rerun browser installation and tests. This is an environment compatibility correction, not an application test result.
