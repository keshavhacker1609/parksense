# ParkSense — developer commands.
# Usage: `make setup` once, then `make seed` and `make dev`.

PY ?= python
VENV := .venv
ifeq ($(OS),Windows_NT)
  BIN := $(VENV)/Scripts
else
  BIN := $(VENV)/bin
endif

.PHONY: setup seed dev api web test clean

setup:                ## create venv, install backend + frontend deps
	$(PY) -m venv $(VENV)
	$(BIN)/python -m pip install --upgrade pip
	$(BIN)/python -m pip install -r backend/requirements.txt
	cd frontend && npm install

seed:                 ## run the full pipeline: CSV -> parquet -> features -> model
	$(BIN)/python -m pipeline.run_all

api:                  ## start the FastAPI backend on :8011
	$(BIN)/python -m uvicorn backend.app.main:app --reload --port 8011

web:                  ## start the Vite frontend on :5181
	cd frontend && npm run dev

dev:                  ## run backend + frontend together
	$(MAKE) -j2 api web

test:                 ## run the parsing + scoring tests
	$(BIN)/python -m pytest backend/tests -q

clean:                ## remove generated data artifacts
	rm -f data/violations.parquet data/*_features.parquet data/forecast*.* \
	      data/anomalies.parquet data/meta.json data/forecast_lgbm.txt
