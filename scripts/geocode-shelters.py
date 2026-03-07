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

    try:
        with open(OUTPUT, encoding="utf-8") as f:
            existing = {s["id"]: s for s in json.load(f)}
    except FileNotFoundError:
        existing = {}

    total = len(shelters)
    geocoded = 0
    failed = 0

    for i, shelter in enumerate(shelters):
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

        if (i + 1) % 10 == 0:
            with open(OUTPUT, "w", encoding="utf-8") as f:
                json.dump(shelters, f, ensure_ascii=False, indent=2)

        time.sleep(1)

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(shelters, f, ensure_ascii=False, indent=2)

    print(f"\nDone: {geocoded} geocoded, {failed} failed out of {total}", file=sys.stderr)

if __name__ == "__main__":
    main()
