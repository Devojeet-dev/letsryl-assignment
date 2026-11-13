# Tasks

## 1. Theme Tokens and Global Styles

- [x] 1.1 Update `apps/frontend/tailwind.config.ts` with Supabase color variables (`canvas: #121212`, `panel: #181818`, `panel-card: #1E1E1E`, `edge: #282828`, `brand: #3ECF8E`, `brand-hover: #34B27B`, `brand-muted: rgba(62,207,142,0.12)`) and verify configuration loads cleanly
- [x] 1.2 Update `apps/frontend/src/styles/globals.css` with dark carbon scrollbar colors, custom selection highlights, and refined panel/input base classes and verify styling in the DOM

## 2. Core Primitives and Status Badges

- [x] 2.1 Refactor `Button`, `Card`, `StatTile`, `ProgressBar`, `EmptyState`, and `Spinner` in `apps/frontend/src/components/ui/primitives.tsx` to use Supabase emerald primary actions (`#3ECF8E` with `#121212` text) and dark carbon panels
- [x] 2.2 Refactor `StatusBadge` in `apps/frontend/src/components/ui/primitives.tsx` with high-contrast emerald (`COMPLETED`), amber (`RETRYING`), crimson (`FAILED`), and zinc (`QUEUED`) ring tones

## 3. Typographic Wordmark and Navigation Layout

- [x] 3.1 Replace `ShieldCheck` icon in `apps/frontend/src/components/layout/AppShell.tsx` with a text-only monospace wordmark `BFDP // BATCH FINANCIAL PROCESSOR` and an emerald active navigation indicator
- [x] 3.2 Update `apps/frontend/src/features/auth/pages/LoginPage.tsx` to eliminate shield icons, implement the architectural text-only headline, and style sign-in actions with Supabase emerald CTA and dark token forms

## 4. Charts, Tables, and View Refinements

- [x] 4.1 Update `HistogramChart`, `CategoryBarChart`, and `DailyAmountChart` in `apps/frontend/src/features/dashboard/charts/index.tsx` with Supabase emerald area gradients, cohesive bar fills, dark carbon tooltip styling, and muted gridlines
- [x] 4.2 Restyle drag-and-drop file upload target in `apps/frontend/src/features/upload/pages/UploadPage.tsx` and job status items in `apps/frontend/src/features/jobs/components/JobTable.tsx` for sleek carbon contrast
- [x] 4.3 Restyle KPI tiles, batch cards, and data quality panels in `DashboardPage.tsx`, `KpiGrid.tsx`, `panels/index.tsx`, and `BatchesPage.tsx`

## 5. Verification and Production Build

- [x] 5.1 Run TypeScript type-checking across the workspace (`npm run typecheck`) and verify 0 type errors
- [x] 5.2 Build the frontend bundle (`npm run build -w @bfdp/frontend`) and verify production asset bundling succeeds

