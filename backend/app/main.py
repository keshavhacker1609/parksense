"""ParkSense FastAPI application."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes import router
from backend.app.core import config as C
from backend.app.core.store import get_store

app = FastAPI(
    title=C.API_TITLE,
    version=C.API_VERSION,
    description=(
        "Parking-induced congestion intelligence. Congestion Impact Score, "
        "enforcement-efficiency gap, and short-horizon hotspot forecasting "
        "computed from Bengaluru parking-violation records."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
def health():
    s = get_store()
    return {"status": "ok", "incidents": s.meta["totals"]["incidents"]}


@app.on_event("startup")
def _warm():
    get_store()  # build views + load meta once at boot
