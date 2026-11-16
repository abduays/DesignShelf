# GitHub repository details

## Repository identity

- **Name:** `DesignShelf`
- **Suggested description:** A local-first browser extension for capturing, inspecting and organising real interface components.
- **Default branch:** `main`
- **Current visibility:** Public (verified 16 November 2026). Keep this setting unchanged unless the owner explicitly requests a change.

## Suggested GitHub topics

Use these topics to describe the product and help developers find the repository:

```text
browser-extension
chrome-extension
firefox-addon
manifest-v3
frontend
web-development
design-systems
component-library
css-inspector
design-research
developer-tools
local-first
```

These are proposed repository topics, not a claim that GitHub metadata has already been updated.

## Repository structure

The root contains shared source, tests and project documentation. Browser-specific packages live in `chrome/` and `firefox/`. Both packages share the same capture, inspector and workspace implementation, with separate browser manifests and entry points.

## Publication and licensing

The repository is currently public, but the project has no open-source licence. Do not describe the code as open source or grant reuse rights until the owner chooses and adds a licence.

Before a formal store release:

1. Choose and add a licence. This is an owner decision.
2. Confirm the project name and review possible trademark conflicts.
3. Review source, screenshots and assets for private data and third-party ownership.
4. Confirm the Firefox add-on ID.
5. Review browser permissions and privacy wording.
6. Run `npm run validate` and test both packages in real browsers.
7. Complete accessibility, storage-limit, hostile-import and security testing.
8. Obtain explicit approval before creating a public release or submitting to an extension store.

## Do not commit

- Captured website content, customer data or private project exports.
- Credentials, API keys, browser profiles or session data.
- Screenshots containing private or identifiable user information.
- Third-party assets without permission to redistribute them.
