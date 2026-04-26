"""
geocode_shipments.py
────────────────────────────────────────────────────────────────────────────────
Reads the KCLS ILL shipping CSV, geocodes each unique destination address via
the Google Maps Geocoding API, and writes two output files:

  geodata.json     — shared address → coordinate lookup (created or merged)
  shipments.json   — shipment records with NO embedded coordinates

Coordinates are intentionally kept out of the shipments file so that geodata
can be shared across multiple years. format_trips.py joins them at runtime.

Usage
─────
    python geocode_shipments.py \\
        --input      shipments_2025.csv \\
        --geodata    stats/data/geodata.json \\
        --output     shippingArcs/data/shipments_2025.json \\
        --api-key    YOUR_GOOGLE_MAPS_API_KEY

    # Subsequent years — merge new addresses into existing geodata:
    python geocode_shipments.py \\
        --input      shipments_2026.csv \\
        --geodata    stats/data/geodata.json \\
        --output     shippingArcs/data/shipments_2026.json \\
        --api-key    YOUR_GOOGLE_MAPS_API_KEY

Optional flags
──────────────
    --cache   geocode_cache.json   Cache file for API results (created if absent).
                                   Re-runs skip already-cached addresses.
    --delay   0.05                 Seconds between API calls (default 0.05 = 20/s).

Output: geodata.json
────────────────────
A flat dictionary keyed by raw address string:

    {
      "1140 Boylston St Boston MA 02215-3693": {
        "formatted_address": "Berklee, 1140 Boylston St, Boston, MA 02215, USA",
        "lat": 42.3465835,
        "lng": -71.08952,
        "country": "US"
      },
      ...
    }

Output: shipments_YYYY.json
───────────────────────────
    {
      "origin": { "lat": 47.5012, "lng": -122.115, "label": "KCLS" },
      "shipments": [
        {
          "tracking_number": "{9455109105156607434847}",
          "date": "2025-01-03",
          "recipient_name": "Stan Getz Library - ILL",
          "recipient_company": "Berklee College of Music",
          "address": "1140 Boylston St Boston MA 02215-3693",
          "country": "US",
          "mail_class": "Library Mail",
          "total_cost": "5.11",
          "weight_lbs": 2
        },
        ...
      ]
    }

Failed geocodes are included with geocode_status logged to the cache only.
────────────────────────────────────────────────────────────────────────────────
"""

import argparse
import csv
import json
import re
import time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen
from urllib.error import URLError


# ── Constants ─────────────────────────────────────────────────────────────────

GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"

ORIGIN = {"lat": 47.5012, "lng": -122.1150, "label": "KCLS"}


# ── Geocoding ─────────────────────────────────────────────────────────────────

def geocode_address(address: str, country: str, api_key: str) -> dict:
    """
    Call the Google Maps Geocoding API for a single address.
    Returns a dict with keys: lat, lng, status, formatted_address.
    """
    query = address if country.upper() == "US" else f"{address}, {country}"
    params = urlencode({"address": query, "key": api_key})

    try:
        with urlopen(f"{GEOCODE_URL}?{params}", timeout=10) as resp:
            data = json.loads(resp.read().decode())
    except URLError as e:
        return {"lat": None, "lng": None, "status": f"NETWORK_ERROR: {e}", "formatted_address": None}
    except json.JSONDecodeError:
        return {"lat": None, "lng": None, "status": "JSON_DECODE_ERROR", "formatted_address": None}

    status = data.get("status", "UNKNOWN")
    if status == "OK" and data.get("results"):
        loc = data["results"][0]["geometry"]["location"]
        return {
            "lat":               loc["lat"],
            "lng":               loc["lng"],
            "status":            "OK",
            "formatted_address": data["results"][0].get("formatted_address"),
        }

    return {"lat": None, "lng": None, "status": status, "formatted_address": None}


# ── Cache helpers ─────────────────────────────────────────────────────────────

def load_json(path: str) -> dict:
    p = Path(path)
    if p.exists():
        with p.open(encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_json(obj: dict | list, path: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)


# ── CSV parsing ───────────────────────────────────────────────────────────────

def parse_weight(raw: str) -> int | None:
    try:
        return int(raw.strip().split()[0])
    except (ValueError, IndexError, AttributeError):
        return None


def parse_date(raw: str) -> str:
    return raw.strip().split()[0] if raw.strip() else ""


def normalize_company(name: str) -> str:
    """
    Normalize institution name variants that differ only in punctuation or
    spacing so that the same library always produces the same grouping key.
    """
    name = re.sub(r'  +', ' ', name.strip())
    name = re.sub(r'\bMid Continent\b', 'Mid-Continent', name)
    name = name.replace('\u2013', '-').replace('\u2014', '-')
    return name


def read_csv(path: str) -> list[dict]:
    rows = []
    with open(path, newline="", encoding="cp1252") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append({
                "tracking_number":   row.get("Package Tracking Number", "").strip(),
                "date":              parse_date(row.get("Transaction Date", "")),
                "recipient_name":    row.get("Recipient Name", "").strip(),
                "recipient_company": normalize_company(row.get("Recipient Company", "")),
                "address":           row.get("Recipient Address", "").strip(),
                "country":           row.get("Recipient Country", "US").strip(),
                "mail_class":        row.get("Class", "").strip(),
                "total_cost":        row.get("Total Cost", "").strip(),
                "weight_lbs":        parse_weight(row.get("Package Weight", "")),
            })
    return rows


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Geocode KCLS ILL shipment addresses.")
    parser.add_argument("--input",   required=True,               help="Input CSV file")
    parser.add_argument("--geodata", required=True,               help="Path to geodata.json (created or merged)")
    parser.add_argument("--output",  required=True,               help="Output shipments JSON (no coordinates)")
    parser.add_argument("--api-key", required=True,               help="Google Maps Geocoding API key")
    parser.add_argument("--cache",   default="geocode_cache.json",help="Geocode result cache")
    parser.add_argument("--delay",   type=float, default=0.05,    help="Seconds between API calls")
    args = parser.parse_args()

    # ── Load inputs ───────────────────────────────────────────────────────────
    print(f"Reading {args.input} …")
    rows = read_csv(args.input)
    print(f"  {len(rows):,} rows loaded.")

    geodata = load_json(args.geodata)
    cache   = load_json(args.cache)
    existing_geo = len(geodata)
    print(f"  {existing_geo:,} existing geodata entries.")
    print(f"  {len(cache):,} cached API results.")

    # ── Geocode unique addresses ──────────────────────────────────────────────
    # Collect unique (address, country) pairs not already in geodata
    needed = {
        (row["address"], row["country"])
        for row in rows
        if row["address"] and row["address"] not in geodata
    }
    print(f"  {len(needed):,} new addresses to geocode.")

    api_calls = 0
    cache_hits = 0
    failures = 0

    for i, (address, country) in enumerate(sorted(needed)):
        cache_key = f"{address}|{country}"

        if cache_key in cache:
            geo = cache[cache_key]
            cache_hits += 1
        else:
            geo = geocode_address(address, country, args.api_key)
            cache[cache_key] = geo
            api_calls += 1
            if api_calls % 50 == 0:
                save_json(cache, args.cache)
            time.sleep(args.delay)

        if geo["lat"] is None:
            failures += 1

        # Add to geodata regardless of success — null coords are valid entries
        # (they'll be skipped by the map rendering)
        geodata[address] = {
            "formatted_address": geo.get("formatted_address"),
            "lat":               geo["lat"],
            "lng":               geo["lng"],
            "country":           country,
        }

        if (i + 1) % 200 == 0 or (i + 1) == len(needed):
            pct = (i + 1) / max(len(needed), 1) * 100
            print(f"  [{i+1:>4}/{len(needed)}] {pct:.0f}%  "
                  f"api={api_calls}  cache={cache_hits}  failures={failures}")

    # Final cache flush
    save_json(cache, args.cache)

    print(f"\nGeocoding complete.")
    print(f"  API calls  : {api_calls:,}")
    print(f"  Cache hits : {cache_hits:,}")
    print(f"  Failures   : {failures:,}")
    print(f"  New geodata entries : {len(geodata) - existing_geo:,}")

    # ── Write geodata.json ────────────────────────────────────────────────────
    save_json(geodata, args.geodata)
    print(f"\nGeodata written to : {args.geodata}  ({len(geodata):,} total entries)")

    # ── Write shipments JSON (no coordinates) ─────────────────────────────────
    output = {
        "origin":    ORIGIN,
        "shipments": rows,   # raw fields only — no lat/lng/formatted_address
    }
    save_json(output, args.output)
    print(f"Shipments written to: {args.output}  ({len(rows):,} records)")

    if failures > 0:
        print(f"\nFailed addresses:")
        for address, entry in geodata.items():
            if entry["lat"] is None:
                print(f"  {address}")


if __name__ == "__main__":
    main()
