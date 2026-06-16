"""ParkSense FastAPI application."""
from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

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


# Serve the built single-page console from the same origin (so a single
# deployed service hosts both the API and the UI -- no CORS, one URL).
# Falls back silently to API-only when the build is absent (local dev).
_static = os.environ.get("PARKSENSE_STATIC", str(C.ROOT / "frontend" / "dist"))
if os.path.isdir(_static):
    app.mount("/", StaticFiles(directory=_static, html=True), name="ui")
