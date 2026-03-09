"""Geocode shelter addresses via Google Maps Geocoding API.

Reads shelters-raw.json (no coords), writes public/data/shelters.json (with coords).
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
    full_address = f"{address}, {region}, Bulgaria"

    params = {
        "address": full_address,
        "key": API_KEY,
        "language": "bg",
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
    stats: dict[str, int] = {}

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

        # Respect rate limits
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
