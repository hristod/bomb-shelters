# Address Search Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a search icon at top-center of the map that expands into a text input, geocodes via Nominatim, and flies the map to the result.

**Architecture:** A new `SearchButton.tsx` component (self-contained, same pattern as `CenterMapButton.tsx`) renders a search icon that expands to an input field. On submit, it fetches coordinates from Nominatim's free geocoding API and passes them up to `page.tsx` via a callback that sets `flyToLocation`. Translations are added for the placeholder and error message.

**Tech Stack:** React, Nominatim API (free, no key), Lucide icons, Tailwind CSS.

---

### Task 1: Add translation keys

**Files:**
- Modify: `src/lib/translations.ts`

**Step 1: Add search-related translation keys**

Add these keys to both `bg` and `en`:

```typescript
export const translations = {
  bg: {
    title: "Бомбоубежища в България",
    address: "Адрес",
    operator: "Оператор",
    type: "Тип",
    condition: "Състояние",
    reportProblem: "Сигнал за грешка",
    navigateToNearest: "Най-близко убежище",
    locationRequired: "Необходим е достъп до местоположението, за да намерим най-близкото убежище.",
    locationUnavailable: "Местоположението не е налично. Моля, опитайте отново.",
    searchPlaceholder: "Търсене на адрес...",
    addressNotFound: "Адресът не е намерен",
  },
  en: {
    title: "Bomb Shelters in Bulgaria",
    address: "Address",
    operator: "Operator",
    type: "Type",
    condition: "Condition",
    reportProblem: "Report a problem",
    navigateToNearest: "Nearest shelter",
    locationRequired: "Location access is required to find the nearest shelter.",
    locationUnavailable: "Location unavailable. Please try again.",
    searchPlaceholder: "Search address...",
    addressNotFound: "Address not found",
  },
} as const;
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/translations.ts
git commit -m "feat: add search translation keys"
```

---

### Task 2: Create SearchButton component

**Files:**
- Create: `src/components/SearchButton.tsx`

**Step 1: Create the component**

```tsx
"use client";
import { Search, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n";

interface SearchButtonProps {
  onSearch: (coords: [number, number]) => void;
}

export default function SearchButton({ onSearch }: SearchButtonProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [expanded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        q: query,
        countrycodes: "bg",
        format: "json",
        limit: "1",
      });
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        { headers: { "User-Agent": "BombSheltersBulgaria/1.0" } }
      );
      const data = await res.json();

      if (data.length > 0) {
        onSearch([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        setQuery("");
        setExpanded(false);
      } else {
        setError(t("addressNotFound"));
      }
    } catch {
      setError(t("addressNotFound"));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setExpanded(false);
    setQuery("");
    setError("");
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center justify-center w-11 h-11 bg-white border border-slate-200 rounded-full shadow-sm hover:border-slate-300 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500"
        aria-label={t("searchPlaceholder")}
      >
        <Search className="w-5 h-5 text-slate-600" />
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setError("");
          }}
          placeholder={t("searchPlaceholder")}
          className="w-56 sm:w-72 h-11 pl-4 pr-10 bg-white border border-slate-200 rounded-full shadow-sm text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          disabled={loading}
        />
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          aria-label="Close search"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {error && (
        <span className="text-xs text-red-500 whitespace-nowrap">{error}</span>
      )}
    </form>
  );
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/components/SearchButton.tsx
git commit -m "feat: add SearchButton component with Nominatim geocoding"
```

---

### Task 3: Integrate SearchButton into the page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add SearchButton to the layout**

Add the import and place it at top-center, between the language toggle (top-right) and the map.

```tsx
"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Shelter } from "@/types/shelter";
import { shelters } from "@/lib/shelters";
import LanguageToggle from "@/components/LanguageToggle";
import NavigateButton from "@/components/NavigateButton";
import CenterMapButton from "@/components/CenterMapButton";
import SearchButton from "@/components/SearchButton";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [flyToLocation, setFlyToLocation] = useState<[number, number] | null>(null);

  return (
    <div className="h-dvh relative">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
        <SearchButton onSearch={setFlyToLocation} />
      </div>
      <div className="absolute top-4 right-4 z-[1000]">
        <LanguageToggle />
      </div>
      <Map
        shelters={shelters}
        selectedShelter={selectedShelter}
        onMarkerClick={setSelectedShelter}
        flyToLocation={flyToLocation}
      />
      <div
        className="absolute left-4 right-4 z-[1000] flex flex-col items-end gap-3"
        style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <CenterMapButton onLocate={setFlyToLocation} />
        <NavigateButton shelters={shelters} />
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Manual test**

Run: `npm run dev`

Verify:
1. Search icon appears at top-center of the map
2. Tapping it expands to a text input
3. Typing "Бургас" and pressing Enter flies the map to Burgas
4. Typing gibberish shows "Адресът не е намерен"
5. Pressing X collapses back to the icon
6. Works on mobile viewport (responsive width)

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: integrate address search into map page"
```
