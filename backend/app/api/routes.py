"""ParkSense REST API (v1). All aggregation is server-side over DuckDB."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from backend.app.core import config as C
from backend.app.core.store import get_store

router = APIRouter(prefix="/api/v1")


def _filters(frm, to, violation, vehicle, station, bbox):
    bbox_t = None
    if bbox:
        try:
            parts = [float(x) for x in bbox.split(",")]
            assert len(parts) == 4
            bbox_t = tuple(parts)
        except (ValueError, AssertionError):
            raise HTTPException(400, "bbox must be 'w,s,e,n'")
    return {
        "frm": frm, "to": to,
        "violation": violation or None,
        "vehicle": vehicle or None,
        "station": station or None,
        "bbox": bbox_t,
    }


@router.get("/meta")
def meta():
    s = get_store()
    out = dict(s.meta)
    out["forecast_backtest"] = s.forecast_backtest()
    return out


@router.get("/hexes")
def hexes(
    res: int = Query(C.H3_RESOLUTION),
    limit: int = Query(C.DEFAULT_HEX_LIMIT, le=20000),
    frm: str | None = Query(None, alias="from"),
    to: str | None = None,
    violation: list[str] | None = Query(None),
    vehicle: list[str] | None = Query(None),
    station: list[str] | None = Query(None),
    bbox: str | None = None,
):
    s = get_store()
    f = _filters(frm, to, violation, vehicle, station, bbox)
    return {"resolution": res, "cells": s.hexes(res=res, limit=limit, filters=f)}


@router.get("/hotspots/priority")
def priority(limit: int = Query(C.PRIORITY_DEFAULT_LIMIT, le=200)):
    return {"items": get_store().priority(limit)}


@router.get("/enforcement/gap")
def enforcement_gap():
    return {"stations": get_store().stations()}


@router.get("/anomalies")
def anomalies():
    return {"watch_zones": get_store().anomalies()}


@router.get("/forecast")
def forecast(cell: str):
    s = get_store()
    fc = s.forecast_cell(cell)
    if fc is None:
        raise HTTPException(404, f"no forecast for cell {cell}")
    return {"cell": cell, "forecast": fc, "backtest": s.forecast_backtest()}


@router.get("/trends")
def trends(
    group_by: str = Query("hour"),
    frm: str | None = Query(None, alias="from"),
    to: str | None = None,
    violation: list[str] | None = Query(None),
    vehicle: list[str] | None = Query(None),
    station: list[str] | None = Query(None),
):
    s = get_store()
    f = _filters(frm, to, violation, vehicle, station, None)
    try:
        return {"group_by": group_by, "series": s.trends(group_by, f)}
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/enforcement/latency")
def latency(
    frm: str | None = Query(None, alias="from"),
    to: str | None = None,
    station: list[str] | None = Query(None),
):
    s = get_store()
    f = _filters(frm, to, None, None, station, None)
    return {"buckets": s.latency_distribution(f)}


@router.get("/incident/{incident_id}")
def incident(incident_id: str):
    rec = get_store().incident(incident_id)
    if rec is None:
        raise HTTPException(404, f"incident {incident_id} not found")
    return rec
