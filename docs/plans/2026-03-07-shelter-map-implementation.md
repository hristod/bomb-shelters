# Bomb Shelters Map - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile-first bilingual website showing 292 bomb shelters in Bulgaria on an interactive map with search and filters.

**Architecture:** Static Next.js app with pre-geocoded shelter data baked in as JSON. Leaflet map with react-leaflet. Bottom sheet on mobile, sidebar on desktop. Simple React context for i18n.

**Tech Stack:** Next.js (App Router), react-leaflet, Leaflet, Tailwind CSS, Lucide icons, Inter font, Vercel hosting.

**Design doc:** `docs/plans/2026-03-07-shelter-map-design.md`

---

### Task 1: Data Extraction Script

**Files:**
- Create: `scripts/extract-shelters.py`

**Step 1: Write the extraction script**

```python
"""Extract shelter data from the official docx file."""
import json
import re
import sys
import docx

def extract_shelters(docx_path: str) -> list[dict]:
    doc = docx.Document(docx_path)
    table = doc.tables[1]

    shelters = []
    current_region = ""
    current_municipality = ""

    for row in table.rows[1:]:  # skip header
        cells = [cell.text.strip() for cell in row.cells]

        if "Област:" in cells[1]:
            current_region = cells[1].replace("Област:", "").strip()
            continue
        if "Община" in cells[1] and "Район" in cells[1]:
            current_municipality = re.sub(r"Община\s*/\s*Район:\s*", "", cells[1]).strip()
            continue
        if not cells[0].isdigit():
            continue

        # Clean address: remove trailing municipality info
        address = re.sub(r"\s*,?\s*Община/Район:.*$", "", cells[2]).strip()

        # Extract category number (I, II, III, IV)
        cat_match = re.match(r"(І+|II|III|IV|I)-?", cells[5])
        category_raw = cells[5].split(":")[0].strip() if ":" in cells[5] else cells[5].strip()

        shelters.append({
            "id": int(cells[0]),
            "name": cells[1],
            "address": address,
            "region": current_region,
            "municipality": current_municipality,
            "operator": cells[3],
            "type": cells[4],
            "category": category_raw,
            "lat": None,
            "lng": None,
        })

    return shelters

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "docs/2022-03-10-listksz.docx"
    shelters = extract_shelters(path)
    print(f"Extracted {len(shelters)} shelters", file=sys.stderr)
    with open("data/shelters-raw.json", "w", encoding="utf-8") as f:
        json.dump(shelters, f, ensure_ascii=False, indent=2)
    print("Written to data/shelters-raw.json", file=sys.stderr)
```

**Step 2: Run extraction**

```bash
mkdir -p data
pip3 install python-docx --break-system-packages -q
python3 scripts/extract-shelters.py
```

Expected: `Extracted 292 shelters` + `data/shelters-raw.json` created.

**Step 3: Verify output**

```bash
python3 -c "import json; d=json.load(open('data/shelters-raw.json')); print(len(d), 'shelters'); print(json.dumps(d[0], ensure_ascii=False, indent=2))"
```

Expected: 292 shelters, first entry has all fields populated.

**Step 4: Commit**

```bash
git add scripts/extract-shelters.py data/shelters-raw.json
git commit -m "feat: add shelter extraction script and raw data"
```

---

### Task 2: Geocoding Script

**Files:**
- Create: `scripts/geocode-shelters.py`

**Step 1: Write the geocoding script**

Uses Nominatim with 1s delay between requests (required by usage policy). Saves progress incrementally so it can be resumed if interrupted.

```python
"""Geocode shelter addresses via Nominatim (OpenStreetMap)."""
import json
import time
import urllib.request
import urllib.parse
import sys

INPUT = "data/shelters-raw.json"
OUTPUT = "data/shelters.json"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
HEADERS = {"User-Agent": "BombSheltersBulgaria/1.0"}

def geocode(address: str, region: str) -> tuple[float | None, float | None]:
    """Query Nominatim for coordinates. Returns (lat, lng) or (None, None)."""
    query = f"{address}, {region}, Bulgaria"
    params = urllib.parse.urlencode({"q": query, "format": "json", "limit": 1, "countrycodes": "bg"})
    url = f"{NOMINATIM_URL}?{params}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as e:
        print(f"  Error: {e}", file=sys.stderr)
    return None, None

def main():
    with open(INPUT, encoding="utf-8") as f:
        shelters = json.load(f)

    # Load existing progress if any
    try:
        with open(OUTPUT, encoding="utf-8") as f:
            existing = {s["id"]: s for s in json.load(f)}
    except FileNotFoundError:
        existing = {}

    total = len(shelters)
    geocoded = 0
    failed = 0

    for i, shelter in enumerate(shelters):
        # Skip if already geocoded
        if shelter["id"] in existing and existing[shelter["id"]]["lat"] is not None:
            shelter["lat"] = existing[shelter["id"]]["lat"]
            shelter["lng"] = existing[shelter["id"]]["lng"]
            geocoded += 1
            continue

        print(f"[{i+1}/{total}] Geocoding: {shelter['address'][:60]}...", file=sys.stderr)
        lat, lng = geocode(shelter["address"], shelter["region"])
        shelter["lat"] = lat
        shelter["lng"] = lng

        if lat is not None:
            geocoded += 1
        else:
            failed += 1
            print(f"  FAILED: {shelter['name'][:40]}", file=sys.stderr)

        # Save progress every 10 entries
        if (i + 1) % 10 == 0:
            with open(OUTPUT, "w", encoding="utf-8") as f:
                json.dump(shelters, f, ensure_ascii=False, indent=2)

        time.sleep(1)  # Nominatim rate limit

    # Final save
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(shelters, f, ensure_ascii=False, indent=2)

    print(f"\nDone: {geocoded} geocoded, {failed} failed out of {total}", file=sys.stderr)

if __name__ == "__main__":
    main()
```

**Step 2: Run geocoding**

```bash
python3 scripts/geocode-shelters.py
```

Expected: Takes ~5 minutes (292 addresses x 1s delay). Prints progress. Creates `data/shelters.json`.

**Step 3: Check results**

```bash
python3 -c "
import json
d = json.load(open('data/shelters.json'))
ok = sum(1 for s in d if s['lat'] is not None)
fail = sum(1 for s in d if s['lat'] is None)
print(f'{ok} geocoded, {fail} failed')
if fail:
    print('Failed:')
    for s in d:
        if s['lat'] is None:
            print(f'  #{s[\"id\"]}: {s[\"address\"][:60]}')
"
```

Expected: Most shelters geocoded. Some may fail - note these for manual correction.

**Step 4: Manually fix failed entries**

For any shelters that failed geocoding, manually look up coordinates and edit `data/shelters.json`. Shelters with `"lat": null` need fixing.

**Step 5: Commit**

```bash
git add scripts/geocode-shelters.py data/shelters.json
git commit -m "feat: add geocoding script and geocoded shelter data"
```

---

### Task 3: Next.js Project Setup

**Files:**
- Create: Next.js project in project root
- Modify: `package.json`, `tailwind.config.ts`, `next.config.ts`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`
- Create: `public/data/shelters.json` (copy from `data/shelters.json`)

**Step 1: Initialize Next.js**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --yes
```

If the directory is not empty, it may prompt. Answer yes to proceed.

**Step 2: Install dependencies**

```bash
npm install leaflet react-leaflet lucide-react
npm install -D @types/leaflet
```

**Step 3: Copy shelter data to public directory**

```bash
cp data/shelters.json public/data/shelters.json
```

**Step 4: Configure Inter font in `src/app/layout.tsx`**

Replace the default font import with:

```tsx
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata = {
  title: "Bomb Shelters Bulgaria | Бомбоубежища България",
  description: "Interactive map of bomb shelters in Bulgaria",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg">
      <body className={`${inter.className} bg-slate-50 text-slate-700`}>
        {children}
      </body>
    </html>
  );
}
```

**Step 5: Create placeholder page `src/app/page.tsx`**

```tsx
export default function Home() {
  return <div className="h-screen flex items-center justify-center">Loading map...</div>;
}
```

**Step 6: Verify it runs**

```bash
npm run dev
```

Visit `http://localhost:3000`. Should show "Loading map..." centered.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js project with Tailwind and dependencies"
```

---

### Task 4: Shelter Types and Data Loading

**Files:**
- Create: `src/types/shelter.ts`
- Create: `src/lib/shelters.ts`

**Step 1: Define shelter type**

```tsx
// src/types/shelter.ts
export interface Shelter {
  id: number;
  name: string;
  address: string;
  region: string;
  municipality: string;
  operator: string;
  type: string;
  category: string;
  lat: number;
  lng: number;
}
```

**Step 2: Create data loading utility**

```tsx
// src/lib/shelters.ts
import { Shelter } from "@/types/shelter";
import data from "../../public/data/shelters.json";

export const shelters: Shelter[] = data.filter(
  (s): s is Shelter => s.lat !== null && s.lng !== null
);

export const regions = [...new Set(shelters.map((s) => s.region))].sort();
export const shelterTypes = [...new Set(shelters.map((s) => s.type))].sort();
export const categories = [...new Set(shelters.map((s) => s.category))].sort();
```

**Step 3: Commit**

```bash
git add src/types/shelter.ts src/lib/shelters.ts
git commit -m "feat: add shelter type definition and data loading"
```

---

### Task 5: Internationalization (i18n)

**Files:**
- Create: `src/lib/i18n.tsx`
- Create: `src/lib/translations.ts`

**Step 1: Create translations**

```tsx
// src/lib/translations.ts
export const translations = {
  bg: {
    title: "Бомбоубежища в България",
    searchPlaceholder: "Търсене по име или адрес...",
    region: "Област",
    type: "Тип",
    category: "Категория",
    allRegions: "Всички области",
    allTypes: "Всички типове",
    allCategories: "Всички категории",
    sheltersFound: "убежища намерени",
    address: "Адрес",
    operator: "Оператор",
    condition: "Състояние",
  },
  en: {
    title: "Bomb Shelters in Bulgaria",
    searchPlaceholder: "Search by name or address...",
    region: "Region",
    type: "Type",
    category: "Category",
    allRegions: "All regions",
    allTypes: "All types",
    allCategories: "All categories",
    sheltersFound: "shelters found",
    address: "Address",
    operator: "Operator",
    condition: "Condition",
  },
} as const;

export type Lang = keyof typeof translations;
export type TranslationKey = keyof typeof translations.bg;
```

**Step 2: Create i18n context**

```tsx
// src/lib/i18n.tsx
"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import { translations, Lang, TranslationKey } from "./translations";

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("bg");
  const t = (key: TranslationKey) => translations[lang][key];
  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
```

**Step 3: Wrap layout with I18nProvider**

Update `src/app/layout.tsx` to wrap `{children}` with `<I18nProvider>`.

**Step 4: Commit**

```bash
git add src/lib/i18n.tsx src/lib/translations.ts src/app/layout.tsx
git commit -m "feat: add i18n context with BG/EN translations"
```

---

### Task 6: Map Component

**Files:**
- Create: `src/components/Map.tsx`
- Create: `src/app/globals.css` (add Leaflet CSS import)

**Step 1: Add Leaflet CSS to globals.css**

Add to the top of `src/app/globals.css`:

```css
@import "leaflet/dist/leaflet.css";
```

**Step 2: Create Map component**

```tsx
// src/components/Map.tsx
"use client";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Shelter } from "@/types/shelter";
import { useI18n } from "@/lib/i18n";
import { useEffect } from "react";

// Fix Leaflet default marker icon issue with bundlers
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FlyToMarker({ shelter }: { shelter: Shelter | null }) {
  const map = useMap();
  useEffect(() => {
    if (shelter) {
      map.flyTo([shelter.lat, shelter.lng], 16, { duration: 1 });
    }
  }, [shelter, map]);
  return null;
}

interface MapProps {
  shelters: Shelter[];
  selectedShelter: Shelter | null;
  onMarkerClick: (shelter: Shelter) => void;
}

export default function Map({ shelters, selectedShelter, onMarkerClick }: MapProps) {
  const { t } = useI18n();

  return (
    <MapContainer
      center={[42.7, 25.5]}
      zoom={7}
      className="h-full w-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToMarker shelter={selectedShelter} />
      {shelters.map((shelter) => (
        <Marker
          key={shelter.id}
          position={[shelter.lat, shelter.lng]}
          icon={defaultIcon}
          eventHandlers={{ click: () => onMarkerClick(shelter) }}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{shelter.name}</p>
              <p className="text-slate-500">{shelter.address}</p>
              <p className="mt-1">{t("type")}: {shelter.type}</p>
              <p>{t("condition")}: {shelter.category}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
```

**Step 3: Verify map renders**

Temporarily update `src/app/page.tsx` to render the Map with all shelters. Use `dynamic` import with `ssr: false` (Leaflet requires browser APIs):

```tsx
"use client";
import dynamic from "next/dynamic";
import { shelters } from "@/lib/shelters";
import { useState } from "react";
import { Shelter } from "@/types/shelter";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  const [selected, setSelected] = useState<Shelter | null>(null);
  return (
    <div className="h-screen">
      <Map shelters={shelters} selectedShelter={selected} onMarkerClick={setSelected} />
    </div>
  );
}
```

Run `npm run dev`, verify map shows with markers.

**Step 4: Commit**

```bash
git add src/components/Map.tsx src/app/globals.css src/app/page.tsx
git commit -m "feat: add Leaflet map component with shelter markers"
```

---

### Task 7: Shelter List and Filters

**Files:**
- Create: `src/components/ShelterList.tsx`
- Create: `src/components/SearchBar.tsx`
- Create: `src/components/Filters.tsx`
- Create: `src/components/ShelterCard.tsx`

**Step 1: Create SearchBar**

```tsx
// src/components/SearchBar.tsx
"use client";
import { Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  const { t } = useI18n();
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent min-h-[44px]"
        aria-label={t("searchPlaceholder")}
      />
    </div>
  );
}
```

**Step 2: Create Filters**

```tsx
// src/components/Filters.tsx
"use client";
import { useI18n } from "@/lib/i18n";
import { regions, shelterTypes, categories } from "@/lib/shelters";

interface FiltersProps {
  region: string;
  type: string;
  category: string;
  onRegionChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
}

function Select({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px] cursor-pointer"
    >
      <option value="">{allLabel}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}

export default function Filters({ region, type, category, onRegionChange, onTypeChange, onCategoryChange }: FiltersProps) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-2">
      <Select label={t("region")} value={region} onChange={onRegionChange} options={regions} allLabel={t("allRegions")} />
      <Select label={t("type")} value={type} onChange={onTypeChange} options={shelterTypes} allLabel={t("allTypes")} />
      <Select label={t("category")} value={category} onChange={onCategoryChange} options={categories} allLabel={t("allCategories")} />
    </div>
  );
}
```

**Step 3: Create ShelterCard**

```tsx
// src/components/ShelterCard.tsx
"use client";
import { MapPin } from "lucide-react";
import { Shelter } from "@/types/shelter";

interface ShelterCardProps {
  shelter: Shelter;
  isSelected: boolean;
  onClick: () => void;
}

export default function ShelterCard({ shelter, isSelected, onClick }: ShelterCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors duration-200 cursor-pointer min-h-[44px] focus:outline-none focus:ring-2 focus:ring-orange-500 ${
        isSelected
          ? "border-orange-500 bg-orange-50"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
      aria-label={shelter.name}
    >
      <p className="font-medium text-sm truncate">{shelter.name}</p>
      <p className="text-xs text-slate-500 mt-1 flex items-start gap-1">
        <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
        <span className="truncate">{shelter.address}</span>
      </p>
      <p className="text-xs text-slate-400 mt-1">{shelter.category}</p>
    </button>
  );
}
```

**Step 4: Create ShelterList (combines search, filters, list)**

```tsx
// src/components/ShelterList.tsx
"use client";
import { useMemo } from "react";
import { Shelter } from "@/types/shelter";
import { useI18n } from "@/lib/i18n";
import SearchBar from "./SearchBar";
import Filters from "./Filters";
import ShelterCard from "./ShelterCard";

interface ShelterListProps {
  shelters: Shelter[];
  selectedShelter: Shelter | null;
  onSelectShelter: (shelter: Shelter) => void;
  search: string;
  onSearchChange: (value: string) => void;
  region: string;
  type: string;
  category: string;
  onRegionChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
}

export default function ShelterList({
  shelters,
  selectedShelter,
  onSelectShelter,
  search,
  onSearchChange,
  region,
  type,
  category,
  onRegionChange,
  onTypeChange,
  onCategoryChange,
}: ShelterListProps) {
  const { t } = useI18n();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return shelters.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q) && !s.address.toLowerCase().includes(q)) return false;
      if (region && s.region !== region) return false;
      if (type && s.type !== type) return false;
      if (category && s.category !== category) return false;
      return true;
    });
  }, [shelters, search, region, type, category]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3 border-b border-slate-200">
        <SearchBar value={search} onChange={onSearchChange} />
        <Filters
          region={region} type={type} category={category}
          onRegionChange={onRegionChange} onTypeChange={onTypeChange} onCategoryChange={onCategoryChange}
        />
        <p className="text-xs text-slate-500">
          {filtered.length} {t("sheltersFound")}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filtered.map((shelter) => (
          <ShelterCard
            key={shelter.id}
            shelter={shelter}
            isSelected={selectedShelter?.id === shelter.id}
            onClick={() => onSelectShelter(shelter)}
          />
        ))}
      </div>
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add src/components/SearchBar.tsx src/components/Filters.tsx src/components/ShelterCard.tsx src/components/ShelterList.tsx
git commit -m "feat: add shelter list with search and filter components"
```

---

### Task 8: Bottom Sheet Component (Mobile)

**Files:**
- Create: `src/components/BottomSheet.tsx`

**Step 1: Create the bottom sheet**

Uses touch events and CSS transforms for snap points. No external library.

```tsx
// src/components/BottomSheet.tsx
"use client";
import { useRef, useState, useCallback, ReactNode, useEffect } from "react";

const SNAP_COLLAPSED = 0.15;
const SNAP_HALF = 0.5;
const SNAP_EXPANDED = 0.85;

interface BottomSheetProps {
  children: ReactNode;
  snapPoint: number;
  onSnapChange: (snap: number) => void;
}

export default function BottomSheet({ children, snapPoint, onSnapChange }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragStartSnap = useRef(snapPoint);

  const nearestSnap = (ratio: number) => {
    const snaps = [SNAP_COLLAPSED, SNAP_HALF, SNAP_EXPANDED];
    return snaps.reduce((prev, curr) =>
      Math.abs(curr - ratio) < Math.abs(prev - ratio) ? curr : prev
    );
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragStartSnap.current = snapPoint;
  }, [snapPoint]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const deltaY = dragStartY.current - e.changedTouches[0].clientY;
    const deltaRatio = deltaY / window.innerHeight;
    const newSnap = nearestSnap(dragStartSnap.current + deltaRatio);
    onSnapChange(newSnap);
    dragStartY.current = null;
  }, [onSnapChange]);

  const height = `${snapPoint * 100}%`;

  return (
    <div
      ref={sheetRef}
      className="fixed bottom-0 left-0 right-0 bg-slate-50 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] transition-[height] duration-300 ease-out z-[1000] flex flex-col md:hidden"
      style={{ height }}
    >
      {/* Drag handle */}
      <div
        className="flex justify-center py-3 cursor-grab"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-10 h-1 rounded-full bg-slate-300" />
      </div>
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export { SNAP_COLLAPSED, SNAP_HALF, SNAP_EXPANDED };
```

**Step 2: Commit**

```bash
git add src/components/BottomSheet.tsx
git commit -m "feat: add draggable bottom sheet component for mobile"
```

---

### Task 9: Language Toggle

**Files:**
- Create: `src/components/LanguageToggle.tsx`

**Step 1: Create toggle component**

```tsx
// src/components/LanguageToggle.tsx
"use client";
import { useI18n } from "@/lib/i18n";
import { Globe } from "lucide-react";

export default function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === "bg" ? "en" : "bg")}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:border-slate-300 transition-colors duration-200 cursor-pointer min-h-[44px] focus:outline-none focus:ring-2 focus:ring-orange-500"
      aria-label="Switch language"
    >
      <Globe className="w-4 h-4" />
      {lang === "bg" ? "EN" : "BG"}
    </button>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/LanguageToggle.tsx
git commit -m "feat: add language toggle component"
```

---

### Task 10: Main Page - Wire Everything Together

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Build the main page with responsive layout**

```tsx
// src/app/page.tsx
"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Shelter } from "@/types/shelter";
import { shelters } from "@/lib/shelters";
import ShelterList from "@/components/ShelterList";
import BottomSheet, { SNAP_COLLAPSED, SNAP_HALF } from "@/components/BottomSheet";
import LanguageToggle from "@/components/LanguageToggle";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [snapPoint, setSnapPoint] = useState(SNAP_HALF);

  const handleSelectFromList = (shelter: Shelter) => {
    setSelectedShelter(shelter);
    setSnapPoint(SNAP_COLLAPSED);
  };

  const handleMarkerClick = (shelter: Shelter) => {
    setSelectedShelter(shelter);
    setSnapPoint(SNAP_HALF);
  };

  const listProps = {
    shelters,
    selectedShelter,
    onSelectShelter: handleSelectFromList,
    search, onSearchChange: setSearch,
    region, type, category,
    onRegionChange: setRegion,
    onTypeChange: setType,
    onCategoryChange: setCategory,
  };

  return (
    <div className="h-screen flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-[360px] md:flex-shrink-0 md:flex-col md:border-r md:border-slate-200">
        <div className="p-4 border-b border-slate-200 flex justify-end">
          <LanguageToggle />
        </div>
        <ShelterList {...listProps} onSelectShelter={(s) => setSelectedShelter(s)} />
      </aside>

      {/* Map */}
      <main className="flex-1 relative">
        {/* Mobile floating top bar */}
        <div className="absolute top-4 right-4 z-[1000] md:hidden">
          <LanguageToggle />
        </div>
        <Map
          shelters={shelters}
          selectedShelter={selectedShelter}
          onMarkerClick={handleMarkerClick}
        />
      </main>

      {/* Mobile bottom sheet */}
      <BottomSheet snapPoint={snapPoint} onSnapChange={setSnapPoint}>
        <ShelterList {...listProps} />
      </BottomSheet>
    </div>
  );
}
```

**Step 2: Verify both layouts**

- `npm run dev`
- Desktop (>768px): Sidebar on left, map on right, language toggle in sidebar
- Mobile (<768px): Full-screen map, floating language toggle top-right, bottom sheet with list

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire up main page with responsive layout"
```

---

### Task 11: Final Polish and Build

**Files:**
- Modify: `next.config.ts` (if needed for static export)
- Modify: `src/app/globals.css` (any final style tweaks)

**Step 1: Test production build**

```bash
npm run build
```

Fix any build errors. Common issues:
- Leaflet SSR errors: ensure Map is loaded with `dynamic(..., { ssr: false })`
- Missing types: ensure `@types/leaflet` is installed

**Step 2: Test production locally**

```bash
npm run start
```

Verify everything works: map loads, markers show, search works, filters work, language toggle works, bottom sheet drags on mobile.

**Step 3: Create `.gitignore` additions if needed**

Ensure `node_modules/`, `.next/` are in `.gitignore` (create-next-app should have handled this).

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: production build ready"
```

---

### Task 12: Deploy to Vercel

**Step 1: Push to GitHub**

```bash
gh repo create bomb-shelters --public --source=. --push
```

**Step 2: Deploy via Vercel**

Connect the GitHub repo to Vercel via the Vercel dashboard, or use the Vercel CLI:

```bash
npx vercel --prod
```

**Step 3: Verify deployment**

Visit the Vercel URL. Test on both desktop and mobile.

**Step 4: Commit any Vercel config if generated**

```bash
git add -A
git commit -m "chore: add Vercel deployment config"
```
