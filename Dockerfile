# ---- stage 1: build the frontend ----
FROM node:20-slim AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- stage 2: python runtime serving API + built UI ----
FROM python:3.11-slim
WORKDIR /app

# system libs LightGBM needs at runtime
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# application code, precomputed data artifacts, and the built UI
COPY backend/ backend/
COPY pipeline/ pipeline/
COPY data/ data/
COPY --from=web /web/dist /app/frontend/dist

ENV PARKSENSE_STATIC=/app/frontend/dist
EXPOSE 8000
# Render/Railway inject $PORT; default to 8000 locally.
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
