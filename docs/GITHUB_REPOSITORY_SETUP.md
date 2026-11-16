# GitHub repository setup proposal

## Suggested repository metadata

- **Repository name:** `DesignShelf`
- **Description:** A local-first browser workspace for capturing, annotating, comparing and exporting real interface components.
- **Suggested topics:** `browser-extension`, `manifest-v3`, `design-systems`, `css-inspector`, `component-library`, `design-research`, `frontend-tools`, `web-development`
- **Default branch:** `main`
- **Visibility:** keep private during final review; make public only after approval and licence selection.

## Suggested repository layout

The repository root is the source and documentation workspace. Installable packages are isolated under `chrome/` and `firefox/`. GitHub Actions runs the Node test suite and package consistency checks on pushes and pull requests.

## Before making the repository public

1. Choose a licence and add the exact licence text. MIT is permissive; MPL-2.0 requires modified files to remain available under MPL. This is a user decision.
2. Confirm the project name and that no trademark conflict exists.
3. Review all source, screenshots and assets for private data and third-party ownership.
4. Confirm the Firefox add-on ID.
5. Enable private vulnerability reporting and configure branch protection.
6. Run `npm run validate` and verify both browser ZIPs install.
7. Approve the first public commit and release tag.

## Do not commit

- Captured website content, customer data, credentials, API keys, browser profiles or personal project exports.
- Temporary screenshots containing real websites or user data.
- Private source files not intended for public release.
