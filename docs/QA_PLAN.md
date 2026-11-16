# Quality assurance and release gates

## Static checks

- JavaScript syntax validation for every packaged script.
- JSON validation for both manifests.
- CSS brace and basic parse validation.
- HTML ID uniqueness and event-handler reference checks.
- Chrome/Firefox package file parity checks.
- No remote scripts, remote fonts or undeclared host permissions.

## Functional checks

- Open extension and first-run guide.
- Inject picker on normal HTTP/HTTPS pages.
- Capture nested elements and adjust selection parent/child.
- Save, select, pin, unpin, search, filter and delete captures.
- Create, populate, reorder and delete design flows.
- Open component preview and inspect structure, styles, tokens and motion.
- Run quality checks and page audit.
- Run page insights and interaction recording.
- Use workbench edit, update, undo, redo, reset and export.
- Compare captures and export token data.
- Export and import a full project, including malformed and oversized files.
- Test empty storage, near-quota storage and quota failure recovery.
- Verify the conservative 7.5 MiB estimated budget across captures, imports, interaction events and page audit history.

## Security checks

- Reject messages from invalid senders and invalid message types.
- Reject malformed, oversized and deeply nested capture payloads.
- Reject malformed project imports and dangerous imported fields.
- Verify preview blocks script execution, navigation and external network requests.
- Verify forms do not retain entered values or sensitive form state.
- Verify interaction recording does not store typed secrets or raw form values.
- Verify no remote requests are made by the extension itself.

## Accessibility checks

- Keyboard-only navigation and focus visibility.
- Correct accessible names for icon buttons and controls.
- Programmatic active state for navigation and tabs.
- Workspace tab arrow-key navigation (Left/Right/Home/End) and roving tabindex.
- Skip link reaches main workspace; focus remains visible in forced-colors mode.
- Reduced-motion preference disables smooth programmatic detail scrolling.
- Contrast review for text, controls and status states.
- 24×24 CSS pixel target-size review with WCAG exceptions considered.
- Reduced-motion support.
- Narrow side-panel layout and zoom checks, including 320 CSS-pixel reflow and 200%/400% zoom.
- Verify heuristics for unlabeled controls, empty headings and generic links.
- Run axe-core against the extension UI in a real browser before claiming a complete automated WCAG scan.

## Browser matrix

- Chrome stable: install unpacked, side panel open/close, capture and export.
- Firefox stable: temporary add-on install, sidebar open/close, capture and export.
- Verify unsupported browser pages fail safely with clear messaging.
- Test page navigation, tab switching, service-worker/background lifecycle and extension reload.

## Release gates

A release is not marked ready until all P0 tests pass, browser smoke tests are recorded, no known critical/high severity security issue remains, package contents are reproducible, and the README accurately describes limitations.
