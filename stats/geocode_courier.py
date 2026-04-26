"""
geocode_courier.py
────────────────────────────────────────────────────────────────────────────────
Geocodes all stops in CourierAddresses.csv and merges the results into the
shared geodata.json file alongside the existing mailing address entries.

Courier addresses are keyed differently from mailing addresses:
  Mailing key : raw address string from the shipping CSV
                e.g. "875 W. Garden Ave. Coeur d'Alene ID 83814"
  Courier key : constructed "{street}, {city}, {state} {zip}"
                e.g. "875 W. Garden Ave., Coeur d'Alene, Idaho 83814"

Both key types coexist in geodata.json without conflict. Each entry also
carries a "source" field ("mail" or "courier") so entries can be
distinguished by tooling if needed.

Historical stops (destinations that appeared in courier shipments but are no
longer in CourierAddresses.csv) can be geocoded separately by passing their
name strings via --extra-stops. The script will geocode them by name only,
letting Google resolve the institution to a location.

Usage
─────
    # Geocode all current courier stops and merge into geodata.json:
    python geocode_courier.py \\
        --addresses  CourierAddresses.csv \\
        --geodata    stats/data/geodata.json \\
        --api-key    YOUR_GOOGLE_MAPS_API_KEY

    # Also geocode historical stops no longer in the addresses file:
    python geocode_courier.py \\
        --addresses  CourierAddresses.csv \\
        --geodata    stats/data/geodata.json \\
        --api-key    YOUR_GOOGLE_MAPS_API_KEY \\
        --extra-stops "OSU-NEWP - Oregon State U Newp" "Some Other Library"

Optional flags
──────────────
    --cache    geocode_cache.json   Reuses cached API results (shared with
                                    geocode_shipments.py — same cache file).
    --delay    0.05                 Seconds between API calls.
    --dry-run                       Print what would be geocoded without
                                    making any API calls or writing files.
────────────────────────────────────────────────────────────────────────────────
"""

import argparse
import json
import re
import time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen, Request
from urllib.error import URLError

try:
    import csv
except ImportError:
    raise SystemExit("csv module not available")


# ── Constants ─────────────────────────────────────────────────────────────────

GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"


# ── Address cleaning ──────────────────────────────────────────────────────────

# Prefixes that sometimes appear before the actual street address after a
# semicolon split, e.g. "Actual: 621 E Cataldo Way"
_LABEL_PREFIXES = re.compile(
    r'^(actual|mailing|mail|physical|delivery|loading dock)[:\s]+',
    re.IGNORECASE
)

def clean_street(raw: str) -> str:
    """
    Extract the geocodable street address from a raw Street field.

    Many entries use semicolons to prepend a building description:
      "Foley Library; Mailing: 502 E Boone Ave.; Actual: 621 E Cataldo Way"
      → "621 E Cataldo Way"

    Takes the last semicolon-delimited segment and strips any label prefixes.
    """
    parts = [p.strip() for p in raw.split(';') if p.strip()]
    street = parts[-1] if parts else raw.strip()
    street = _LABEL_PREFIXES.sub('', street).strip()
    return street


def build_address_key(row: dict) -> str:
    """Construct the canonical address string used as the geodata.json key."""
    street = clean_street(row['Street'])
    city   = row['City'].strip()
    state  = row['State'].strip()
    zip_   = row['Zip'].strip()
    return f"{street}, {city}, {state} {zip_}"


# ── Geocoding ─────────────────────────────────────────────────────────────────

def geocode(query: str, api_key: str) -> dict:
    """
    Geocode a query string via Google Maps.
    Returns { lat, lng, formatted_address, status }.
    """
    params  = urlencode({"address": query, "key": api_key})
    request = Request(
        f"{GEOCODE_URL}?{params}",
        headers={"Referer": "https://localhost/"},
    )
    try:
        with urlopen(request, timeout=10) as resp:
            data = json.loads(resp.read().decode())
    except URLError as e:
        return {"lat": None, "lng": None, "formatted_address": None,
                "status": f"NETWORK_ERROR: {e}"}
    except json.JSONDecodeError:
        return {"lat": None, "lng": None, "formatted_address": None,
                "status": "JSON_DECODE_ERROR"}

    status = data.get("status", "UNKNOWN")
    if status != "OK":
        error_msg = data.get("error_message", "No error_message returned")
        print(f"  DEBUG [{status}]: {error_msg}")
    if status == "OK" and data.get("results"):
        loc = data["results"][0]["geometry"]["location"]
        return {
            "lat":               loc["lat"],
            "lng":               loc["lng"],
            "formatted_address": data["results"][0].get("formatted_address"),
            "status":            "OK",
        }
    return {"lat": None, "lng": None, "formatted_address": None, "status": status}


# ── Cache helpers ─────────────────────────────────────────────────────────────

def load_json(path: str) -> dict:
    p = Path(path)
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def save_json(obj: dict, path: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(
        json.dumps(obj, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )


# ── CSV loading ───────────────────────────────────────────────────────────────

def load_addresses(path: str) -> list[dict]:
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Geocode courier stops and merge into geodata.json."
    )
    parser.add_argument("--addresses",   required=True,
                        help="Path to CourierAddresses.csv")
    parser.add_argument("--geodata",     required=True,
                        help="Path to geodata.json (will be created or updated)")
    parser.add_argument("--api-key",     required=True,
                        help="Google Maps Geocoding API key")
    parser.add_argument("--cache",       default="geocode_cache.json",
                        help="Shared geocode cache file")
    parser.add_argument("--delay",       type=float, default=0.05,
                        help="Seconds between API calls")
    parser.add_argument("--extra-stops", nargs="*", default=[],
                        metavar="NAME",
                        help="Historical stop names to geocode by name only")
    parser.add_argument("--dry-run",     action="store_true",
                        help="Print plan without making API calls or writing files")
    args = parser.parse_args()

    # ── Load inputs ───────────────────────────────────────────────────────────
    print(f"Reading {args.addresses} …")
    addr_rows = load_addresses(args.addresses)
    print(f"  {len(addr_rows)} courier stops loaded.")

    geodata = load_json(args.geodata)
    cache   = load_json(args.cache)
    print(f"  {len(geodata)} existing geodata entries.")
    print(f"  {len(cache)} cached API results.")

    # ── Build work list ───────────────────────────────────────────────────────
    # Each item: (geodata_key, geocode_query, display_name, source_label)

    work = []

    for row in addr_rows:
        key   = build_address_key(row)
        name  = row['Dropsite name'].strip()
        query = key  # full address gives better accuracy than name alone
        work.append((key, query, name, 'courier'))

    # Historical/extra stops — geocode by name string only
    for stop_name in args.extra_stops:
        # Use the name string itself as the key (no structured address available)
        key   = stop_name.strip()
        query = stop_name.strip()
        work.append((key, query, stop_name.strip(), 'courier-historical'))

    # Separate new entries from already-geocoded ones
    new_work     = [(k, q, n, s) for k, q, n, s in work if k not in geodata]
    existing     = [(k, q, n, s) for k, q, n, s in work if k in geodata]

    print(f"\nWork plan:")
    print(f"  Already in geodata (will skip) : {len(existing)}")
    print(f"  New entries to geocode         : {len(new_work)}")
    if args.extra_stops:
        print(f"  Historical stops (name-only)   : {len(args.extra_stops)}")

    if args.dry_run:
        print(f"\n-- DRY RUN — no API calls or file writes --")
        print(f"\nWould geocode:")
        for key, query, name, source in new_work:
            print(f"  [{source:18}] {name!r}")
            print(f"    key   : {key!r}")
            print(f"    query : {query!r}")
        return

    if not new_work:
        print(f"\nNothing to do — all courier stops already in geodata.json.")
        return

    # ── Geocode ───────────────────────────────────────────────────────────────
    print(f"\nGeocoding {len(new_work)} new entries …")

    api_calls  = 0
    cache_hits = 0
    failures   = 0

    for i, (key, query, name, source) in enumerate(new_work):
        cache_key = f"courier|{query}"

        if cache_key in cache:
            geo = cache[cache_key]
            cache_hits += 1
        else:
            geo = geocode(query, args.api_key)
            cache[cache_key] = geo
            api_calls += 1
            if api_calls % 50 == 0:
                save_json(cache, args.cache)
            time.sleep(args.delay)

        if geo["lat"] is None:
            failures += 1
            print(f"  FAILED [{geo['status']}]: {query!r}")

        geodata[key] = {
            "name":              name,
            "formatted_address": geo.get("formatted_address"),
            "lat":               geo["lat"],
            "lng":               geo["lng"],
            "country":           "US",   # all courier stops are domestic
            "source":            source,
        }

        if (i + 1) % 20 == 0 or (i + 1) == len(new_work):
            pct = (i + 1) / len(new_work) * 100
            print(f"  [{i+1:>3}/{len(new_work)}] {pct:.0f}%  "
                  f"api={api_calls}  cache={cache_hits}  failures={failures}")

    # Final cache flush
    save_json(cache, args.cache)

    # ── Write geodata ─────────────────────────────────────────────────────────
    save_json(geodata, args.geodata)

    print(f"\nDone.")
    print(f"  API calls made  : {api_calls}")
    print(f"  Cache hits      : {cache_hits}")
    print(f"  Failures        : {failures}")
    print(f"  Total geodata entries now: {len(geodata)}")

    if failures > 0:
        print(f"\nFailed entries (review manually):")
        for key, entry in geodata.items():
            if entry.get("source", "").startswith("courier") and entry["lat"] is None:
                print(f"  {key!r}")


if __name__ == "__main__":
    main()