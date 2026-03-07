# Bomb Shelters Map Bulgaria - Design Document

## Overview

A simple, mobile-first website that displays 292 bomb shelters in Bulgaria on an interactive map. Data sourced from `docs/2022-03-10-listksz.docx` (official list of collective protection facilities as of 10.03.2022). Bilingual (Bulgarian/English). Hosted on Vercel.

## Data

### Source
- 292 shelters across 22 regions (oblasti)
- Fields per shelter: name, address, region, municipality, operator, type, condition category

### Schema (`shelters.json`)
```json
{
  "id": 1,
  "name": "Противорадиационно укритие - 78 СУ \"Христо Смирненски\"",
  "address": "гр. Банкя, ул. Царибродска, № 5",
  "region": "София град",
  "municipality": "БАНКЯ",
  "operator": "ПОС - Столична община",
  "type": "Противорадиационно укритие",
  "category": "І-ва категория",
  "lat": 42.7105,
  "lng": 23.1472
}
```

### Data Pipeline
1. Python script parses the docx, extracts all 292 entries
2. Geocodes addresses via Nominatim (OpenStreetMap) - one-time batch
3. Outputs `shelters.json` as static data
4. Manual review/correction for failed geocoding results

## Tech Stack

- **Framework:** Next.js (App Router)
- **Map:** Leaflet via react-leaflet, OpenStreetMap tiles
- **Styling:** Tailwind CSS
- **Icons:** Lucide (MIT licensed)
- **i18n:** Bilingual BG/EN with language toggle
- **Hosting:** Vercel (static export)
- All dependencies are free and open source

## Design System

- **Style:** Accessible & Ethical - high contrast, WCAG AAA target
- **Font:** Inter (clean, functional, neutral)
- **Colors:**
  - Text: `#334155` (slate-700)
  - Background: `#F8FAFC` (slate-50)
  - Primary/UI: `#64748B` (slate-500)
  - Secondary: `#94A3B8` (slate-400)
  - Active/Selected: `#F97316` (orange-500)
- **Touch targets:** 44x44px minimum, 8px gaps
- **Focus rings:** 3-4px visible rings for keyboard navigation
- **Transitions:** 150-300ms, respect `prefers-reduced-motion`
- **No emojis as icons** - use Lucide SVG icons

## Layout

### Mobile (< 768px) - Full-screen Map + Bottom Sheet

The map occupies 100vh. A draggable bottom sheet overlays it with 3 snap points:

- **Collapsed (15%)** - Drag handle + shelter count
- **Half (50%)** - Search bar, filters, top of shelter list
- **Expanded (85%)** - Full scrollable list, map still visible behind

Interactions:
- Tap shelter in list -> sheet collapses, map flies to marker, popup opens
- Tap marker on map -> sheet snaps to half, shelter details at top
- Floating top bar with language toggle and search icon

```
+---------------------+
| [BG/EN]       [search] |  <- Floating top bar
|                     |
|       MAP           |  <- Full-screen map
|     (100vh)         |
|                     |
+---------------------+  <- Draggable handle
| ---                 |
| 292 shelters found  |  <- Bottom sheet
| [Search...        ] |
| [Region v] [Type v] |
| +--shelter card---+ |
| +--shelter card---+ |
+---------------------+
```

### Desktop (>= 768px) - Side Panel + Map

Fixed 360px left sidebar with search, filters, language toggle, and scrollable shelter list. Map fills the remaining space.

```
+--------------+------------------------------+
| [Search...]  |                              |
| Region    v  |                              |
| Type      v  |         MAP                  |
| Condition v  |       (fills remaining)      |
| ------------ |                              |
| [BG | EN]    |                              |
| ------------ |                              |
| Shelter 1    |                              |
| Address...   |                              |
| ------------ |                              |
| Shelter 2    |                              |
|   (scrolls)  |                              |
|    360px     |                              |
+--------------+------------------------------+
```

## Features

### Map
- Leaflet with OpenStreetMap tiles
- Markers for all 292 shelters
- Click marker -> popup with name, address, type, condition
- Map centered on Bulgaria (~42.7, 25.5), zoom ~7

### Sidebar / List Panel
- Search by name or address (client-side filtering)
- Filter by region, type (скривалище / противорадиационно укритие), condition category (I-IV)
- Click shelter in list -> map centers on it, opens popup
- Shows result count

### Internationalization
- Bulgarian and English via language toggle
- UI labels translated
- Shelter data remains in Bulgarian (original source)

### Accessibility
- WCAG AAA contrast targets
- Keyboard navigable (focus rings, tab order)
- ARIA labels on interactive elements
- Respects `prefers-reduced-motion`
- Skip links

## Non-Goals (for v1)
- Street view integration
- User accounts or contributions
- Real-time data updates
- Shelter capacity information (not in source data)
- Routing/directions to shelters
