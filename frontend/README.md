# AfriCensus Link Frontend

Frontend Angular autonome inspiré des maquettes du dossier `stitch_africensus_link`.

Le frontend utilise Tailwind CSS v4 via `@tailwindcss/postcss`. Les tokens du design system AfriCensus sont déclarés dans `src/styles.css` avec `@theme`, tout en conservant les classes CSS métier existantes.

## Lancement

```powershell
cd frontend
npm install
npm start
```

Le frontend appelle l’API FastAPI via `/api/v1/...`. En développement, utilisez un proxy ou lancez le build et servez-le depuis FastAPI.

## Build servi par FastAPI

```powershell
cd frontend
npm install
npm run build
cd ../backend
python -m poetry run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Container frontend

```powershell
docker build -t africensus-link-frontend .
```
