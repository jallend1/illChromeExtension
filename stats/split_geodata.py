"""
split_geodata.py
────────────────────────────────────────────────────────────────────────────────
One-time migration script.

Splits an existing geocoded_trips.json into two files:

  geodata.json      — shared address → coordinate lookup, keyed by raw address
  trips_YYYY.json   — shipment records with coordinates removed, year-scoped

Run this once against your existing file, then use geocode_shipments.py and
format_trips.py going forward — both have been updated to produce this
structure natively.

Usage
─────
    python split_geodata.py \\
        --input   shippingArcs/data/geocoded_trips.json \\
        --geodata stats/data/geodata.json \\
        --trips   shippingArcs/data/trips_2025.json

    # Merge into an existing geodata.json (for subsequent years):
    python split_geodata.py \\
        --input   shippingArcs/data/geocoded_trips_2026.json \\
        --geodata stats/data/geodata.json \\
        --trips   shippingArcs/data/trips_2026.json \\
        --merge
────────────────────────────────────────────────────────────────────────────────
"""

import argparse
import json
from pathlib import Path


def load_json(path: str) -> dict:
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def save_json(obj: dict | list, path: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
    size_kb = Path(path).stat().st_size / 1024
    print(f"  Written: {path}  ({size_kb:.1f} KB)")


def main():
    parser = argparse.ArgumentParser(
        description='Split geocoded_trips.json into geodata.json + trips_YYYY.json'
    )
    parser.add_argument('--input',   required=True, help='Path to existing geocoded_trips.json')
    parser.add_argument('--geodata', required=True, help='Path for output geodata.json')
    parser.add_argument('--trips',   required=True, help='Path for output trips_YYYY.json')
    parser.add_argument('--merge',   action='store_true',
                        help='Merge new addresses into an existing geodata.json rather than overwriting')
    args = parser.parse_args()

    # ── Load input ────────────────────────────────────────────────────────────
    print(f"Reading {args.input} …")
    data = load_json(args.input)
    shipments = data['shipments']
    print(f"  {len(shipments):,} shipments")

    # ── Build geodata ─────────────────────────────────────────────────────────
    # Load existing geodata.json if merging
    if args.merge and Path(args.geodata).exists():
        geodata = load_json(args.geodata)
        print(f"  Merging into existing geodata.json ({len(geodata):,} entries)")
    else:
        geodata = {}

    new_entries = 0
    conflict_entries = 0

    for s in shipments:
        raw = s.get('address', '').strip()
        if not raw:
            continue

        entry = {
            'formatted_address': s.get('formatted_address'),
            'lat':               s.get('lat'),
            'lng':               s.get('lng'),
            'country':           s.get('country'),
        }

        if raw in geodata:
            # Check for coordinate conflicts — keep existing, warn if different
            existing = geodata[raw]
            if (existing['lat'] != entry['lat'] or existing['lng'] != entry['lng']):
                conflict_entries += 1
                # Keep whichever has a formatted_address (prefer existing)
            # Either way, don't overwrite
        else:
            geodata[raw] = entry
            new_entries += 1

    print(f"  New geodata entries added : {new_entries:,}")
    print(f"  Existing entries kept     : {len(geodata) - new_entries:,}")
    if conflict_entries:
        print(f"  Coordinate conflicts (kept existing): {conflict_entries}")

    # ── Build stripped trips file ─────────────────────────────────────────────
    COORD_KEYS = {'formatted_address', 'lat', 'lng', 'geocode_status'}
    stripped = []
    for s in shipments:
        stripped.append({k: v for k, v in s.items() if k not in COORD_KEYS})

    trips_out = {
        'origin':      data.get('origin'),
        'year':        data.get('year'),
        'travel_days': data.get('travel_days'),
        'shipments':   stripped,
    }

    # ── Write outputs ─────────────────────────────────────────────────────────
    print(f"\nWriting outputs …")
    save_json(geodata,  args.geodata)
    save_json(trips_out, args.trips)

    print(f"\nDone.")
    print(f"  geodata.json  : {len(geodata):,} unique addresses")
    print(f"  trips file    : {len(stripped):,} shipments (coordinates removed)")
    print(f"  Coord keys stripped from each shipment: {sorted(COORD_KEYS)}")


if __name__ == '__main__':
    main()
