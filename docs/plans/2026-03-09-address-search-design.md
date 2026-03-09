# Address Search Design

## Problem

Users need to search for an address and have the map fly to that location, so they can see nearby shelters.

## Design

A magnifying glass icon button at top-center of the map. Tapping it expands into a text input field. User types a Bulgarian address, hits Enter, and the map flies to that location. Tapping outside or pressing X collapses it back to the icon.

## Flow

1. User taps the search icon (top-center, z-index above map, same style as language toggle)
2. Input field expands with a text input + close button
3. User types an address and presses Enter
4. App sends the query to Nominatim: `https://nominatim.openstreetmap.org/search?q={query}&countrycodes=bg&format=json&limit=1`
5. If result found: map flies to the returned coordinates (zoom 16)
6. If no result: brief error message "Адресът не е намерен"
7. User taps X or clicks outside: input collapses back to icon

## Technical Details

- **Component:** `SearchButton.tsx` — self-contained, similar pattern to `CenterMapButton.tsx`
- **Integration:** Passes coordinates up to `page.tsx` via a callback that sets `flyToLocation`
- **API:** Nominatim (OpenStreetMap) — free, no API key needed, 1 req/sec rate limit (fine for user searches)
- **No external dependencies needed** — just a fetch to Nominatim's free API
