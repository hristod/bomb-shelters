# Map Action Buttons Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a big red "Navigate to nearest shelter" button and a smaller "Center map" button, both requiring geolocation permission on tap.

**Architecture:** A shared geolocation utility provides `getCurrentPosition()` wrapper, Haversine distance calculation, and external maps URL builder. Two new components render as map overlays. The Map component gains a `flyToLocation` callback via a new prop. All strings go through the existing i18n system.

**Tech Stack:** Next.js 16, React 19, Leaflet/react-leaflet, Lucide icons, Tailwind CSS 4

---

### Task 1: Add translation keys

**Files:**
- Modify: `src/lib/translations.ts`

**Step 1: Add new keys to both language objects**

```typescript
export const translations = {
  bg: {
    title: "Бомбоубежища в България",
    address: "Адрес",
    operator: "Оператор",
    type: "Тип",
    condition: "Състояние",
    reportProblem: "Сигнал за грешка",
    navigateToNearest: "Навигирай до най-близкото убежище",
    locationRequired: "Необходим е достъп до местоположението, за да намерим най-близкото убежище.",
    locationUnavailable: "Местоположението не е налично. Моля, опитайте отново.",
  },
  en: {
    title: "Bomb Shelters in Bulgaria",
    address: "Address",
    operator: "Operator",
    type: "Type",
    condition: "Condition",
    reportProblem: "Report a problem",
    navigateToNearest: "Navigate to nearest shelter",
    locationRequired: "Location access is required to find the nearest shelter.",
    locationUnavailable: "Location unavailable. Please try again.",
  },
} as const;

export type Lang = keyof typeof translations;
export type TranslationKey = keyof typeof translations.bg;
```

**Step 2: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 3: Commit**

```bash
git add src/lib/translations.ts
git commit -m "feat: add translation keys for map action buttons"
```

---

### Task 2: Create geolocation utility

**Files:**
- Create: `src/lib/geolocation.ts`

**Step 1: Write the utility**

```typescript
import { Shelter } from "@/types/shelter";

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    });
  });
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findClosestShelter(
  lat: number,
  lng: number,
  shelters: Shelter[]
): Shelter {
  let closest = shelters[0];
  let minDist = Infinity;
  for (const s of shelters) {
    const d = haversineDistance(lat, lng, s.lat, s.lng);
    if (d < minDist) {
      minDist = d;
      closest = s;
    }
  }
  return closest;
}

export function getNavigationUrl(
  userLat: number,
  userLng: number,
  destLat: number,
  destLng: number
): string {
  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isIOS) {
    return `https://maps.apple.com/?saddr=${userLat},${userLng}&daddr=${destLat},${destLng}&dirflg=w`;
  }
  return `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${destLat},${destLng}&travelmode=walking`;
}
```

**Step 2: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 3: Commit**

```bash
git add src/lib/geolocation.ts
git commit -m "feat: add geolocation utility with Haversine and navigation URL"
```

---

### Task 3: Create NavigateButton component

**Files:**
- Create: `src/components/NavigateButton.tsx`

**Step 1: Write the component**

```typescript
"use client";
import { Navigation } from "lucide-react";
import { Shelter } from "@/types/shelter";
import { useI18n } from "@/lib/i18n";
import { getCurrentPosition, findClosestShelter, getNavigationUrl } from "@/lib/geolocation";

interface NavigateButtonProps {
  shelters: Shelter[];
}

export default function NavigateButton({ shelters }: NavigateButtonProps) {
  const { t } = useI18n();

  const handleClick = async () => {
    try {
      const pos = await getCurrentPosition();
      const { latitude, longitude } = pos.coords;
      const closest = findClosestShelter(latitude, longitude, shelters);
      const url = getNavigationUrl(latitude, longitude, closest.lat, closest.lng);
      window.open(url, "_blank");
    } catch (err) {
      if (err instanceof GeolocationPositionError && err.code === err.PERMISSION_DENIED) {
        alert(t("locationRequired"));
      } else {
        alert(t("locationUnavailable"));
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-lg py-4 px-6 rounded-lg shadow-lg transition-colors duration-200 cursor-pointer min-h-[56px] focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
      aria-label={t("navigateToNearest")}
    >
      <Navigation className="w-5 h-5" />
      {t("navigateToNearest")}
    </button>
  );
}
```

**Step 2: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 3: Commit**

```bash
git add src/components/NavigateButton.tsx
git commit -m "feat: add NavigateButton component"
```

---

### Task 4: Create CenterMapButton component and expose flyTo in Map

**Files:**
- Create: `src/components/CenterMapButton.tsx`
- Modify: `src/components/Map.tsx`

**Step 1: Add `onFlyToLocation` prop to Map and a `FlyToLocation` sub-component**

In `src/components/Map.tsx`, add a new prop and sub-component. The Map component already has `FlyToMarker` — add a similar `FlyToLocation` that accepts coordinates:

Add to MapProps interface:
```typescript
interface MapProps {
  shelters: Shelter[];
  selectedShelter: Shelter | null;
  onMarkerClick: (shelter: Shelter) => void;
  flyToLocation: [number, number] | null;
}
```

Add sub-component after `FlyToMarker`:
```typescript
function FlyToLocation({ location }: { location: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.flyTo(location, 14, { duration: 1 });
    }
  }, [location, map]);
  return null;
}
```

Add inside `MapContainer`, after `<FlyToMarker />`:
```typescript
<FlyToLocation location={flyToLocation} />
```

Update the function signature to destructure `flyToLocation`.

**Step 2: Write CenterMapButton**

```typescript
"use client";
import { LocateFixed } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getCurrentPosition } from "@/lib/geolocation";

interface CenterMapButtonProps {
  onLocate: (coords: [number, number]) => void;
}

export default function CenterMapButton({ onLocate }: CenterMapButtonProps) {
  const { t } = useI18n();

  const handleClick = async () => {
    try {
      const pos = await getCurrentPosition();
      onLocate([pos.coords.latitude, pos.coords.longitude]);
    } catch (err) {
      if (err instanceof GeolocationPositionError && err.code === err.PERMISSION_DENIED) {
        alert(t("locationRequired"));
      } else {
        alert(t("locationUnavailable"));
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center justify-center w-11 h-11 bg-white border border-slate-200 rounded-full shadow-sm hover:border-slate-300 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500"
      aria-label="Center map on my location"
    >
      <LocateFixed className="w-5 h-5 text-slate-600" />
    </button>
  );
}
```

**Step 3: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 4: Commit**

```bash
git add src/components/CenterMapButton.tsx src/components/Map.tsx
git commit -m "feat: add CenterMapButton and expose flyToLocation in Map"
```

---

### Task 5: Wire everything into page.tsx

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Update page.tsx to include both buttons and pass new props**

```typescript
"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Shelter } from "@/types/shelter";
import { shelters } from "@/lib/shelters";
import LanguageToggle from "@/components/LanguageToggle";
import NavigateButton from "@/components/NavigateButton";
import CenterMapButton from "@/components/CenterMapButton";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [flyToLocation, setFlyToLocation] = useState<[number, number] | null>(null);

  return (
    <div className="h-screen relative">
      <div className="absolute top-4 right-4 z-[1000]">
        <LanguageToggle />
      </div>
      <Map
        shelters={shelters}
        selectedShelter={selectedShelter}
        onMarkerClick={setSelectedShelter}
        flyToLocation={flyToLocation}
      />
      <div className="absolute bottom-4 right-4 z-[1000]">
        <CenterMapButton onLocate={setFlyToLocation} />
      </div>
      <div className="absolute bottom-4 left-4 right-16 z-[1000]">
        <NavigateButton shelters={shelters} />
      </div>
    </div>
  );
}
```

Note: `right-16` on the navigate button container leaves space for the center-map button in the bottom-right.

**Step 2: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire NavigateButton and CenterMapButton into page layout"
```

---

### Task 6: Visual verification in browser

**Step 1: Start dev server and verify**

Run: `npm run dev`

Check at `http://localhost:3000`:
- [ ] Red "Navigate to nearest shelter" button visible at bottom, full-width with gap for locate button
- [ ] White circular locate button visible at bottom-right
- [ ] Language toggle still visible at top-right
- [ ] All map markers still render
- [ ] Clicking navigate button requests location permission
- [ ] Clicking center-map button requests location permission
- [ ] Both buttons have correct hover states and focus rings
- [ ] Buttons render correctly on mobile viewport (toggle device toolbar in dev tools)
- [ ] Switching language updates the navigate button text

**Step 2: Fix any layout issues if buttons overlap or spacing is off**

Adjust Tailwind classes in `page.tsx` as needed.

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: adjust button layout spacing"
```
