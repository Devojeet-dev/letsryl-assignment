# Proposal

## Why

The current frontend uses generic slate-blue palettes and emoji/shield iconography that look informal and inconsistent with high-volume institutional banking tools. Upgrading to a cohesive, enterprise-grade Supabase dark neutral & emerald design system (`#3ECF8E`), paired with an authoritative text-only architectural wordmark, gives operators a sleek, high-contrast, distraction-free environment for batch transaction auditing.

## What Changes

- **Brand & Typography**: Eliminate generic shield icons and informal emoji graphics. Introduce a text-only, architectural monospace wordmark (`BFDP` with tracking and category subtitle) in the navigation sidebar, header, and login screen.
- **Color System**: Replace generic slate and blue tokens in `tailwind.config.ts` and `globals.css` with Supabase carbon surfaces (`#121212` canvas, `#181818` card panels, `#282828` subtle borders) and vivid emerald accents (`#3ECF8E` primary, `#34B27B` hover).
- **Core Primitives**: Update buttons, cards, status badges, progress bars, and stat tiles in `primitives.tsx` to match Supabase styling (signature dark-on-emerald primary CTA, subtle border highlights, and refined metric counters).
- **Data Visualizations**: Reconfigure Recharts area, bar, and histogram charts to use emerald gradients, subdued gridlines, and sleek dark tooltips.
- **Enterprise Polish**: Refine file drag-and-drop targets in `UploadPage`, jobs table rows in `JobTable`, and statistics tables in `FieldStatsTable` with tabular numerals and clean border contrast.

## Capabilities

### New Capabilities
- `frontend-ui`: Visual design system tokens, typography rules, theme primitives, and dashboard data styling for the Batch Financial Processor frontend application.

### Modified Capabilities
*(None - this introduces the frontend UI specification)*

## Impact

- **Affected Components**: `apps/frontend/tailwind.config.ts`, `globals.css`, `AppShell.tsx`, `primitives.tsx`, `LoginPage.tsx`, `UploadPage.tsx`, `DashboardPage.tsx`, `charts/index.tsx`, `JobTable.tsx`, `BatchesPage.tsx`.
- **Dependencies & Backend**: Zero backend or schema breaking changes. Zero new npm packages required (utilizes existing Tailwind CSS, clsx, and Lucide React).

