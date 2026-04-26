"""
format_trips.py
────────────────────────────────────────────────────────────────────────────────
Converts a shipments JSON file (produced by geocode_shipments.py) into the
waypoint format required by deck.gl's TripsLayer, joining coordinates from
the shared geodata.json lookup.

Usage
─────
    python format_trips.py \\
        --input    shippingArcs/data/shipments_2025.json \\
        --geodata  stats/data/geodata.json \\
        --output   shippingArcs/data/trips_2025.json

Optional flags
──────────────
    --travel-days  15    Arc travel duration in "days" for animation.
    --year         2025  Reference year for day-of-year timestamp calculation.

Output format
─────────────
{
  "origin": { "lat": 47.5012, "lng": -122.115, "label": "KCLS" },
  "year": 2025,
  "travel_days": 15,
  "shipments": [
    {
      "waypoints": [
        { "coordinates": [-122.115, 47.5012], "timestamp": 3  },
        { "coordinates": [-71.0895, 42.3466], "timestamp": 18 }
      ],
      "tracking_number":   "...",
      "date":              "2025-01-03",
      "recipient_name":    "Stan Getz Library - ILL",
      "recipient_company": "Berklee College of Music",
      "address":           "1140 Boylston St Boston MA 02215-3693",
      "formatted_address": "Berklee, 1140 Boylston St, Boston, MA 02215, USA",
      "country":           "US",
      "mail_class":        "Library Mail",
      "total_cost":        "5.11",
      "weight_lbs":        2,
      "lat":               42.3465835,
      "lng":               -71.08952
    },
    ...
  ]
}

Coordinates are joined from geodata.json at this step so the JS side receives
a fully self-contained trips file and needs no secondary fetch.
────────────────────────────────────────────────────────────────────────────────
"""

import argparse
import json
from datetime import date, datetime
from pathlib import Path


# ── Helpers ───────────────────────────────────────────────────────────────────

def load_json(path: str) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(obj: dict, path: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
    size_kb = Path(path).stat().st_size / 1024
    print(f"  Written: {path}  ({size_kb:.1f} KB)")


def day_of_year(date_str: str, year: int) -> float | None:
    """
    Convert a YYYY-MM-DD date string to a 1-based day-of-year float.
    Returns None if unparseable.
    """
    try:
        d = datetime.strptime(date_str.strip().split()[0], "%Y-%m-%d").date()
        return (d - date(d.year, 1, 1)).days + 1
    except (ValueError, AttributeError):
        return None


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Convert shipments JSON to deck.gl TripsLayer format."
    )
    parser.add_argument("--input",       required=True,          help="Path to shipments_YYYY.json")
    parser.add_argument("--geodata",     required=True,          help="Path to shared geodata.json")
    parser.add_argument("--output",      required=True,          help="Path for output trips_YYYY.json")
    parser.add_argument("--travel-days", type=int, default=15,   help="Arc travel duration in days")
    parser.add_argument("--year",        type=int, default=2025, help="Reference year")
    args = parser.parse_args()

    # ── Load inputs ───────────────────────────────────────────────────────────
    print(f"Reading {args.input} …")
    data    = load_json(args.input)
    geodata = load_json(args.geodata)

    origin    = data.get("origin")
    shipments = data.get("shipments", [])

    print(f"  {len(shipments):,} shipments")
    print(f"  {len(geodata):,} geodata entries")

    # ── Build trips ───────────────────────────────────────────────────────────
    trips      = []
    no_date    = 0
    no_coords  = 0

    for s in shipments:
        address = s.get("address", "")
        geo     = geodata.get(address, {})
        lat     = geo.get("lat")
        lng     = geo.get("lng")

        # Skip shipments with no coordinates — they can't render on the map
        if lat is None or lng is None:
            no_coords += 1
            continue

        t_depart = day_of_year(s.get("date", ""), args.year)
        if t_depart is None:
            no_date += 1
            t_depart = 1  # place undated shipments at Jan 1

        t_arrive = t_depart + args.travel_days

        trips.append({
            "waypoints": [
                {"coordinates": [origin["lng"], origin["lat"]], "timestamp": t_depart},
                {"coordinates": [lng, lat],                     "timestamp": t_arrive},
            ],
            # Shipment fields
            "tracking_number":   s.get("tracking_number"),
            "date":              s.get("date"),
            "recipient_name":    s.get("recipient_name"),
            "recipient_company": s.get("recipient_company"),
            "address":           address,
            "country":           s.get("country"),
            "mail_class":        s.get("mail_class"),
            "total_cost":        s.get("total_cost"),
            "weight_lbs":        s.get("weight_lbs"),
            # Joined coordinate fields (for JS rendering convenience)
            "formatted_address": geo.get("formatted_address"),
            "lat":               lat,
            "lng":               lng,
        })

    # Sort chronologically so animation plays in order
    trips.sort(key=lambda t: t["waypoints"][0]["timestamp"])

    # ── Write output ──────────────────────────────────────────────────────────
    output = {
        "origin":      origin,
        "year":        args.year,
        "travel_days": args.travel_days,
        "shipments":   trips,
    }

    print(f"\nWriting output …")
    save_json(output, args.output)

    print(f"\nDone.")
    print(f"  Trips written    : {len(trips):,}")
    print(f"  Skipped (no geo) : {no_coords:,}")
    print(f"  Undated (→ Jan 1): {no_date:,}")
    print(f"  Travel window    : {args.travel_days} days per arc")

    ts = [t["waypoints"][0]["timestamp"] for t in trips]
    if ts:
        print(f"  Timestamp range  : {min(ts):.0f} → {max(ts):.0f}")


if __name__ == "__main__":
    main()
