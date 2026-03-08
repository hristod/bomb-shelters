# Geocoding Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all shelter data with 247 entries from the official PDF (06.10.2025), geocode via Google Maps API, and visually verify each pin.

**Architecture:** Python scripts extract PDF data and geocode addresses. The existing pipeline (`extract-shelters.py` → `geocode-shelters.py`) is rewritten: extraction now reads PDF instead of DOCX, and geocoding switches from Nominatim to Google Maps API for better Bulgarian address accuracy. Final output goes to `public/data/shelters.json` for the Next.js app.

**Tech Stack:** Python 3 (pdfplumber, requests), Google Geocoding API, Playwright MCP for visual verification.

**Data flow:**
```
docs/shelters.pdf → scripts/extract-shelters.py → data/shelters-raw.json (247 entries, no coords)
                  → scripts/geocode-shelters.py → public/data/shelters.json (247 entries, with coords)
```

**Key files:**
- `scripts/extract-shelters.py` — rewrite for PDF input
- `scripts/geocode-shelters.py` — rewrite for Google Geocoding API
- `data/shelters-raw.json` — intermediate output (no coords)
- `public/data/shelters.json` — final app data (with coords)
- `src/types/shelter.ts` — remove `municipality` field (not in new data, not used in UI)

---

### Task 1: Install pdfplumber

The existing extraction script uses `python-docx` for DOCX files. The new source is a PDF, so we need `pdfplumber` to extract table data.

**Step 1: Install pdfplumber**

Run:
```bash
pip install pdfplumber
```

Expected: Successfully installed pdfplumber.

---

### Task 2: Rewrite extract-shelters.py for PDF input

The existing script reads a DOCX with `python-docx`. Rewrite it to read `docs/shelters.pdf` using `pdfplumber`, extract the table rows, detect region headers ("Област Xyz"), and output structured JSON.

**Files:**
- Modify: `scripts/extract-shelters.py`

**Step 1: Rewrite the script**

```python
"""Extract shelter data from the official PDF file."""
import json
import re
import sys
import pdfplumber

def extract_shelters(pdf_path: str) -> list[dict]:
    shelters = []
    current_region = ""
    global_id = 0

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    if not row or all(cell is None or cell.strip() == "" for cell in row):
                        continue

                    cells = [cell.strip() if cell else "" for cell in row]
                    joined = " ".join(cells).strip()

                    # Detect region headers like "Област Бургас"
                    region_match = re.match(r"^Област\s+(.+)$", joined)
                    if region_match:
                        current_region = region_match.group(1).strip()
                        continue

                    # Skip header rows
                    if cells[0] == "№" or "Обект" in cells[0]:
                        continue

                    # Skip non-data rows
                    if not cells[0].isdigit():
                        continue

                    if not current_region:
                        continue

                    global_id += 1

                    # Normalize type
                    raw_type = cells[4] if len(cells) > 4 else ""
                    if "укритие" in raw_type.lower():
                        shelter_type = "Противорадиационно укритие"
                    else:
                        shelter_type = "Скривалище"

                    # Normalize category
                    raw_cat = cells[5] if len(cells) > 5 else ""
                    if "I" in raw_cat and "II" not in raw_cat:
                        category = "I"
                    else:
                        category = "II"

                    shelters.append({
                        "id": global_id,
                        "name": cells[1] if len(cells) > 1 else "",
                        "address": cells[2] if len(cells) > 2 else "",
                        "region": current_region,
                        "operator": cells[3] if len(cells) > 3 else "",
                        "type": shelter_type,
                        "category": category,
                        "lat": None,
                        "lng": None,
                    })

    return shelters

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "docs/shelters.pdf"
    shelters = extract_shelters(path)
    print(f"Extracted {len(shelters)} shelters", file=sys.stderr)
    with open("data/shelters-raw.json", "w", encoding="utf-8") as f:
        json.dump(shelters, f, ensure_ascii=False, indent=2)
    print("Written to data/shelters-raw.json", file=sys.stderr)
```

**Step 2: Run the extraction**

Run:
```bash
cd /Users/hristodimitrov/projects/bomb-shelters && python3 scripts/extract-shelters.py
```

Expected: "Extracted 247 shelters" and `data/shelters-raw.json` written.

**Step 3: Verify the output**

Run:
```bash
python3 -c "
import json
d = json.load(open('data/shelters-raw.json'))
print(f'Total: {len(d)}')
regions = {}
for s in d:
    regions[s['region']] = regions.get(s['region'], 0) + 1
for r, c in sorted(regions.items()):
    print(f'  {r}: {c}')
# Spot check the Константин Петканов entry
for s in d:
    if 'Петканов' in s.get('name', ''):
        print(f'Found: {json.dumps(s, ensure_ascii=False)}')
"
```

Expected: 247 shelters across 21 regions, matching the PDF counts per region:
- Бургас: 14, Варна: 8, Велико Търново: 8, Враца: 13, Габрово: 8, Добрич: 2, Кърджали: 1, Кюстендил: 1, Ловеч: 4, Пазарджик: 13, Перник: 11, Плевен: 14, Пловдив: 16, Разград: 29, Русе: 14, Сливен: 25, Смолян: 29, София град: 25, Стара Загора: 4, Шумен: 1, Ямбол: 7

If count is off, debug by checking which rows are being skipped or misinterpreted. PDF table extraction can be finicky with merged cells or multi-line text.

**Step 4: Commit**

```bash
git add scripts/extract-shelters.py data/shelters-raw.json
git commit -m "feat: rewrite extract-shelters for PDF input (247 shelters from 06.10.2025 list)"
```

---

### Task 3: Rewrite geocode-shelters.py for Google Maps API

Replace Nominatim with Google Geocoding API. Add match quality logging.

**Files:**
- Modify: `scripts/geocode-shelters.py`

**Step 1: Rewrite the script**

```python
"""Geocode shelter addresses via Google Maps Geocoding API.

Reads shelters-raw.json (no coords), writes shelters.json (with coords).
Logs match quality for each entry.
"""
import json
import sys
import time
import urllib.request
import urllib.parse

INPUT = "data/shelters-raw.json"
OUTPUT = "public/data/shelters.json"
API_KEY = "AIzaSyAc9yE2lL2t2i7anirPDjAhBFQhYxuEsn8"
GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"


def geocode(address: str, region: str) -> tuple[float | None, float | None, str]:
    """Geocode an address using Google Maps API.

    Returns (lat, lng, location_type) where location_type is one of:
    ROOFTOP, RANGE_INTERPOLATED, GEOMETRIC_CENTER, APPROXIMATE, or FAILED.
    """
    # Append ", Bulgaria" for better results
    full_address = f"{address}, {region}, Bulgaria"

    params = {
        "address": full_address,
        "key": API_KEY,
        "language": "bg",
        "region": "bg",
    }

    url = f"{GEOCODE_URL}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url)

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())

            if data["status"] == "OK" and data["results"]:
                result = data["results"][0]
                loc = result["geometry"]["location"]
                loc_type = result["geometry"]["location_type"]
                return loc["lat"], loc["lng"], loc_type

            print(f"  API status: {data['status']}", file=sys.stderr)
            return None, None, "FAILED"

    except Exception as e:
        print(f"  Error: {e}", file=sys.stderr)
        return None, None, "FAILED"


def main():
    with open(INPUT, encoding="utf-8") as f:
        shelters = json.load(f)

    total = len(shelters)
    stats = {"ROOFTOP": 0, "RANGE_INTERPOLATED": 0, "GEOMETRIC_CENTER": 0, "APPROXIMATE": 0, "FAILED": 0}

    for i, shelter in enumerate(shelters):
        addr_preview = shelter["address"][:60]
        print(f"[{i+1}/{total}] {addr_preview}...", file=sys.stderr)

        lat, lng, loc_type = geocode(shelter["address"], shelter["region"])
        shelter["lat"] = lat
        shelter["lng"] = lng

        stats[loc_type] = stats.get(loc_type, 0) + 1

        if loc_type == "FAILED":
            print(f"  FAILED: {shelter['name']}", file=sys.stderr)
        elif loc_type == "APPROXIMATE":
            print(f"  APPROXIMATE: {shelter['name']}", file=sys.stderr)

        # Save progress every 10 entries
        if (i + 1) % 10 == 0:
            with open(OUTPUT, "w", encoding="utf-8") as f:
                json.dump(shelters, f, ensure_ascii=False, indent=2)

        # Respect rate limits (50 req/sec for Google, but be polite)
        time.sleep(0.1)

    # Final save
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(shelters, f, ensure_ascii=False, indent=2)

    print(f"\nDone! Geocoded {total} shelters:", file=sys.stderr)
    for k, v in sorted(stats.items()):
        print(f"  {k}: {v}", file=sys.stderr)

    failed = [s for s in shelters if s["lat"] is None]
    if failed:
        print(f"\nFailed entries ({len(failed)}):", file=sys.stderr)
        for s in failed:
            print(f"  - {s['name']}: {s['address']}", file=sys.stderr)


if __name__ == "__main__":
    main()
```

**Step 2: Run the geocoding**

Run:
```bash
cd /Users/hristodimitrov/projects/bomb-shelters && python3 scripts/geocode-shelters.py
```

Expected: All 247 shelters geocoded. Takes ~25 seconds (0.1s delay × 247). Watch for FAILED or APPROXIMATE entries in the output.

**Step 3: Verify output**

Run:
```bash
python3 -c "
import json
d = json.load(open('public/data/shelters.json'))
print(f'Total: {len(d)}')
print(f'With coords: {sum(1 for s in d if s[\"lat\"] is not None)}')
print(f'Null coords: {sum(1 for s in d if s[\"lat\"] is None)}')
# Check Константин Петканов specifically
for s in d:
    if 'Петканов' in s.get('name', ''):
        print(f'Петканов: lat={s[\"lat\"]}, lng={s[\"lng\"]}')
        print(f'  Address: {s[\"address\"]}')
"
```

Expected: 247 entries, all with coordinates. Zero null coords ideally.

**Step 4: Commit**

```bash
git add scripts/geocode-shelters.py public/data/shelters.json
git commit -m "feat: rewrite geocode-shelters with Google Maps API, geocode 247 shelters"
```

---

### Task 4: Update Shelter type (remove municipality)

The new PDF data doesn't have a municipality column. The `municipality` field is only in the TypeScript type but never used in the UI. Remove it.

**Files:**
- Modify: `src/types/shelter.ts`

**Step 1: Remove municipality from Shelter type**

Update `src/types/shelter.ts`:

```typescript
export interface Shelter {
  id: number;
  name: string;
  address: string;
  region: string;
  operator: string;
  type: string;
  category: string;
  lat: number;
  lng: number;
}
```

**Step 2: Verify no build errors**

Run:
```bash
cd /Users/hristodimitrov/projects/bomb-shelters && npx tsc --noEmit
```

Expected: No errors. The `municipality` field is not referenced anywhere else in the codebase.

**Step 3: Commit**

```bash
git add src/types/shelter.ts
git commit -m "refactor: remove unused municipality field from Shelter type"
```

---

### Task 5: Visual verification via Playwright MCP

Verify each shelter's pin placement by navigating the app map to each coordinate.

**Step 1: Start the dev server**

Run (in background):
```bash
cd /Users/hristodimitrov/projects/bomb-shelters && npm run dev
```

**Step 2: Verify with Playwright MCP**

Use the Playwright MCP browser tools to:

1. Navigate to `http://localhost:3000`
2. Wait for the map to load
3. For each shelter (or a sample of shelters), use `browser_evaluate` to pan the map to the shelter's coordinates and zoom in
4. Take a screenshot with `browser_take_screenshot`
5. Visually inspect that the pin is on/near a building, not in a field or wrong city

Focus verification on:
- Shelters with APPROXIMATE geocoding quality
- Any FAILED entries
- The specific "Константин Петканов" entry the user flagged
- Rural/village addresses
- Industrial zone addresses

**Step 3: Record any misplaced pins**

For each misplaced pin:
- Note the shelter ID, name, current lat/lng
- Look up the correct location manually on Google Maps
- Update coordinates directly in `public/data/shelters.json`

**Step 4: Commit fixes**

```bash
git add public/data/shelters.json
git commit -m "fix: correct misplaced shelter coordinates after visual verification"
```

---

### Task 6: Clean up and final verification

**Step 1: Run the app and do a full visual check**

Run:
```bash
cd /Users/hristodimitrov/projects/bomb-shelters && npm run dev
```

Open in Playwright MCP, zoom out to see all of Bulgaria, verify:
- 247 pins visible on the map
- Pins are distributed across the country (21 oblasts)
- No pins outside Bulgaria
- No pins clustered in obviously wrong locations

**Step 2: Build check**

Run:
```bash
cd /Users/hristodimitrov/projects/bomb-shelters && npm run build
```

Expected: Build succeeds with no errors.

**Step 3: Commit any remaining fixes**

```bash
git add -A
git commit -m "chore: finalize shelter data update (247 shelters from 06.10.2025 list)"
```
