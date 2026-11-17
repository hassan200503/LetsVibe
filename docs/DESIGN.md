# Design system

Status: active foundation from E0-009. The token values preserve the current visual identity; the quality bar below governs every new surface after this story.

## North star

Let'sVibe should feel like a private, beautifully made object rather than a feed. The interaction clarity and polish bar meets or exceeds Instagram, Facebook and X; the emotional register is quieter, more editorial and more intentional. The product bar is equally high: every surface must be genuinely useful, unmistakably unique, valuable enough to return to and easy to love. "Expensive" means restraint, not decoration:

- One clear primary action and one accent per view.
- Generous breathing room, crisp typography and precise alignment.
- Depth from light, hairlines and material, not stacked borders and shadows.
- Motion explains state and never delays the person using it.
- Every screen is fast, keyboard usable, screen-reader labelled and honest in dark mode.

We do not copy engagement mechanics that make a social app feel cheap: infinite urgency, badge pressure, dark patterns, autoplay noise, cramped tap targets or competing gradients.

## Quality bar

- Layout on a 4px base rhythm, with 8px as the normal spacing step.
- Minimum 44x44 CSS px for primary touch targets; visible `:focus-visible` outline on every control.
- WCAG 2.2 AA contrast for text and meaningful non-text UI; never use gold for small body copy on light surfaces.
- No layout shift from fonts, images or late badges; image slots reserve their aspect ratio.
- 360px, 768px, 1024px and 1440px are the review widths; mobile is the primary composition.
- Dark mode is designed, not inverted: check elevation, hairlines and accent contrast separately.
- `prefers-reduced-motion` removes decorative motion and makes transitions effectively instant.
- Prefer native semantics and progressive enhancement over custom controls.
- One visual review per story with a screenshot or precise value-equivalence evidence.

## Token architecture

`packages/ui-tokens/src/tokens.ts` is the source of truth. It holds the light/dark palette, world accents, type, spacing, radii, elevation and motion. `packages/ui-tokens/src/css.ts` renders the CSS custom properties, and `tokens.css` is generated and committed. Web imports it once from `globals.css`:

```css
@import "@letsvibe/ui-tokens/tokens.css";
```

Use CSS variables in component CSS and Tailwind arbitrary values only when a utility cannot express the token. Native will import the typed values from `@letsvibe/ui-tokens`; it must not maintain a second palette.

Core semantic groups:

| Group | Examples | Use |
| --- | --- | --- |
| Surface | `--bg`, `--surface`, `--surface-2` | Page, card and inset surfaces |
| Ink | `--ink`, `--muted`, `--line` | Text hierarchy and hairlines |
| Accent | `--accent`, `--accent-ink`, `--accent-soft`, `--accent-2` | One action per view and world identity |
| Metal | `--gold`, `--gold-2`, `--gold-soft` | Moments, numerals, citations, celebration |
| Type | `--font-body`, `--font-display-stack`, `--font-lux-stack`, `--font-lux-numeric-stack` | Body, editorial display and numerals |
| Space | `--space-1` ... `--space-16` | Rhythm and component padding |
| Radius | `--radius-field`, `--radius-card`, `--radius-tile` | Material hierarchy |
| Elevation | `--shadow-card`, `--shadow-tile`, `--shadow-gold` | Light and material, never decoration |
| Motion | `--motion-duration-*`, `--motion-ease-*` | State change, reveals and ambient loops |

World themes change accent values only. They never carry a person's name, private data or product vocabulary.

## Type and composition

- Inter is the interface voice; Fraunces is the editorial display face; Cormorant is reserved for large numerals and lux moments; JetBrains Mono is for technical labels.
- Display type may be expressive, but controls and body copy stay highly legible.
- Use fewer, stronger headings. Avoid all-caps for anything longer than an eyebrow or label.
- Cards should earn their elevation: use `--shadow-card` for primary content, hairlines for structure, and `--shadow-tile` only for larger media surfaces.
- Gold is a scarce material. It marks a moment or a citation; it is not a general-purpose button colour.

## Motion

- Use `--motion-duration-fast` for press/hover feedback, `--motion-duration-base` for form and control transitions, and `--motion-duration-reveal` for entering content.
- Decorative ambient motion (aurora, petals, orbit) runs only under `prefers-reduced-motion: no-preference`.
- Reduced-motion tokens collapse transitions to 0.01ms; never use motion to communicate information that has no static equivalent.
- No parallax, scroll hijacking or perpetual attention loops.

## Duplicate removal plan

E0-009 deliberately kept the rendered values unchanged. The remaining hardcoded values are known and owned:

1. **Dynamic inline styles** in progress bars, call tiles, avatar sizes and world SVG geometry are data-driven and stay inline; they must use token-derived values where a colour or radius is involved.
2. **One-off stage colours** (the cinematic night gradient, aurora blobs, grain, gold shimmer) are intentionally art-directed and live in `globals.css`. Promote them to named stage tokens only when a second surface needs the same material.
3. **Tailwind arbitrary colours** such as the login gold focus ring (`#e2c794`) and hand-picked red/emerald status colours should move to semantic `success`/`danger`/`stage-gold` tokens in E10-004.
4. **Component-specific typography and spacing utilities** (`text-[0.82rem]`, `rounded-[22px]`, arbitrary shadows) should be migrated component by component; do not mass-rewrite screens without visual review.
5. **Ambient animation timings** (aurora drift, twinkle, delayed word/typing reveals) are documented exceptions until E10-005 covers reduced-motion and contrast verification end to end.

E10-004 owns the per-couple theming migration and E10-005 owns reduced-motion/contrast verification. Any new hardcoded colour, radius or duration is a review finding.
