# Spec Delta

## Purpose

Defines visual presentation standards, theme tokens, typography contracts, and component styling for the Batch Financial Processor frontend application.

## ADDED Requirements

### Requirement: Text-Only Architectural Wordmark
The system SHALL present branding and application identification using text-only typography without emojis or pictorial icon graphics.

#### Scenario: Navigation sidebar brand display
- **WHEN** an authenticated user views the application sidebar
- **THEN** the header SHALL display an uppercase monospace wordmark "BFDP" accompanied by a tracking subtitle "BATCH FINANCIAL PROCESSOR" with zero graphic icons or emojis

#### Scenario: Login screen brand presentation
- **WHEN** an unauthenticated visitor navigates to the login screen
- **THEN** the authentication card SHALL display a pure text-only institutional headline and description without graphic badges or shields

### Requirement: Supabase Carbon and Emerald Color Tokens
The system SHALL apply dark carbon surfaces paired with emerald accent colors inspired by the Supabase design system.

#### Scenario: Base canvas and panel background contrast
- **WHEN** the interface is rendered in dark mode
- **THEN** the root background canvas SHALL render in dark carbon `#121212`, panels in elevated carbon `#181818`, and subtle structural dividers in `#282828`

#### Scenario: Interactive accent state
- **WHEN** interactive elements such as primary buttons, active links, or form focus rings are focused or hovered
- **THEN** the elements SHALL use Supabase emerald `#3ECF8E` or hover tone `#34B27B`

### Requirement: Enterprise Button and Primitive Styling
The system SHALL provide high-contrast interactive buttons, status badges, and progress bars adhering to enterprise financial conventions.

#### Scenario: Primary call-to-action button
- **WHEN** a user renders a primary action button
- **THEN** the button SHALL render with solid `#3ECF8E` background and high-contrast dark text `#121212`

#### Scenario: Status badges across job lifecycle
- **WHEN** batch or job statuses are displayed in tables or cards
- **THEN** completed items SHALL display with subtle emerald tint `#3ECF8E/15`, retrying items with amber `#F5A623/15`, failed items with crimson `#EF4444/15`, and queued items with neutral zinc `#71717A/15`

### Requirement: Cohesive Financial Data Visualizations
The system SHALL style dashboard analytical charts with emerald gradients, subtle dark gridlines, and neutral tooltips.

#### Scenario: Daily transaction volume area chart
- **WHEN** the dashboard renders the historical daily transaction volume chart
- **THEN** the area stroke and fill gradient SHALL use Supabase emerald `#3ECF8E` fading smoothly into `#121212` with dark tooltip backgrounds

#### Scenario: Distribution histogram and category charts
- **WHEN** transaction amount histograms or category distribution bars are rendered
- **THEN** the bars SHALL render with cohesive emerald tones without conflicting cyan or saturated blue accents

### Requirement: High Contrast Data Quality and Job Tables
The system SHALL format tabular transaction records, job views, and statistical aggregates with clear typography and tabular numerals.

#### Scenario: Numerical alignment in statistics
- **WHEN** numerical data such as transaction amounts, row counts, and percentiles are rendered
- **THEN** values SHALL render using monospace or tabular numerals (`tabular-nums`) with clear visual hierarchy

