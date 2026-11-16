# Security policy

## Supported versions

Security fixes are applied to the current development/release line. Older builds may not receive updates.

## Reporting a vulnerability

Please do not publish an exploitable vulnerability in a public issue. Once GitHub private vulnerability reporting is enabled for the repository, use that channel to report the issue privately. Include the affected version, browser, reproduction steps and impact. Do not include real user data, credentials or private website content.

## Security design

DesignShelf is intended to operate locally. It uses user-initiated active-tab access, validates extension message senders and payloads, sanitises saved previews, and normalises imported project data. These measures reduce risk but do not constitute a security certification. Users should only capture content they are authorised to inspect and reuse.
