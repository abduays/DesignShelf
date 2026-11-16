# DesignShelf — Chrome and Firefox extension v0.8.3 (development build)

DesignShelf lets a developer select a visible element on a webpage, inspect its rendered HTML and computed CSS, preview it in the browser sidebar or side panel, and save captures locally.

## Current development build features

This build includes the Field Notes visual system and the first product/security improvements. It remains a development release; public publication is blocked pending browser runtime tests, remaining security review and a licence decision.

- Smart section capture: stores a capped component tree (up to 24 elements) with parent/child relationships, selectors, visibility, dimensions, computed styles, and best-effort HTML snapshots for inspecting child elements individually.
- Style snapshot: collects computed colour values, font family/size/weight, line height, border radius, shadow and background image information for the captured root and selected tree items.
- Field Notes visual system: warm archive surfaces, ink typography, oxide-red actions, catalogue-style metadata and clearer component hierarchy.

- Firefox sidebar and Chrome side-panel interfaces.
- Project boards/flows, pinning, capture history, per-component research notes, Markdown `DESIGN.md` evidence packs, similarity search and component comparisons.
- Local page audits, quality heuristics, asset insights, interaction recording and sandboxed workbench.
- Click-to-pick overlay on ordinary webpages.
- Captures the selected element's rendered HTML, a set of computed style properties, page URL/title, dimensions, selector and basic CSS animation/transition metadata.
- Sanitises scripts, embedded frames and inline event attributes in the stored HTML snapshot.
- Shows a sandboxed preview in the sidebar.
- Stores captures in `browser.storage.local`.
- Copies HTML/CSS/motion metadata, downloads HTML/CSS, React JSX and Vue starters, exports the library and full project, and deletes captures.
- Aggregates observed design tokens and exports the stable DTCG 2025.10 format, CSS variables or a Tailwind v4 theme.
- No API, account, remote server, analytics or email collection.

## Browser packages (v0.8.3)

The project now contains separate browser packages because Chrome and Firefox use different sidebar and background entry points:

- `chrome/` — Manifest V3 service worker and Chrome side panel.
- `firefox/` — Manifest V3 background scripts and Firefox sidebar.

Both packages use the same capture, inspector and workspace code. They request `activeTab` and `scripting` rather than permanent `<all_urls>` host access. The content script is injected only when an extension UI action asks to inspect the active tab.

### Install in Chrome (unpacked)

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select the `chrome/` folder.
5. Open a normal HTTP or HTTPS website and click the DesignShelf toolbar icon.
6. Use **Capture a component** to start inspection.

### Install temporarily in Firefox

1. Extract the ZIP to a folder.
2. Open `about:debugging#/runtime/this-firefox` in Firefox.
3. Click **Load Temporary Add-on…**.
4. Select `firefox/manifest.json` from the extracted project (or select the manifest inside the Firefox package folder).
5. Open a normal website tab (not `about:`, the Add-ons Manager, or another protected page).
6. Click the DesignShelf toolbar button to open its sidebar.
7. Click **Capture a component**, then hover and click a section. Press Escape to cancel.

Temporary add-ons are removed when Firefox restarts. For development, load the add-on again after restarting.

## Known limitations

- This is a development build, not a production-ready or Mozilla-reviewed release.
- It captures rendered DOM, not original React/Vue/Svelte source files or original project structure.
- Only a subset of computed CSS properties is stored. External stylesheets, CSS variables, media queries, fonts, pseudo-elements, shadow DOM and complex layouts may not reproduce exactly.
- CSS animation metadata is captured, but original JavaScript-driven animation logic is not reconstructed.
- External images may be blocked in the sandboxed preview, and relative assets can fail after export.
- Some pages (browser-internal pages, protected pages, certain PDFs and cross-origin/embedded content) cannot be inspected.
- Inspection requires the user to invoke the extension on the active tab. `activeTab` access is temporary; browser-internal and protected pages remain unavailable.
- Local storage is finite. DesignShelf uses a conservative estimated 7.5 MiB budget for new captures, imports, interaction events and audit history; actual browser quotas vary.
- Use captured code responsibly and respect website copyright, licences, terms and privacy obligations.

## Quality and security notes

The extension does not intentionally transmit saved content. The current development build includes sender validation, bounded capture and interaction payload checks, preview sanitisation, form-value removal, import normalisation and a conservative estimated storage budget. These controls have not been independently security-certified. Before public release, complete live Chrome and Firefox testing, import fuzzing, storage quota tests, accessibility checks and a final permission review.


## Historical release notes

The following sections describe earlier development iterations. Permission and feature descriptions in those historical notes may no longer match the current v0.8.3 manifests and code. The current packages use temporary `activeTab` access and runtime injection; they do not declare permanent `<all_urls>` host access.

## Smart component tree and design workspace (v0.6.0)

After selecting a section, open the saved capture and use the Component tree to inspect individual descendants. Each row shows the tag, accessible label or text snippet, and rendered dimensions. Selecting a child updates the preview and the HTML, CSS, motion and basic checks panels to that child where data was captured. Colour swatches can be clicked to copy their CSS colour value. The tree is limited to 24 elements and six nested levels to keep capture size manageable. Closed dropdowns and menus may not be present until you interact with them on the original website; capture an open state separately when needed.

## Improved section selection (v0.2)

- Hover highlights a likely parent container rather than always selecting the deepest child.
- Click once to lock the candidate, then use the on-page **Parent** and **Child** controls to adjust the boundary. Arrow Up/Down also move through the DOM hierarchy.
- Click **Capture section** when the outline matches the full component. Press Escape or Cancel to exit.
- The saved preview is taller and can be manually resized from its lower edge or expanded with the preview button.

The container heuristic is a convenience, not a guarantee: some websites use unusual markup. Always verify the purple outline and adjust with Parent/Child before capturing.


## Cross-site workflow and capture history (v0.3)

- The picker content script is registered on ordinary HTTP/HTTPS websites, so switching to another website no longer requires closing and reopening the sidebar. Click **Capture a component** again on the new active tab to begin a new selection. Browser-internal and protected pages remain unavailable.
- Captures persist in the local extension library across normal tab and website changes.
- History filters: all captures, today, and the last 7 days. Each capture shows its capture date and time.
- Captures older than 15 days are automatically pruned on extension startup, sidebar load, each new capture, and a daily alarm. Automatic deletion occurs when Firefox is running and the extension has an opportunity to execute.
- **Delete all history** permanently clears all saved captures and the last-capture pointer.
- The extension now requests access to all website URLs so the content script can work on newly opened websites without requiring the toolbar action to be clicked for each tab. This is a broad permission; protected browser pages remain excluded.


## Version 0.5.0 additions

- **Performance advisor:** scan the active HTTP/HTTPS page locally for available resource timing and sizes, large scripts/stylesheets/resources, oversized source images relative to displayed size, missing image dimensions/alt attributes, large DOM size and navigation timing. View the largest resources and export a JSON report. Resource URLs omit query strings and fragments.
- **Evidence-aware recommendations:** each finding describes what was observed and suggests a next step. Resource sizes may be unavailable for cached or cross-origin resources; the report is not a Lighthouse replacement and does not claim to measure field Core Web Vitals or reliably identify unused code.
- **Optimise workspace:** new sidebar view for page scans, metric summary, findings and largest resources.

Version 0.4.0 additions

- **Design flows:** create visual collections, assign saved captures, reorder components, remove items from a flow, and delete a flow without deleting the original captures.
- **Local quality checks:** run heuristic checks for missing image alt attributes, unnamed buttons or links, fixed-width risks, missing image sources, and uncertain responsive behaviour. These are warnings, not a complete accessibility audit.
- **Framework starter exports:** export HTML/CSS, a Tailwind starter, React JSX starter, or Vue template starter. Framework outputs are heuristic starting points and require manual review.
- **Guided tutorial:** a six-step onboarding guide opens on first run and can be reopened from the top bar.
- **Updated workspace UI:** navigation for Library, Design flows, Quality check, and Optimise; flow cards; warning panels; export controls; keyboard focus states.

All features run locally. No paid API, account, or external server is required. The performance scan reads data exposed to the page context and stores the report in memory until the sidebar closes; it does not send the report to a server. Captures still expire after 15 days. Export the library before replacing a temporary Firefox add-on installation, because removing a temporary installation can clear its local extension storage.

## v0.7.0 Inspector+ workspace

This update adds a new Inspector+ workspace with the following local tools:

- **Interaction recorder:** explicitly start and stop recording clicks, hover, focus, change, keyboard and submit events on the active page. Events include the target selector, label, viewport and exposed ARIA state; up to 500 events are kept in local extension storage and can be exported as JSON.
- **Responsive snapshot preview:** resize a saved capture preview to common desktop, tablet and mobile widths. This is a viewport-width check of the saved snapshot, not a full responsive browser session and not a replacement for testing the original page at each breakpoint.
- **Page asset explorer:** lists images and dimensions, stylesheet links, common font families, interactive controls, and stylesheet rules accessible to the page. Cross-origin stylesheet rules may be blocked by browser security.
- **Design token mapper:** aggregates captured colours, font families, border radii and shadows across the local library and exports them as JSON.
- **Capture comparison:** compares saved captures by HTML/CSS length, tree size, dimensions, fonts, colours and animation metadata. It is a metadata comparison, not a pixel-perfect image diff.
- **Extra quality checks:** adds heuristic checks for form labels, generic link wording, heading hierarchy, new-tab links and possible reduced-motion gaps, alongside a repeated-declaration review. Computed snapshots cannot prove source CSS duplication or full accessibility compliance.

## Privacy and permissions

All new processing runs locally in the extension and the active page. Interaction events are stored in Firefox extension local storage and can include labels and selectors from the page; stop recording when finished and export or clear your data as needed. The extension requests temporary active-tab access when the user invokes inspection. It does not require persistent `<all_urls>` host permissions. Browser-internal and protected pages cannot be inspected. No external service or paid API is used.

## Validation status for v0.7.0

Run `node --check sidebar.js`, `node --check content.js`, `node --check background.js`, parse `manifest.json`, and run `unzip -t` on the release ZIP before packaging. These checks validate syntax and package integrity only. A live Firefox test is still required to confirm page messaging, browser-specific API behaviour, and all UI interactions.

### Additional v0.7.0 tools

- **Live component workbench:** edit the captured HTML and computed declarations in an isolated, script-disabled iframe preview; reset from the saved capture or export an HTML variant. The CSS field is a computed-style snapshot rather than the website's original stylesheet, so treat the export as a starting point and review selector scoping.
- **Component similarity finder:** ranks other local captures by shared tag, colours, font family and name terms. It is a lightweight heuristic, not image-recognition or semantic AI.
- **Animation inventory:** the page inspector also lists animations exposed by `document.getAnimations()`, including play state, timing and accessible keyframe metadata. This is a current-state inventory; it does not guarantee that every JavaScript, canvas, WebGL or framework animation can be reconstructed or replayed.


## v0.8.0 — project reliability and inspection improvements

- **Capture search:** filter the local library by component name, source URL, tag, selector, captured font or colour, alongside the existing date filter.
- **Full project backup:** export captures, design flows, interaction history and project metadata into one JSON file. The file can contain copied website markup and URLs, so store it carefully.
- **Project restore/import:** validate JSON structure, enforce file and item-count limits, merge captures by ID, merge design flows, and import interaction events. Invalid files are rejected with an error. Imported captures still follow the configured 15-day retention policy.
- **Storage estimate:** view an approximate local storage footprint, capture count, flow count and event count. This is a JSON-size estimate, not a browser quota guarantee.
- **Performance history:** retain up to 20 local audit reports and compare repeated scans for the same host across resource counts, transfer-size estimates, DOM size and available navigation timings. Measurements vary with cache and network conditions and are not controlled benchmarks.
- **Current viewport checks:** page insights flag possible horizontal overflow and small interactive targets in the active viewport. This is a heuristic snapshot, not a full responsive audit across breakpoints.
- **Workbench undo/redo:** undo or redo recent HTML/CSS editor states in the isolated preview. History is session-local and resets when the selected capture is reloaded.
- **CSS snapshot review:** list captured declarations, repeated declaration strings and duplicate IDs. Repeated declarations in computed snapshots do not prove redundant source CSS; full cascade tracing and reliable unused-CSS detection remain limited by source stylesheet access.
- **Deeper capture comparison:** list CSS declaration strings unique to each capture and compare structure signatures in addition to the existing metadata comparison. This remains a structural comparison, not a pixel-perfect screenshot diff.
- **Safer interaction metadata:** recorder events now include a small computed-style snapshot and details for a target's `aria-controls` element when available. Form-field values are not intentionally recorded; labels use accessible text, placeholder, name or type instead.

### v0.8.0 validation status

Syntax and package checks are run before packaging. A live Firefox session test has not been performed. Features that need actual browser validation include capture/import flows, cross-origin page behaviour, live interaction recording, workbench undo/redo and local storage limits.

### Known pending or inherently limited items

- Pixel-perfect screenshot diff is not implemented; the current comparison is structural and metadata-based. A true image diff needs reliable screenshot capture and image persistence, followed by testing across Firefox versions.
- The responsive preview changes the saved snapshot viewport width; it does not resize the original website tab or guarantee original media queries are present in captured CSS.
- Full CSS cascade tracing and reliable unused CSS detection are not implemented because captured computed styles do not preserve the complete source cascade, and cross-origin stylesheets may be inaccessible.
- The extension does not reconstruct original React/Vue source, framework state, JavaScript animation logic, or all third-party dependencies.
- Firefox live testing, accessibility testing of the extension UI, quota/error testing, and Mozilla Add-ons release review remain necessary before describing this as production-ready.


## v0.8.3 design and workflow additions

- Introduced the Field Notes visual identity, a consistent light workspace, accessible contrast pairs and original browser icon assets.
- Added per-capture research notes and board-level `DESIGN.md` evidence-pack export with source context, viewport, observed values and computed CSS snapshots.
- Added DTCG 2025.10, CSS variable and Tailwind v4 token export. Token names remain neutral until the user assigns semantic meaning.
- Added capture viewport and device-pixel-ratio provenance.
- Added a Node test suite, package consistency checks, GitHub Actions CI, contribution guidance, a security policy and staged release documentation.

## v0.8.3 security and compatibility hardening

- Added **pinned captures**: pinned items are exempt from the 15-day automatic retention rule; unpinning restores normal expiry.
- Replaced the page `window.postMessage` capture bridge with direct extension-runtime messaging from the isolated content-script context. This prevents a website from forging a capture by dispatching a matching page message.
- Added sender checks for extension UI and web content messages.
- Added capture and interaction-event validation, field-length limits, page-origin matching and structure-count limits before storage.
- Removed query strings and fragments from stored capture and interaction-recording page URLs to reduce accidental exposure of URL tokens and tracking parameters.
- Changed content-script access to user-initiated injection using `activeTab` and `scripting`; removed static all-sites injection and permanent all-sites host permissions.
- Added browser-specific Chrome and Firefox manifests and side-panel entry points.
- Added preview sanitisation, a restrictive preview Content Security Policy, and blocked external asset loads in saved-component and workbench previews. Only embedded raster data images are retained.

### Security status

These are targeted hardening changes, not a claim that the extension is vulnerability-free or independently security-certified. The packages have passed local syntax, manifest and static regression checks. Live browser testing, manual permission-prompt verification, malicious-import testing, and Chrome/Firefox release validation are still required before public distribution.


## Development checks

Requires Node.js 20 or newer. Run `npm test` for automated tests, `npm run check` for syntax and package validation, or `npm run validate` for both. No third-party npm dependencies are required.

## Project documentation

- `docs/PRODUCT_STRATEGY.md` — product positioning, users, workflows and roadmap.
- `docs/ROADMAP.md` — staged development plan and completion gates.
- `docs/TEST_REPORT.md` — automated checks, package validation and remaining release gaps.
- `docs/COMPETITOR_RESEARCH.md` — public competitor review and positioning.
- `docs/VISUAL_SYSTEM.md` — Field Notes visual identity and UI rules.
- `docs/INITIAL_AUDIT.md` — baseline source audit and open findings.
- `docs/QA_PLAN.md` — functional, security, accessibility and browser test plan.
- `docs/FEATURE_AUDIT.md` — interface and feature-by-feature implementation map.
- `docs/BRAND_ASSETS.md` — logo and icon direction.
- `docs/RELEASE_CHECKLIST.md` — GitHub and public release gates.
- `docs/GITHUB_REPOSITORY_SETUP.md` — suggested repository metadata and publication controls.
- `CONTRIBUTING.md` — development and contribution guidance.
- `SECURITY.md` — security reporting guidance.

## Licence

No open-source licence has been selected yet. Until a licence is chosen and added, the source is not granted for redistribution or reuse. This decision must be made before the GitHub repository is made public.
