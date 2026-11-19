## Stage 8 — Browser smoke validation (19 November 2026)

- Pull request #15 merged the Playwright smoke-test harness into \`main\`.
- CI run [44522506262](https://github.com/abduays/DesignShelf/actions/runs/44522506262) passed on commit \`aed686d1903280146396a71457191d7179f6699c\`.
- Automated Node suite: 78 passed, 0 failed.
- Syntax, manifest, package parity, local-resource, CSS and independent DTCG 2025.10 validation: passed.
- Chrome stable 158.0.8127.36: sidebar rendering/navigation, storage estimate, board rendering and content-script expanded-state capture passed.
- Playwright Firefox 144.0.2: the same sidebar and content-script state-capture smoke checks passed.
- The browser smoke harness uses a mocked extension API. It does not install the complete extension package or validate real side-panel/sidebar APIs, optional permission prompts, browser background lifecycle or cross-tab recording.
- A separate post-merge \`main\` workflow was started after the merge; the PR validation above is the completed run used for this record.

## Earlier validation records

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

- Node test suite at that point: 64 passed, 0 failed.
- Package, syntax, manifest, parity, resource and CSS checks: passed.
- Independent DTCG 2025.10 validator: valid, 9 tokens, 8 groups, 0 aliases, 0 issues, 0 warnings.
- Validator package is pinned to \`open-design-tokens@0.7.0\` and invoked only by CI.

## Stage 6A — component state snapshots

- Added a picker state mode that lets users interact with a selected component without the selection overlay intercepting clicks.
- Captures are triggered with \`Alt+Shift+S\` while the selected component is in the desired state; the snapshot records hover/focus/expanded/pressed/selected evidence and a state label.
- Added background validation and import-normalisation tests for state metadata.
- Browser-level state capture is now covered by the Stage 8 mocked-API smoke harness; real extension installation remains outstanding.

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

## Stage 8 runner correction

- Initial browser setup failed before launching tests because GitHub's Ubuntu 26.04 runner image was not supported by Playwright 1.57.0 for its FFmpeg dependency.
- Pinning the workflow to Ubuntu 24.04 resolved the runner compatibility issue.
- The first browser test run exposed a state-capture wait assertion that used the wrong baseline count. The test was corrected to wait for exactly one additional capture and inspect that new capture.
