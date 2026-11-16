# Contributing to DesignShelf

Thank you for considering a contribution.

## Project structure

- `background.js` — extension background and message routing.
- `content.js` — page inspection, capture and interaction recording.
- `sidebar.html`, `sidebar.js` and `sidebar.css` — extension workspace.
- `token-export.js` — pure, unit-tested DTCG/CSS/Tailwind token export helpers.
- `project-import.js` — pure, unit-tested import validation and normalisation helpers.
- `icons/` — original SVG and PNG brand assets.
- `chrome/` — Chrome Manifest V3 package.
- `firefox/` — Firefox Manifest V3 package.
- `tests/` — automated static and regression tests.
- `docs/` — product, design, audit and QA documentation.

## Development requirements

- Keep the extension local-first. Do not add telemetry, remote processing, accounts or network calls without an explicit product and privacy review.
- Keep permissions minimal. Prefer user-initiated `activeTab` access and runtime injection.
- Treat all page content, imported project data and cross-context messages as untrusted.
- Do not weaken preview sandboxing or content security restrictions to make a preview look more accurate.
- Preserve the distinction between measured browser values and inferred recommendations.
- Keep Chrome and Firefox package copies in sync.

## Before submitting a change

1. Run `npm run validate`.
2. Check that shared files in `chrome/` and `firefox/` match the root source.
3. Update documentation and `CHANGELOG.md` where appropriate.
4. Include the browser and workflow tested, plus known limitations.

## Contribution scope

Small, focused changes are preferred. Avoid adding dependencies unless they provide a clear benefit and can be audited. Do not submit captured website content, personal data, API keys, credentials or proprietary assets.
