# Navigate to Closest Shelter - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an emergency button that geolocates the user and opens turn-by-turn directions to the nearest bomb shelter via Google Maps or Apple Maps.

**Architecture:** A `useGeolocation` hook requests location on mount. A `NavigateButton` component calculates the closest shelter via Haversine distance and opens the appropriate maps URL. The button is rendered in the mobile bottom area and desktop sidebar.

**Tech Stack:** Geolocation API, Haversine formula, Lucide icons, Tailwind CSS. No new dependencies.

**Design doc:** `docs/plans/2026-03-07-navigate-closest-shelter-design.md`

---

### Task 1: Add i18n Translations

**Files:**
- Modify: `src/lib/translations.ts`

**Step 1: Add new translation keys**

Add these keys to both `bg` and `en` objects in `src/lib/translations.ts`:

```typescript
// Add to bg:
navigateToShelter: "Навигирай до най-близкото убежище",
locationRequired: "Достъпът до местоположението е необходим, за да намерите най-близкото убежище.",
locating: "Определяне на местоположение...",

// Add to en:
navigateToShelter: "Navigate to closest shelter",
locationRequired: "Location access is required to find the closest shelter.",
locating: "Locating...",
```

**Step 2: Verify TypeScript picks up new keys**

Run: `npx tsc --noEmit`
Expected: No errors. The `TranslationKey` type auto-derives from the `translations` object.

**Step 3: Commit**

```bash
git add src/lib/translations.ts
git commit -m "feat: add translations for navigate-to-shelter feature"
```

---

### Task 2: Create Geolocation Hook

**Files:**
- Create: `src/lib/useGeolocation.ts`

**Step 1: Create the hook**

```typescript
// src/lib/useGeolocation.ts
"use client";
import { useState, useEffect, useCallback } from "react";

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    error: null,
    loading: true,
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState({ lat: null, lng: null, error: "Geolocation not supported", loading: false });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (err) => {
        setState({ lat: null, lng: null, error: err.message, loading: false });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return { ...state, requestLocation };
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/useGeolocation.ts
git commit -m "feat: add useGeolocation hook"
```

---

### Task 3: Create Haversine Utility and Navigation URL Helper

**Files:**
- Create: `src/lib/geo-utils.ts`

**Step 1: Create the utility file**

```typescript
// src/lib/geo-utils.ts
import { Shelter } from "@/types/shelter";

export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findClosestShelter(
  lat: number, lng: number, shelters: Shelter[]
): Shelter | null {
  if (shelters.length === 0) return null;

  let closest = shelters[0];
  let minDist = haversineDistance(lat, lng, closest.lat, closest.lng);

  for (let i = 1; i < shelters.length; i++) {
    const dist = haversineDistance(lat, lng, shelters[i].lat, shelters[i].lng);
    if (dist < minDist) {
      minDist = dist;
      closest = shelters[i];
    }
  }

  return closest;
}

export function getNavigationUrl(
  originLat: number, originLng: number,
  destLat: number, destLng: number
): string {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isIOS) {
    return `https://maps.apple.com/?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}&dirflg=w`;
  }

  return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=walking`;
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/geo-utils.ts
git commit -m "feat: add haversine distance and navigation URL utilities"
```

---

### Task 4: Create NavigateButton Component

**Files:**
- Create: `src/components/NavigateButton.tsx`

**Step 1: Create the component**

```tsx
// src/components/NavigateButton.tsx
"use client";
import { Navigation } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useGeolocation } from "@/lib/useGeolocation";
import { findClosestShelter, getNavigationUrl } from "@/lib/geo-utils";
import { shelters } from "@/lib/shelters";

export default function NavigateButton() {
  const { t } = useI18n();
  const { lat, lng, error, loading, requestLocation } = useGeolocation();

  const handleClick = () => {
    if (lat !== null && lng !== null) {
      const closest = findClosestShelter(lat, lng, shelters);
      if (closest) {
        const url = getNavigationUrl(lat, lng, closest.lat, closest.lng);
        window.open(url, "_blank", "noopener");
      }
      return;
    }

    if (error) {
      alert(t("locationRequired"));
      return;
    }

    requestLocation();
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-lg rounded-xl shadow-lg transition-colors duration-150 cursor-pointer disabled:opacity-70 disabled:cursor-wait min-h-[56px] md:min-h-[48px] px-4 py-3 focus:outline-none focus:ring-4 focus:ring-red-300"
      aria-label={t("navigateToShelter")}
    >
      <Navigation className="w-5 h-5" />
      {loading ? t("locating") : t("navigateToShelter")}
    </button>
  );
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/components/NavigateButton.tsx
git commit -m "feat: add NavigateButton component"
```

---

### Task 5: Integrate NavigateButton into Page Layout

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add NavigateButton to mobile and desktop layouts**

In `src/app/page.tsx`, import the component at the top:

```tsx
import NavigateButton from "@/components/NavigateButton";
```

Add to the **desktop sidebar** (`<aside>`) — as the last child, sticky at the bottom. Wrap the existing sidebar content and add the button below:

```tsx
<aside className="hidden md:flex md:w-[360px] md:flex-shrink-0 md:flex-col md:border-r md:border-slate-200">
  <div className="p-4 border-b border-slate-200 flex justify-end">
    <LanguageToggle />
  </div>
  <ShelterList {...listProps} onSelectShelter={setSelectedShelter} />
  <div className="p-4 border-t border-slate-200">
    <NavigateButton />
  </div>
</aside>
```

Add to **mobile** — as a fixed bar below the map but above the bottom sheet. Place it right before the `<BottomSheet>` component:

```tsx
{/* Mobile navigate button */}
<div className="fixed bottom-0 left-0 right-0 z-[999] p-3 md:hidden">
  <NavigateButton />
</div>
```

Also adjust the `<BottomSheet>` to leave room for the button by adding bottom padding. Modify the BottomSheet's wrapper in page.tsx — no, instead we adjust the bottom sheet's `bottom` position.

**Step 2: Adjust BottomSheet to sit above the navigate button**

In `src/components/BottomSheet.tsx`, change the fixed positioning from `bottom-0` to `bottom-[68px]` so it sits above the navigate button on mobile:

Change this line:
```tsx
className="fixed bottom-0 left-0 right-0 ...
```
To:
```tsx
className="fixed bottom-[68px] left-0 right-0 ...
```

The 68px accounts for the button (56px min-height) + padding (12px).

**Step 3: Verify both layouts**

Run: `npm run dev`

- **Mobile:** Red "Navigate to closest shelter" button fixed at the bottom. Bottom sheet sits above it. Button requests location on page load (browser permission prompt). Tapping the button opens Google Maps/Apple Maps with walking directions to the nearest shelter.
- **Desktop:** Red button at the bottom of the sidebar.

**Step 4: Verify production build**

Run: `npm run build`
Expected: No errors.

**Step 5: Commit**

```bash
git add src/app/page.tsx src/components/BottomSheet.tsx
git commit -m "feat: integrate navigate-to-closest-shelter button in layout"
```
