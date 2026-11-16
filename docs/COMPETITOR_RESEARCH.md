# Competitor and market research

**Research date:** 14 November 2026  
**Method:** public product pages and browser-store descriptions. Claims below are vendor-published and have not been independently benchmarked.

## Competitor landscape

| Product | Published strengths | DesignShelf response |
|---|---|---|
| CSS Peeper | Visual inspection of colours, typography, assets, contrast and CSS properties. | Connect inspection to persistent captures, project boards, comparison and export history. |
| CSS Scan | Hover-based CSS inspection, optimised declarations, child elements, pseudo-classes, media queries and live editing. | Make the captured component a durable research artefact with context and version comparison. |
| VisBug | Open-source in-page design/debug tools; point, click, move, resize, edit text/images and inspect spacing/accessibility. | Focus on research capture, organisation, measured token extraction and reusable hand-off. |
| MiroMiro | Website inspection, live style editing, fonts, colours, assets and code export. | Prioritise project workflows and transparent evidence/provenance. |
| Design Context | Design-token extraction, Tailwind v4, DTCG JSON, AI coding context, framework component output and accessibility matrix. | Avoid competing only on export count; deliver trusted reference history and explainable comparisons. |
| Design System Extractor | Token extraction, accessibility mode, DTCG/Tailwind/CSS exports and skill-file creation. | Focus on accurate measurements, local privacy and usable project organisation. |
| PeekCSS | Page-wide palette, fonts, image assets, contrast checks and CSS/SCSS/JSON/Tailwind exports. | Page insights already provide a sampled palette; differentiate through curated component evidence, notes and project hand-off. |
| designlang | CLI-based multi-page design-system extraction, responsive breakpoints, interaction states, visual comparison, DTCG, Figma and AI-agent integrations. | Do not compete on crawler/output breadth. Focus on deliberate human curation, durable component references and a concise evidence pack. |
| Muzli | Curated design inspiration feed and searchable design references. | DesignShelf stores the user's own observed references and captured component evidence rather than curating a feed. |

## Standards and interoperability

The Design Tokens Community Group published the stable Design Tokens Format Module 2025.10 on 28 October 2025. It defines interoperable JSON tokens using explicit `$type` and `$value` fields, including color, dimension, font family and font weight. DesignShelf now exports observed values in this format, plus CSS variables and a Tailwind v4 theme. The export uses neutral sequence names rather than guessing semantic labels such as `primary` or `brand`. The specification is a Community Group report intended for implementation; it is not a W3C Recommendation.

Source: https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/

## Market observations

1. Basic colour/font/CSS extraction is already well served.
2. AI-oriented design tools increasingly export DESIGN.md, Tailwind themes, token JSON and prompts. Export formats alone are not a durable differentiator.
3. Live visual editing is an established feature in VisBug and newer web-inspector products.
4. Privacy/local-first operation is becoming a visible selling point in newer token extractors.
5. There is still a useful product opportunity in combining component capture, project-level visual organisation, evidence provenance, research notes and reliable hand-off in one focused workspace.
6. The compared products place strong emphasis on automated inspection and extraction. designlang already emits a `DESIGN.md` and includes a Chrome extension, responsive/interactions capture, visual-diff and AI-agent integrations. DesignShelf should not claim those features as unique. Its defensible distinction is the deliberate workflow of selecting references, attaching human-authored notes, keeping a local archive and organising evidence into project boards.
7. A large feature checklist is not a defensible differentiator. Reliable capture, clear provenance, safe local storage and a useful project hand-off matter more than claiming support for every framework or output format.

## Positioning recommendation

**DesignShelf — a visual research archive for real interfaces.**

Its primary deliverable should be a curated `DESIGN.md` evidence pack: source context, component selectors, dimensions, viewport, user-authored research notes, observed token values and computed CSS snapshots. The pack should tell a developer or coding agent what was actually observed, what remains unknown and what must not be replaced with generic styling.

The product should help users answer:
- What did I see?
- Which part of the interface matters?
- What are its measured styles and structure?
- Where did it come from, and when did I capture it?
- How does it differ from another version or reference?
- How can I use the evidence in my own project?

## Sources

At the time of research, the designlang repository showed approximately 5.1k GitHub stars and 422 forks. These indicate developer interest, not active installs or customer adoption.

- CSS Peeper: https://csspeeper.com/ and https://chromewebstore.google.com/detail/css-peeper/mbnbehikldjhnfehhnaidhjhoofhpehk
- CSS Scan: https://getcssscan.com/
- VisBug: https://chromewebstore.google.com/detail/visbug/cdockenadnadldjbbgcallicgledbeoc
- MiroMiro: https://chromewebstore.google.com/detail/miromiro/kpmkikjpclolhodgckeogmiiaehpfjhl
- Design Context: https://chromewebstore.google.com/detail/design-context-%E2%80%94-designmd/jbbjcejgmbplhdpmjcoaipahlnfeigdl
- Design System Extractor: https://chromewebstore.google.com/detail/design-system-extractor/nnjekphemngphnhkacefcnobblojapgc
- PeekCSS: https://peekcss.com/
- designlang: https://github.com/Manavarya09/design-extract and https://designlang.app/
- Muzli: https://muz.li/faq/


## Open-source implementation research — 16 November 2026

| Project | Repository | Licence verified | Decision |
|---|---|---|---|
| axe-core | https://github.com/dequelabs/axe-core | MPL-2.0 (repository LICENSE) | Candidate for a future pinned local accessibility engine. Bundle only after reviewing notices, size and isolated-world execution in Chrome and Firefox. |
| ProjectVisBug | https://github.com/GoogleChromeLabs/ProjectVisBug | Apache-2.0 (LICENSE and package metadata) | Study point-and-inspect interaction patterns; no source or artwork copied. |
| Tabster | https://github.com/microsoft/tabster | Not adopted | Reference for keyboard navigation. Native buttons plus a small roving-tabindex controller are sufficient. |
| SmolVLM-Instruct | https://huggingface.co/HuggingFaceTB/SmolVLM-Instruct | Apache-2.0 (model card) | Research-only candidate for optional visual interpretation. Not bundled because model/runtime size and hardware cost conflict with a lightweight extension. |

Patterns translated into DesignShelf: direct element selection, persistent source/selector context, keyboard-first workspace navigation and evidence-based findings. No third-party runtime dependency was added in this pass.

WCAG 2.2 AA baseline: https://www.w3.org/TR/WCAG22/ and https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/. Targets, focus visibility, reflow and reduced motion are treated as implementation requirements, not decorative polish.
