# Design

## Context

The frontend client in `apps/frontend` is built with React 18, Vite 5, Tailwind CSS 3.4, TanStack Query 5, and Recharts 2.13. The existing theme relies on generic slate-900/blue tokens and informal shield icons (`ShieldCheck`). See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**
- Replace slate/blue tokens with the official Supabase carbon dark neutral (`#121212`, `#181818`, `#282828`) and emerald palette (`#3ECF8E`, `#34B27B`).
- Replace icon-based/emoji branding in `AppShell` and `LoginPage` with an architectural, text-only monospace wordmark (`BFDP // BATCH FINANCIAL PROCESSOR`).
- Refactor core primitives (`Button`, `Card`, `StatusBadge`, `ProgressBar`, `StatTile`, `EmptyState`) to high-contrast enterprise standards.
- Re-theme Recharts data visualizers (`HistogramChart`, `CategoryBarChart`, `DailyAmountChart`) to use cohesive emerald tones and dark tooltips.
- Ensure 100% type-checking (`npm run typecheck`) and clean Vite production builds (`npm run build -w @bfdp/frontend`).

**Non-Goals:**
- Introducing new UI component frameworks (e.g., Radix, shadcn/ui, MUI); retain the lean Tailwind CSS + clsx architecture.
- Modifying backend endpoints, data models, or WebSocket/polling transport mechanics.
- Adding light-mode toggle; the enterprise platform is strictly calibrated for dark carbon operating environments.

## Decisions

### Decision: Color System and Surface Hierarchy
- **Canvas (`#121212`)**: Deep neutral carbon background without bluish cast.
- **Surface / Panel (`#181818`)**: Elevated cards and sidebar with 1px border `#282828`.
- **Inputs and Recessed Areas (`#141414`)**: Subdued fields with `#282828` border and `#3ECF8E` focus rings.
- **Brand Emerald (`#3ECF8E` / `#34B27B`)**: Primary interaction tone. Primary CTA buttons use `#3ECF8E` background with `#121212` text for maximum visual contrast.
- *Alternatives considered*: Saturated blues (current, discarded as generic) or neon greens (discarded due to eye fatigue).

### Decision: Text-Only Architectural Wordmark
- Replace `<ShieldCheck />` and informal graphics with pure CSS/typography.
- Monospace uppercase mark `BFDP` with tracking (`tracking-wider`), paired with a micro monospace tag `FINANCIAL` or tracking subtitle `BATCH FINANCIAL PROCESSOR`.
- *Alternatives considered*: Stylized SVG logo or emoji (explicitly prohibited by user requirements).

### Decision: Cohesive Chart Visualizations
- Unify Recharts area and bar charts around `#3ECF8E` emerald fills and strokes.
- Use smooth vertical gradients (`#3ECF8E` 40% opacity down to `#121212` 0% opacity).
- Style tooltips with `#181818` background, `#282828` border, and `#EDEDED` text.
- *Alternatives considered*: Retaining multi-color charts with cyan and blue (discarded as discordant "gibberish" colors).

## Risks / Trade-offs

- **[Risk]** Reduced readability on status badges if background tints are too dark → *Mitigation*: Pair 15% opacity fills (`bg-[#3ECF8E]/15`) with full-saturation foreground text (`text-[#3ECF8E]`) and 30% border rings (`ring-1 ring-[#3ECF8E]/30`).
- **[Risk]** Recharts tooltips clashing with dark theme → *Mitigation*: Centralize tooltip configuration into a shared theme object with dark carbon surface and crisp borders.

