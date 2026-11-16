# DesignShelf 0.8.3 development build — test report

**Date:** 16 November 2026  
**Build:** 0.8.3 development package

## Passed checks

| Check | Result |
|---|---|
| Node automated tests | 39 passed, 0 failed |
| JavaScript syntax | Passed for background, content, sidebar, token export, project import and demo modules |
| Manifest validation | Chrome and Firefox Manifest V3 JSON valid |
| Permission review | No static content scripts, no `<all_urls>` host access, user-initiated `activeTab` injection |
| Browser package parity | Shared source files match root source in both browser packages, including callback-based asynchronous messaging |
| UI local assets | All local scripts, stylesheets and icon references resolve |
| UI element IDs | 102 IDs, no duplicates |
| Static button wiring | Every static button has a registered or delegated handler; two flow-detail controls are generated dynamically and wired when rendered |
| CSS parser | 0 parse errors |
| Design contrast | Text/status colour pairs in the test set meet WCAG AA 4.5:1 normal-text contrast |
| Narrow/wide UI render | Static interface rendered at 320px and 380px widths in headless Chromium |
| ZIP integrity | Chrome, Firefox and source archives pass `unzip -t` (previous package check) |
| Private-data scan | No user-specific names, local filesystem paths, credentials or API keys found in the source package |
| Network API scan | No `fetch`, XHR, WebSocket or beacon calls found in extension source |\n| Demo validation | Demo JavaScript syntax, local asset references and CSS brace balance pass CI checks |\n| GitHub Actions validation | 39 tests and package checks pass on the current `main` revision |

## Tests by area

- Background runtime simulation: sender checks, origin validation, payload bounds, storage limit, pinned retention, tab-specific recording, preservation of previous events, capture-note limits and callback-based asynchronous message replies.
- Project import: URL sanitisation, safe token colours, nested structure bounds, interaction-event allowlisting and audit-field filtering.
- Token exports: RGB/hex conversion, alpha, dimensions, aggregation counts, DTCG types, CSS variables and Tailwind v4 theme output.
- Interface/security regression: sandboxed preview, form-value removal, page-insight privacy, accessible tab state, Markdown evidence-pack export and disabled empty-state actions.
- Design system: WCAG AA contrast checks, focus-visible support, reduced-motion support and local-only assets.

## Not completed / not proven

- No live Chrome extension installation or interaction test was completed in this environment. The callback-based messaging path is covered by automated simulation, not an installed-browser test.
- No live Firefox extension installation or interaction test was completed in this environment. The callback-based messaging path is covered by automated simulation, not an installed-browser test.
- Headless Chromium was used to render the static HTML/CSS layout only; this does not validate extension APIs or background lifecycle.
- No screen-reader test, full keyboard-only audit, browser zoom audit or independent accessibility certification was completed.
- No malicious-import fuzzing, full hostile-page penetration test or independent security review was completed.
- The estimated storage budget is conservative but is not a guarantee of browser quota availability.

## Release decision

The development build's current automated checks pass (44 tests, 0 failures) and package consistency checks pass in GitHub Actions. The GitHub repository is public, but this is not a browser-store release and is not cleared for store publication. Live Chrome and Firefox testing, storage/import stress testing, a licence decision and explicit release approval remain required.


## UI and accessibility upgrade validation — 16 November 2026

- GitHub Actions CI run: https://github.com/abduays/DesignShelf/actions/runs/43836647992
- Validated source revision: `efc94a97411b34de5ae6c184586c43f48cabae8b` (documentation-only commits followed). Node automated tests: 44 passed, 0 failed.
- Package checks: passed after synchronising root, Chrome and Firefox sources and registering delegated workspace tabs with the static handler checker.
- Added regression coverage for semantic tabs/panels, keyboard navigation, skip link, reduced-motion/forced-colors styles, accessibility heuristics and selector-stability rules.
- This CI run does not perform a real browser, screen-reader, zoom or axe-core scan. Those remain manual/runtime validation gates.
