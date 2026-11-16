# GitHub and public release checklist

## Repository preparation

- [x] Product strategy and competitor review documented.
- [x] Visual system and original icon assets added.
- [x] Chrome and Firefox package directories separated.
- [x] Automated Node test suite added.
- [x] Package consistency and local-resource checks added.
- [x] GitHub Actions validation workflow added.
- [x] Contribution and security reporting guidance added.
- [ ] Confirm repository name, description, topics and visibility.
- [ ] Choose an open-source licence. MIT is the simplest permissive option; MPL-2.0 is a file-level copyleft option. Do not publish without an explicit choice.
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

- [ ] Run `npm run validate`.
- [ ] Build separate Chrome and Firefox ZIP files from their package directories.
- [ ] Verify archive integrity and contents.
- [ ] Test installation from the generated ZIPs.
- [ ] Create a version tag and GitHub release notes after approval.

## Publication approval

No GitHub repository creation, push, public release or store submission is authorised until the user has reviewed the final build and explicitly approved publication.
