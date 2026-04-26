"""
format_courier_trips.py
────────────────────────────────────────────────────────────────────────────────
Converts a courier shipment CSV into trips_courier_YYYY.json — the same format
as trips_YYYY.json produced by format_trips.py, with two additional fields:
  "source":        "courier"
  "transit_days":  integer or null
  "status":        "Delivered" | "Pickedup" | "Pending"

Destination matching uses a four-step cascade against CourierAddresses.csv:
  1. Exact Dropsite name match
  2. Code prefix match  (e.g. "CHEMEK - Chemeketa CC" → code "CHEMEK")
  3. Fuzzy name match   (e.g. "Whatcom County Library System" → "(WCLS)" entry)
  4. Historical fallback — Dropsite To string used as geodata key directly
     (for stops no longer in the addresses file, e.g. "OSU-NEWP")

Usage
─────
    python format_courier_trips.py \\
        --input     courier_2025.csv \\
        --addresses CourierAddresses.csv \\
        --geodata   stats/data/geodata.json \\
        --output    shippingArcs/data/trips_courier_2025.json \\
        --year      2025

Optional flags
──────────────
    --travel-days  1    Arc animation travel window in days (courier is fast,
                        default 1 vs 15 for mail).
    --fuzzy-cutoff 0.6  Similarity threshold for fuzzy name matching (0-1).
────────────────────────────────────────────────────────────────────────────────
"""

import argparse
import csv
import json
import re
from datetime import date, datetime
from difflib import get_close_matches
from pathlib import Path


# ── Constants ─────────────────────────────────────────────────────────────────

ORIGIN = {"lat": 47.5012, "lng": -122.1150, "label": "KCLS"}

_LABEL = re.compile(
    r'^(actual|mailing|mail|physical|delivery|loading dock)[:\s]+',
    re.IGNORECASE
)


# ── Address helpers ───────────────────────────────────────────────────────────

def clean_street(raw: str) -> str:
    parts = [p.strip() for p in raw.split(';') if p.strip()]
    s = parts[-1] if parts else raw.strip()
    return _LABEL.sub('', s).strip()


def build_address_key(row: dict) -> str:
    return (f"{clean_street(row['Street'])}, "
            f"{row['City'].strip()}, "
            f"{row['State'].strip()} "
            f"{row['Zip'].strip()}")


# ── Address lookup builder ────────────────────────────────────────────────────

def build_lookup(addr_rows: list[dict], fuzzy_cutoff: float) -> dict:
    """
    Returns a dict mapping every possible Dropsite To string → geodata key.
    Builds name, code, and fuzzy indexes in one pass.
    """
    name_to_key    = {}
    code_to_key    = {}
    name_to_display = {}
    code_to_display = {}

    for r in addr_rows:
        key     = build_address_key(r)
        name    = r['Dropsite name'].strip()
        code    = r['Code'].strip()
        display = name
        name_to_key[name]     = key
        code_to_key[code]     = key
        name_to_display[name] = display
        code_to_display[code] = display

    all_names = list(name_to_key.keys())

    def resolve(dropsite_to: str) -> tuple[str, str, str]:
        """
        Returns (geodata_key, display_name, match_method).
        Falls back to using the raw dropsite_to string as both key and name.
        """
        dest = dropsite_to.strip()

        # 1. Exact name
        if dest in name_to_key:
            return name_to_key[dest], name_to_display[dest], 'name'

        # 2. Code prefix  ("CHEMEK - Chemeketa CC" → "CHEMEK")
        if ' - ' in dest:
            code = dest.split(' - ')[0].strip()
            if code in code_to_key:
                return code_to_key[code], code_to_display[code], 'code'

        # 3. Fuzzy name
        close = get_close_matches(dest, all_names, n=1, cutoff=fuzzy_cutoff)
        if close:
            return name_to_key[close[0]], name_to_display[close[0]], f'fuzzy→{close[0]}'

        # 4. Historical fallback — key = dest string itself
        return dest, dest, 'historical'

    return resolve


# ── Date helpers ──────────────────────────────────────────────────────────────

def parse_pickup_date(raw: str) -> str | None:
    """
    Parse "01/07/25 10:11:43" → "2025-01-07".
    Returns None if unparseable.
    """
    raw = raw.strip()
    if not raw:
        return None
    for fmt in ('%m/%d/%y %H:%M:%S', '%m/%d/%y'):
        try:
            return datetime.strptime(raw, fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    return None


def day_of_year(date_str: str, year: int) -> float | None:
    try:
        d = datetime.strptime(date_str, '%Y-%m-%d').date()
        return (d - date(d.year, 1, 1)).days + 1
    except (ValueError, AttributeError):
        return None


# ── JSON helpers ──────────────────────────────────────────────────────────────

def load_json(path: str) -> dict:
    p = Path(path)
    return json.loads(p.read_text(encoding='utf-8')) if p.exists() else {}


def save_json(obj: dict, path: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(
        json.dumps(obj, indent=2, ensure_ascii=False),
        encoding='utf-8'
    )
    size_kb = Path(path).stat().st_size / 1024
    print(f"  Written: {path}  ({size_kb:.1f} KB)")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description='Convert courier shipment CSV to deck.gl TripsLayer format.'
    )
    parser.add_argument('--input',       required=True,
                        help='Courier shipment CSV file')
    parser.add_argument('--addresses',   required=True,
                        help='CourierAddresses.csv')
    parser.add_argument('--geodata',     required=True,
                        help='Path to shared geodata.json')
    parser.add_argument('--output',      required=True,
                        help='Output path for trips_courier_YYYY.json')
    parser.add_argument('--year',        type=int, default=2025,
                        help='Reference year (default 2025)')
    parser.add_argument('--travel-days', type=int, default=1,
                        help='Arc animation travel window in days (default 1)')
    parser.add_argument('--fuzzy-cutoff', type=float, default=0.6,
                        help='Fuzzy name match similarity threshold (default 0.6)')
    args = parser.parse_args()

    # ── Load inputs ───────────────────────────────────────────────────────────
    print(f"Reading {args.input} …")
    with open(args.input, newline='', encoding='utf-8-sig') as f:
        shipment_rows = list(csv.DictReader(f))
    print(f"  {len(shipment_rows):,} rows")

    print(f"Reading {args.addresses} …")
    with open(args.addresses, newline='', encoding='utf-8-sig') as f:
        addr_rows = list(csv.DictReader(f))
    print(f"  {len(addr_rows):,} courier stops")

    geodata = load_json(args.geodata)
    print(f"  {len(geodata):,} geodata entries")

    resolve = build_lookup(addr_rows, args.fuzzy_cutoff)

    # ── Build trips ───────────────────────────────────────────────────────────
    trips        = []
    no_date      = 0
    no_coords    = 0
    match_counts = {'name': 0, 'code': 0, 'fuzzy': 0, 'historical': 0}

    for row in shipment_rows:
        dest         = row.get('Dropsite To', '').strip()
        raw_date     = row.get('PickedUp', '').strip()
        status       = row.get('Status', '').strip()
        barcode      = row.get('Barcode', '').strip()
        transit_raw  = row.get('Transit Time (Days)', '').strip()

        if not dest:
            continue

        # Resolve destination → geodata key + display name
        geo_key, display_name, method = resolve(dest)
        match_type = 'fuzzy' if method.startswith('fuzzy') else method
        match_counts[match_type] = match_counts.get(match_type, 0) + 1

        # Look up coordinates
        geo = geodata.get(geo_key, {})
        lat = geo.get('lat')
        lng = geo.get('lng')

        if lat is None or lng is None:
            no_coords += 1
            continue

        # Parse date
        date_str = parse_pickup_date(raw_date)
        if not date_str:
            no_date += 1
            date_str = f'{args.year}-01-01'

        t_depart = day_of_year(date_str, args.year) or 1
        t_arrive = t_depart + args.travel_days

        try:
            transit_days = int(transit_raw) if transit_raw else None
        except ValueError:
            transit_days = None

        trips.append({
            'waypoints': [
                {'coordinates': [ORIGIN['lng'], ORIGIN['lat']], 'timestamp': t_depart},
                {'coordinates': [lng, lat],                     'timestamp': t_arrive},
            ],
            # Identity
            'tracking_number':   barcode,
            'date':              date_str,
            # Destination
            'recipient_company': display_name,
            'recipient_name':    dest,           # raw Dropsite To for reference
            'address':           geo_key,
            'formatted_address': geo.get('formatted_address'),
            'country':           geo.get('country', 'US'),
            # Coordinates
            'lat':               lat,
            'lng':               lng,
            # Courier-specific
            'status':            status,
            'transit_days':      transit_days,
            'mail_class':        'Courier',      # consistent label for UI filters
            'total_cost':        None,           # placeholder for future integration
            'weight_lbs':        None,           # not available in courier data
            'source':            'courier',
        })

    # Sort chronologically
    trips.sort(key=lambda t: t['waypoints'][0]['timestamp'])

    # ── Report ────────────────────────────────────────────────────────────────
    print(f"\nMatching summary:")
    print(f"  Exact name match  : {match_counts.get('name', 0):,}")
    print(f"  Code prefix match : {match_counts.get('code', 0):,}")
    print(f"  Fuzzy name match  : {match_counts.get('fuzzy', 0):,}")
    print(f"  Historical/no match: {match_counts.get('historical', 0):,}")
    print(f"  Skipped (no coords): {no_coords:,}")
    print(f"  Undated (→ Jan 1) : {no_date:,}")

    # ── Write output ──────────────────────────────────────────────────────────
    output = {
        'origin':      ORIGIN,
        'year':        args.year,
        'travel_days': args.travel_days,
        'source':      'courier',
        'shipments':   trips,
    }

    print(f"\nWriting output …")
    save_json(output, args.output)

    print(f"\nDone.")
    print(f"  Trips written : {len(trips):,}")
    ts = [t['waypoints'][0]['timestamp'] for t in trips]
    if ts:
        print(f"  Date range    : day {min(ts):.0f} → {max(ts):.0f}")


if __name__ == '__main__':
    main()
