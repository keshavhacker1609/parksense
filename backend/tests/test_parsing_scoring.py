"""Tests on the provably-correct core: array/NULL parsing and CIS math."""
from __future__ import annotations

import numpy as np
import pandas as pd

from backend.app.core import config as C
from pipeline.ingest import _footprint, _parse_array, _severity
from pipeline.features import _minmax, _peak_hours


# --------------------------- parsing --------------------------------------- #
def test_parse_json_array_multi():
    assert _parse_array('["WRONG PARKING","PARKING IN A MAIN ROAD"]') == [
        "WRONG PARKING", "PARKING IN A MAIN ROAD"]


def test_parse_single_and_lowercase_normalised():
    assert _parse_array('["no parking"]') == ["NO PARKING"]


def test_parse_null_tokens_become_empty():
    for tok in ("NULL", "", "null", "None"):
        assert _parse_array(tok) == []
    assert _parse_array(None) == []


def test_parse_non_json_falls_back_to_string():
    assert _parse_array("WRONG PARKING") == ["WRONG PARKING"]


def test_parse_numeric_offence_codes():
    assert _parse_array("[112,104]") == ["112", "104"]


# --------------------------- severity / footprint -------------------------- #
def test_severity_takes_max_over_types():
    # footpath (5) dominates no-parking (2)
    assert _severity(["NO PARKING", "PARKING ON FOOTPATH"]) == 5


def test_severity_default_for_unknown():
    assert _severity(["SOMETHING NEW"]) == C.DEFAULT_SEVERITY
    assert _severity([]) == C.DEFAULT_SEVERITY


def test_footprint_known_and_unknown():
    assert _footprint("BUS (BMTC/KSRTC)") == C.VEHICLE_FOOTPRINT["BUS (BMTC/KSRTC)"]
    assert _footprint("scooter") == C.VEHICLE_FOOTPRINT["SCOOTER"]
    assert _footprint("UFO") == C.DEFAULT_FOOTPRINT
    assert _footprint(None) == C.DEFAULT_FOOTPRINT


# --------------------------- scoring helpers ------------------------------- #
def test_minmax_bounds_and_flat():
    s = pd.Series([0.0, 5.0, 10.0])
    out = _minmax(s)
    assert out.min() == 0.0 and out.max() == 1.0
    flat = _minmax(pd.Series([3.0, 3.0, 3.0]))
    assert (flat == 0.0).all()


def test_peak_hours_are_top_fraction():
    # 100 rows at hour 9, 1 row each at hours 0..8 -> 9 must be peak
    rows = [{"hour": 9}] * 100 + [{"hour": h} for h in range(9)]
    df = pd.DataFrame(rows)
    peaks = _peak_hours(df)
    assert 9 in peaks
    assert len(peaks) == max(1, round(df["hour"].nunique() * C.PEAK_HOUR_FRACTION))


def test_confidence_shrinkage_monotonic():
    k = C.CIS_CONFIDENCE_K
    n = np.array([1, 10, 100, 1000])
    conf = n / (n + k)
    assert np.all(np.diff(conf) > 0)   # more incidents -> higher confidence
    assert conf[0] < 0.5 < conf[-1]
