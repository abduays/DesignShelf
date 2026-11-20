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
- [ ] Confirm final repository visibility and topics for the versioned release.
- [ ] Choose an open-source licence. MIT is the simplest permissive option; MPL-2.0 is a file-level copyleft option. Do not add a licence without the owner's explicit choice.
- [ ] Replace or confirm the Firefox Gecko add-on ID before AMO submission.
- [ ] Confirm authorship and rights for all icons, code and documentation.

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
- [x] Build separate Chrome and Firefox ZIP files from their package directories in CI.
- [x] Verify required package files, archive integrity and SHA-256 checksums in CI.
- [x] Test Chrome ZIP installation/runtime smoke in Chrome stable CI.
- [ ] Test Firefox ZIP installation in Firefox stable.
- [ ] Complete interactive toolbar/sidebar, permission, capture/export and cross-tab tests in both browsers.
- [ ] Create a version tag and GitHub release notes after approval.

## Publication approval

The development repository already exists and contains merged development commits. A versioned GitHub release, browser-store submission or change to final repository visibility must wait until the owner has reviewed the final source package, browser ZIPs, test report and known limitations and explicitly approved publication.
