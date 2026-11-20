# GitHub and public release checklist

## Repository preparation

- [x] Product strategy and competitor review documented.
- [x] Visual system and original icon assets added.
- [x] Chrome and Firefox package directories separated.
- [x] Automated Node test suite added.
- [x] Package consistency and local-resource checks added.
- [x] GitHub Actions validation workflow added.
- [x] Contribution and security reporting guidance added.
- [x] Repository name and development repository are established.
- [x] MIT licence added in `LICENSE`.
- [x] User help guide added and linked from README.
- [ ] Confirm final repository visibility and topics for the versioned release.
- [ ] Replace or confirm the Firefox Gecko add-on ID before AMO submission.
- [ ] Confirm authorship and rights for all icons, code and documentation.

## Documentation quality

- [x] README describes product purpose, features, installation, privacy and limitations.
- [x] Help guide covers install, first capture, inspection, organisation, workbench, exports, permissions, privacy and troubleshooting.
- [x] Security policy explains how to report vulnerabilities without public disclosure.
- [x] Third-party register distinguishes research references from bundled dependencies.
- [x] Changelog records documentation and licensing changes.
- [ ] Recheck all documentation against the exact release build and package version.

## Product and engineering gates

- [ ] Finish the feature-by-feature code audit.
- [ ] Resolve all high-priority storage, privacy, security and data-loss findings.
- [ ] Complete functional browser testing in current Chrome stable.
- [ ] Complete functional browser testing in current Firefox stable.
- [ ] Test project import with malformed, nested, oversized and quota-exhaustion cases.
- [ ] Test capture, preview, interaction recording and stop/restart flows across tab navigation.
- [ ] Verify all buttons and controls perform their stated action.
- [ ] Complete keyboard, focus, contrast, zoom and narrow-side-panel checks.
- [ ] Record known limitations and supported browser versions.
- [ ] Review README privacy and permission statements against actual code.

## Release packaging

- [x] Run the Node tests, package checks and independent DTCG validator in CI.
- [x] Build separate Chrome and Firefox ZIP files in CI.
- [x] Verify required package files, archive integrity and SHA-256 checksums in CI.
- [x] Test Chrome ZIP installation/runtime smoke in Chromium CI.
- [ ] Test Firefox ZIP installation in Firefox stable.
- [ ] Complete interactive toolbar/sidebar, permission, capture/export and cross-tab tests in both browsers.
- [ ] Create a version tag and GitHub release notes after approval.

## Publication approval

The development repository already exists and contains merged development commits. A versioned GitHub release, browser-store submission or change to final repository visibility must wait until the owner has reviewed the final source package, browser ZIPs, test report and known limitations and explicitly approved publication.
