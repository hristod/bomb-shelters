# Map Action Buttons - Design Document

## Overview

Two map overlay buttons: a prominent "Navigate to nearest shelter" button and a smaller "Center map on my location" button. Both require geolocation permission, requested on tap (not on page load).

## Button 1: Navigate to Nearest Shelter

- **Position:** Fixed at bottom-center, full-width with ~16px horizontal padding
- **Size:** Min-height 56px, rounded-lg
- **Style:** `bg-red-600`, white bold text, subtle shadow
- **Icon:** Lucide `Navigation` icon left of text
- **Label:** Bilingual — "Навигирай до най-близкото убежище" / "Navigate to nearest shelter"
- **Behavior:**
  1. On tap: request geolocation via `navigator.geolocation.getCurrentPosition()`
  2. Calculate closest shelter using Haversine formula
  3. Open external maps in new tab — Apple Maps on iOS, Google Maps otherwise
  4. If location denied: show alert (bilingual)

## Button 2: Center Map on My Location

- **Position:** Bottom-right corner, above the navigate button
- **Size:** 44x44px circle
- **Style:** `bg-white`, `border border-slate-200`, `shadow-sm`, slate icon
- **Icon:** Lucide `LocateFixed` icon
- **Behavior:**
  1. On tap: request geolocation
  2. Fly map to user's current position (zoom ~14)
  3. If location denied: show alert

## Shared

- Both buttons use the same geolocation request/permission flow
- A shared utility in `src/lib/geolocation.ts` handles permission + Haversine + maps URL
- Location is NOT requested on page load — only when a button is tapped
- Both positioned at `z-[1000]` to overlay the map

## Layout

```
┌─────────────────────────────┐
│           MAP               │
│                        [📍] │  ← center-map button, bottom-right
│  [🔴 Navigate to nearest  ] │  ← full-width red button, ~16px from bottom
└─────────────────────────────┘
```

## Component Changes

- **New: `src/components/NavigateButton.tsx`** — red button with geolocation + Haversine + external maps
- **New: `src/components/CenterMapButton.tsx`** — circular locate button
- **New: `src/lib/geolocation.ts`** — shared geolocation utility (getCurrentPosition wrapper, Haversine calc, maps URL builder)
- **`page.tsx`** — add both buttons, pass shelters to NavigateButton, pass map callback to CenterMapButton
- **`Map.tsx`** — expose a way to fly to arbitrary coordinates (for center-map)
- **`translations.ts`** — add new keys for button labels and error messages
