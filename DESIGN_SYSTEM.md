# Read the Room — Design System

A small, reusable system so screens stay consistent and on-brand (Predictive
Success). Tokens live in [`src/app/globals.css`](src/app/globals.css); primitives
in [`src/components/ui`](src/components/ui) and [`src/components/brand`](src/components/brand).

## Tokens

Defined as CSS variables and exposed to Tailwind v4 via `@theme` (so they become
utilities like `bg-psc-red`, `text-psc-gold`, `ring-tile-c`).

### Color

| Token | Value | Use |
|-------|-------|-----|
| `psc-red` / `psc-red-deep` | `#ED1C24` / `#A50F15` | Primary accent; deep = 3D button edge |
| `psc-gold` / `psc-gold-deep` | `#F5A800` / `#BD8200` | Secondary accent; deep = 3D button edge |
| `psc-black` / `psc-ink` | `#111111` / `#0A0A0A` | Text; ink = stage background |
| `psc-paper` | `#FFFFFF` | Light background |
| `psc-gray-1/2/3` | `#B3B3B3` `#6E6E6E` `#3A3A3A` | Neutral ramp |
| `tile-a/b/c/d` | red / gold / green `#1FA463` / blue `#2D5BA8` | Answer tiles (Phase 2) — color **+** shape, color-blind safe |

### Typography
- `font-display` → **Archivo** (600–900): big bold headlines.
- `font-sans` → **Geist Sans**: body / UI.
- `font-mono` → **Geist Mono**: PIN digits.

### Surfaces & motion (utility classes)
- `.stage` — projected near-black game-show background with warm spotlight.
- `.wash` — light hero wash (faint gold/red glows) for landing & player views.
- `.swoosh` — gold underline accent under a heading.
- `--animate-pop`, `--animate-rise` — entrance animations; disabled under
  `prefers-reduced-motion`.

## Components

### `Button` / `ButtonLink` — `src/components/ui/Button.tsx`
Chunky, tappable, with a colored "3D" bottom edge that compresses on press.

| Prop | Values | Default |
|------|--------|---------|
| `variant` | `primary` (red), `gold`, `outline`, `ghost` | `primary` |
| `size` | `sm`, `md`, `lg` | `md` |
| `fullWidth` | boolean | `false` |
| `loading` (Button only) | boolean — shows spinner, locks interaction | `false` |

States: hover (lift/brighten), active (press-down), focus (4px brand ring),
disabled (dimmed). Use `ButtonLink` for navigation, `Button` for actions.

### `Card` — `src/components/ui/Card.tsx`
Rounded surface. `tone="light"` (white, soft shadow) or `tone="stage"`
(translucent panel for the dark host screen).

### Brand — `src/components/brand/`
- `Wordmark` — "Read the Room" lockup; `tone="dark" | "light"`, `size="sm" | "md"`.
- `Shape` / `ShapeRow` — the four Kahoot answer marks (triangle/diamond/circle/square),
  each color paired with a shape for accessibility.

## Principles
1. Reach for a token or primitive before hardcoding a value.
2. Color is always paired with shape on answer marks (color-blind safe).
3. Honor `prefers-reduced-motion`; keep focus rings visible.
4. Mobile-first; big tap targets; works on phone and projected laptop.
