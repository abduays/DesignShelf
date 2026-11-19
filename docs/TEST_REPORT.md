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
