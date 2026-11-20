# Security policy

## Supported versions

Security fixes are applied to the current development/release line. Older builds may not receive updates.

## Reporting a vulnerability

Please do not publish an exploitable vulnerability in a public issue. Use GitHub's **Report a vulnerability** / private vulnerability reporting feature for this repository if it is available. If that feature is unavailable, contact the repository owner through their GitHub profile and request a private reporting channel before sharing technical details.

Include the affected version, browser, reproduction steps and impact. Do not include real user data, credentials, private website content or secrets. Allow reasonable time for investigation and a fix before public disclosure.

## Security design

DesignShelf is intended to operate locally. It uses user-initiated active-tab access, validates extension message senders and payloads, sanitises saved previews, and normalises imported project data. These measures reduce risk but do not constitute a security certification. Users should only capture content they are authorised to inspect and reuse.
