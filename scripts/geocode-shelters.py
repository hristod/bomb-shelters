"""Geocode shelter addresses via Nominatim (OpenStreetMap).

Uses structured queries with fallback:
1. Try street + city (structured query)
2. Try city only (fallback for failed street lookups)
"""
import json
import re
import time
import urllib.request
import urllib.parse
import sys

INPUT = "data/shelters-raw.json"
OUTPUT = "data/shelters.json"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
HEADERS = {"User-Agent": "BombSheltersBulgaria/1.0"}


def parse_address(address: str) -> tuple[str, str]:
    """Extract city and street from Bulgarian address format."""
    city_match = re.match(r"(?:гр\.|с\.)\s*([^,]+)", address)
    city = city_match.group(1).strip() if city_match else ""

    street_match = re.search(
        r"(?:ул\.|бул\.|пл\.|ж\.к\.)\s*([^,№]+?)(?:,\s*№\s*(\S+))?(?:,|$)",
        address,
    )
    if street_match:
        street_name = street_match.group(1).strip().strip('"')
        number = street_match.group(2) or ""
        if number in ("0", "/0/", ""):
            street = street_name
        else:
            street = f"{street_name} {number}"
    else:
        street = ""

    return city, street


def geocode_structured(city: str, street: str = "") -> tuple[float | None, float | None]:
    """Query Nominatim with structured parameters."""
    params: dict[str, str] = {
        "format": "json",
        "limit": "1",
        "countrycodes": "bg",
    }
    if city:
        params["city"] = city
    if street:
        params["street"] = street

    url = f"{NOMINATIM_URL}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as e:
        print(f"  Error: {e}", file=sys.stderr)
    return None, None


def geocode_shelter(address: str) -> tuple[float | None, float | None, str]:
    """Geocode with fallback: street-level -> city-level."""
    city, street = parse_address(address)

    if not city:
        return None, None, "no_city"

    if street:
        lat, lng = geocode_structured(city, street)
        if lat is not None:
            return lat, lng, "street"
        time.sleep(1)

    lat, lng = geocode_structured(city)
    if lat is not None:
        return lat, lng, "city"

    return None, None, "failed"


def main():
    with open(INPUT, encoding="utf-8") as f:
        shelters = json.load(f)

    total = len(shelters)
    stats = {"street": 0, "city": 0, "failed": 0}

    for i, shelter in enumerate(shelters):
        print(f"[{i+1}/{total}] {shelter['address'][:60]}...", file=sys.stderr)
        lat, lng, method = geocode_shelter(shelter["address"])
        shelter["lat"] = lat
        shelter["lng"] = lng

        if method == "street":
            stats["street"] += 1
        elif method == "city":
            stats["city"] += 1
            print(f"  -> city-level fallback", file=sys.stderr)
        else:
            stats["failed"] += 1
            print(f"  FAILED", file=sys.stderr)

        if (i + 1) % 10 == 0:
            with open(OUTPUT, "w", encoding="utf-8") as f:
                json.dump(shelters, f, ensure_ascii=False, indent=2)

        time.sleep(1)

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(shelters, f, ensure_ascii=False, indent=2)

    print(f"\nDone:", file=sys.stderr)
    print(f"  Street-level: {stats['street']}", file=sys.stderr)
    print(f"  City-level:   {stats['city']}", file=sys.stderr)
    print(f"  Failed:       {stats['failed']}", file=sys.stderr)


if __name__ == "__main__":
    main()
