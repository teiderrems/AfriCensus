FROM node:24-alpine AS frontend-build

WORKDIR /frontend
COPY frontend/package*.json frontend/angular.json frontend/tsconfig*.json frontend/postcss.config.json frontend/proxy.conf.json frontend/ngsw-config.json ./
COPY frontend/src ./src
COPY frontend/public ./public
RUN npm ci
RUN npm run build

FROM python:3.13-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_VERSION=2.1.4 \
    POETRY_VIRTUALENVS_CREATE=false

WORKDIR /app

RUN pip install --no-cache-dir "poetry==$POETRY_VERSION"

COPY backend/pyproject.toml backend/poetry.lock* ./
RUN poetry install --only main --no-root

COPY backend/app ./app
COPY --from=frontend-build /frontend/dist/africensus-link/browser ./frontend/dist/africensus-link/browser
RUN mkdir -p data

EXPOSE 8000

CMD ["poetry", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
