"""
clear_failed_cache.py
─────────────────────
Removes REQUEST_DENIED (and other failed) entries from geocode_cache.json
so that geocode_courier.py or geocode_shipments.py will retry them.

Usage
─────
    python clear_failed_cache.py                          # preview only
    python clear_failed_cache.py --write                  # actually update the file
    python clear_failed_cache.py --cache my_cache.json    # specify cache path
"""

import argparse
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--cache', default='geocode_cache.json')
parser.add_argument('--write', action='store_true', help='Write cleaned cache back to disk')
args = parser.parse_args()

with open(args.cache, encoding='utf-8') as f:
    cache = json.load(f)

failed  = {k: v for k, v in cache.items() if v.get('lat') is None}
kept    = {k: v for k, v in cache.items() if v.get('lat') is not None}

print(f"Total entries : {len(cache)}")
print(f"Successful    : {len(kept)}")
print(f"Failed/null   : {len(failed)}")
print(f"\nFailed entries that would be removed:")
for k, v in list(failed.items())[:20]:
    print(f"  [{v.get('status','?'):>20}]  {k}")
if len(failed) > 20:
    print(f"  ... and {len(failed) - 20} more")

if args.write:
    with open(args.cache, 'w', encoding='utf-8') as f:
        json.dump(kept, f, indent=2, ensure_ascii=False)
    print(f"\nCache updated — {len(failed)} failed entries removed.")
    print(f"Re-run geocode_courier.py to retry them.")
else:
    print(f"\nDry run — pass --write to actually update the cache.")