# DesignShelf 0.8.3 development build — test report

**Date:** 14 November 2026  
**Build:** 0.8.3 development package

## Passed checks

| Check | Result |
|---|---|
| Node automated tests | 38 passed, 0 failed |
| JavaScript syntax | Passed for background, content, sidebar, token export and project import modules |
| Manifest validation | Chrome and Firefox Manifest V3 JSON valid |
| Permission review | No static content scripts, no `<all_urls>` host access, user-initiated `activeTab` injection |
| Browser package parity | Shared source files match root source in both browser packages |
| UI local assets | All local scripts, stylesheets and icon references resolve |
| UI element IDs | 102 IDs, no duplicates |
| Static button wiring | Every static button has a registered or delegated handler; two flow-detail controls are generated dynamically and wired when rendered |
| CSS parser | 0 parse errors |
| Design contrast | Text/status colour pairs in the test set meet WCAG AA 4.5:1 normal-text contrast |
| Narrow/wide UI render | Static interface rendered at 320px and 380px widths in headless Chromium |
| ZIP integrity | Chrome, Firefox and source archives pass `unzip -t` |
| Private-data scan | No user-specific names, local filesystem paths, credentials or API keys found in the source package |
| Network API scan | No `fetch`, XHR, WebSocket or beacon calls found in extension source |

## Tests by area

- Background runtime simulation: sender checks, origin validation, payload bounds, storage limit, pinned retention, tab-specific recording, preservation of previous events and capture-note limits.
- Project import: URL sanitisation, safe token colours, nested structure bounds, interaction-event allowlisting and audit-field filtering.
- Token exports: RGB/hex conversion, alpha, dimensions, aggregation counts, DTCG types, CSS variables and Tailwind v4 theme output.
- Interface/security regression: sandboxed preview, form-value removal, page-insight privacy, accessible tab state, Markdown evidence-pack export and disabled empty-state actions.
- Design system: WCAG AA contrast checks, focus-visible support, reduced-motion support and local-only assets.

## Not completed / not proven

- No live Chrome extension installation or interaction test was completed in this environment.
- No live Firefox extension installation or interaction test was completed in this environment.
- Headless Chromium was used to render the static HTML/CSS layout only; this does not validate extension APIs or background lifecycle.
- No screen-reader test, full keyboard-only audit, browser zoom audit or independent accessibility certification was completed.
- No malicious-import fuzzing, full hostile-page penetration test or independent security review was completed.
- The estimated storage budget is conservative but is not a guarantee of browser quota availability.

## Release decision

The development build is packaged and its automated checks pass. It is not yet cleared for public release. Live Chrome and Firefox testing, storage/import stress testing, a licence decision and explicit user approval remain required before GitHub publication.
