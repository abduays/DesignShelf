# DesignShelf visual system

## Direction: Field Notes / Specimen Archive

DesignShelf should feel like a carefully organised design studio archive, not a generic AI dashboard. The interface uses editorial typography, catalogue-like metadata, restrained borders and a warm paper/ink palette.

### Visual rules

- Warm paper backgrounds and ink-coloured text.
- Oxide-red accent reserved for primary actions and important selection states.
- Forest-green used for positive/local status information.
- No purple gradients, glassmorphism, glowing cards, AI sparkles or decorative dashboard charts.
- Serif display type for a small number of editorial headings; system sans-serif for controls; monospace for selectors, tokens and catalogue metadata.
- Square-to-softly-rounded geometry rather than excessive pill shapes.
- Use real component thumbnails as the visual content. Avoid decorative illustrations that do not help inspection.
- Use borders, spacing and typographic hierarchy instead of shadows and gradients to create structure.

### Colour tokens

| Token | Value | Use |
|---|---|---|
| `--ds-bg` | `#F1EFE7` | Main workspace background |
| `--ds-paper` | `#FBFAF5` | Cards and primary surfaces |
| `--ds-paper-2` | `#F6F4ED` | Secondary surfaces |
| `--ds-ink` | `#202923` | Main text |
| `--ds-muted` | `#626D65` | Supporting text |
| `--ds-line` | `#D9D8CE` | Borders and dividers |
| `--ds-accent` | `#B34631` | Primary action and selected state |
| `--ds-green` | `#426C55` | Local/success status |
| `--ds-warning` | `#865A1E` | Warnings |
| `--ds-danger` | `#A33D39` | Destructive actions |
| `--ds-info` | `#3D617F` | Informational findings |

### Type hierarchy

- Display heading: Georgia / system serif, 24–26px.
- Section heading: system sans, 14px, bold.
- Body and controls: 11–13px minimum where practical.
- Metadata: 9–10px monospace or system sans; never use it for important instructions.
- Code: system monospace, 10–11px with readable line-height.

### Interaction rules

- Interactive targets should be at least 24×24 CSS pixels unless an applicable WCAG exception applies.
- Use visible focus indicators and semantic labels.
- Active navigation must be communicated visually and programmatically.
- Respect `prefers-reduced-motion`.
- Avoid relying on colour alone to communicate status.
- Keep destructive actions visually separate from routine actions.

### Screen structure

1. Compact brand header.
2. Clear primary capture action.
3. Short status/feedback strip.
4. Main navigation with concise labels.
5. Task-focused content area.
6. Selected component inspector and code/export area.
7. Secondary tools grouped into purposeful panels.

### Design rationale

The distinctive visual identity comes from a coherent visual metaphor and disciplined information design, not decorative novelty. The archive/specimen concept reinforces the product's actual job: collecting, labelling, comparing and reusing evidence from real interfaces.
