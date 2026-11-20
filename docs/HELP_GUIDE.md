# DesignShelf Help Guide

DesignShelf is a local-first browser extension for collecting and studying interface components. It saves browser-observed evidence such as rendered markup, selected styles, component structure, dimensions and metadata. It does **not** recover the original source project.

## 1. Install the development build

> This guide describes the current development build. It is not a browser-store installation guide.

### Chrome
1. Download or clone the repository.
2. Open `chrome://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the repository's `chrome/` folder.
5. Pin DesignShelf if you want it in the toolbar, then open it on a normal website.

### Firefox
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **This Firefox**.
3. Click **Load Temporary Add-on…** and select `firefox/manifest.json`.
4. Open DesignShelf from the browser toolbar.
5. Temporary add-ons are removed after Firefox restarts; load the add-on again.

Browser-internal pages, extension pages, protected pages and some cross-origin content cannot be inspected.

## 2. Capture a component

1. Open the website and navigate to the section you want to study.
2. Open DesignShelf and choose **Capture a component**.
3. Follow the picker instructions. Hover over the page to identify an element and select it.
4. If the selected element is too small or too large, use the picker controls to move to a parent or child element.
5. Wait for the capture result. A successful capture is saved to your local library.

**Tip:** Select a section or component container rather than the entire page when possible. Captures are bounded and may be rejected if they are malformed or too large.

## 3. Review and inspect captures

Open a saved capture to review its preview and evidence. Depending on the captured page, the inspector can show:

- Component hierarchy and rendered markup.
- Selected computed-style values and CSS snapshot.
- Dimensions and viewport metadata.
- Images, fonts and other observed assets.
- Motion-related metadata and interaction-state evidence.
- Accessibility evidence candidates, such as role, name source, ARIA hidden state and tab index.

Values are observations or heuristics. They are not guaranteed to represent the site's original source, complete cascade or full accessibility tree.

## 4. Organise your library

- **Search and filters:** find captures in your library.
- **Pin:** keep a capture outside the automatic retention window.
- **Notes:** add your own research context.
- **Boards/flows:** group related captures, arrange them and add a brief or semantic labels.
- **Compare:** compare two saved captures using structural and metadata evidence. The comparison is not a pixel-perfect website diff.

Unpinned captures are subject to the 15-day retention policy. Pin important captures to retain them until you unpin them.

## 5. Design tokens and exports

The token shelf aggregates values observed in saved captures, including colours, font families, sizes, line heights, weights, spacing and radii.

Available exports include:
- Design Tokens Format Module 2025.10 JSON.
- CSS custom properties.
- Tailwind CSS v4 theme variables.
- HTML/CSS and supported framework starter exports from the workbench.
- Board evidence packs in Markdown.
- Project backup/export for moving or backing up your local library.

Exported tokens are measured values. DesignShelf does not automatically know whether a value is a semantic token such as `brand-primary`; semantic labels are user-assigned.

## 6. Workbench

Use the workbench to make changes to a saved snapshot without changing the source website. Depending on the available controls, you can edit the snapshot, preview the result, undo or redo changes, reset and export.

The workbench operates on the saved capture. It is not a live editor for the original website.

## 7. Page checks and research tools

Page checks, insights, audits and quality heuristics help identify items worth reviewing. Treat their results as guidance, not as a formal accessibility, performance, security or SEO audit.

Interaction recording captures limited interaction metadata on the active tab. It is designed not to intentionally record typed key values or form values. Stop recording when finished, and review the saved evidence before sharing.

## 8. Permissions and privacy

DesignShelf is designed to keep working data in browser-local extension storage. It does not require an account, remote processing service or paid API.

- The extension uses user-initiated active-tab access.
- Optional website permissions may be requested when a feature needs them.
- Captures and notes remain in local extension storage unless you export them.
- Saved URLs have query strings and fragments removed.
- Form values and checked/selected state are removed from captured markup.
- Saved previews are sanitised and isolated from page scripts and external asset loading.

**Before sharing an export:** review it for copied page text, markup, selectors, source context, images/data and any information you are not authorised to redistribute. Local storage is not a guarantee that captured content is safe or legally reusable.

Capture only content you are authorised to inspect and reuse.

## 9. Troubleshooting

### The picker will not start
- Confirm you are on a normal HTTP or HTTPS page, not a browser or extension page.
- Reload the website and try again.
- Check whether the browser blocked the extension on that page.
- If prompted for optional site access, grant it only if you trust the site and need the feature.

### The capture is rejected or says it is too large
- Select a smaller, more focused section.
- Avoid capturing the entire page or a very large repeating list.
- Retry after the page finishes loading.
- If it continues, note the page URL without query strings, browser version and exact error text. Do not include private page content in a public issue.

### A capture preview looks incomplete
- Some stylesheets, cross-origin assets, dynamic states, shadow DOM or pseudo-elements may not be available.
- The preview is a sanitised snapshot and intentionally does not load page scripts or external resources.

### Storage warning appears
- Export a project backup before deleting anything.
- Remove captures you no longer need or unpin items that should expire.
- Review the storage meter and follow the recovery options shown by the extension.

### Firefox extension disappeared after restart
Temporary Firefox add-ons are removed when the browser restarts. Load the add-on again using `about:debugging`.

### Export or import fails
- Confirm you have enough available local storage.
- Retry with a smaller project file.
- Do not edit the backup file manually unless you understand its format.
- Keep an untouched backup copy before trying recovery.

### The extension UI is missing or unresponsive
- Reload the extension from the browser's extension-management page.
- Reload the website tab.
- Reopen the side panel/sidebar.
- If the issue persists, record the browser and extension version, the steps to reproduce and the exact error message.

## 10. Known limitations

- Original React, Vue, Svelte or other framework source files are not recovered.
- The complete CSS cascade, all media queries, pseudo-elements, shadow DOM states and cross-origin styles may not be captured.
- JavaScript-driven animations and application state are not rebuilt.
- Responsive preview changes the snapshot width; it is not a full responsive-browser test.
- Comparisons are structural/metadata-based, except the local pixel comparison for matching-size saved screenshots.
- Heuristic checks are not substitutes for dedicated testing tools.
- Real-world browser workflows and accessibility testing are still in progress for this development build.

## 11. Getting help or reporting a bug

Before reporting a bug, check the [test report](TEST_REPORT.md) and [QA plan](QA_PLAN.md). Include:
- Browser name and version.
- DesignShelf build/version.
- Steps to reproduce.
- Expected result and actual result.
- Exact error message, if any.

Do not attach credentials, private URLs, captured proprietary content or personal data. For security issues, follow [SECURITY.md](../SECURITY.md) and avoid public disclosure of exploitable details.
