# Beta Disclaimer Design

## Problem

Users need to know the app is in beta, understand where the data comes from, and know that the creators are not liable for inaccuracies. They should also know how to report issues.

## Design

Two UI elements:

### 1. Persistent Banner (top of map)

- Thin bar at the very top of the viewport, above all other UI
- Text: "Бета версия — данните може да съдържат неточности" (BG) / "Beta — data may contain inaccuracies" (EN)
- Dismissible with X button — hidden for the session via sessionStorage, reappears on next visit
- Subtle amber/yellow background with dark text, not alarming

### 2. First-Visit Modal

- Centered overlay with semi-transparent backdrop
- Appears once on first visit, stored in localStorage so it never shows again
- Short content (3-4 sentences):
  - This app is in beta
  - Location data is based on official МВР information (linked to source PDF)
  - The website and its creators are not responsible for inaccurate locations
  - If you spot an inconsistency, report it — fixes come ASAP but may take time (single developer)
- Source URL: https://mvr.bg/upload/289359/Списък+на+колективни+средства+за+защита.pdf
- Single dismiss button: "Разбрах" (BG) / "Got it" (EN)

## Technical Details

- **Component:** `BetaDisclaimer.tsx` — handles both banner and modal, manages localStorage/sessionStorage
- **Integration:** Rendered in `page.tsx` above the map
- **i18n:** Uses existing i18n system for BG/EN translations
- **Storage:** `localStorage` for modal (permanent dismiss), `sessionStorage` for banner (per-session dismiss)
