"""One-command, reproducible pipeline: raw CSV -> Parquet -> features -> model.

Usage:  python -m pipeline.run_all
"""
from __future__ import annotations

import sys
import time

from backend.app.core import config as C
from pipeline import features, forecast, ingest


def main() -> int:
    if not C.RAW_CSV.exists():
        print(f"ERROR: raw CSV not found at {C.RAW_CSV}", file=sys.stderr)
        return 1
    t0 = time.time()
    print("=" * 64)
    print("ParkSense pipeline")
    print("=" * 64)
    ingest.run()
    features.run()
    forecast.run()
    print("=" * 64)
    print(f"pipeline complete in {time.time() - t0:.1f}s")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
