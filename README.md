# AfriCensus Link MVP

Implémentation locale modulaire du MVP AfriCensus Link :

- `backend/` : API FastAPI modulaire avec routers par domaine, services métier, dépendances d’auth et gestion Poetry.
- `frontend/` : application Angular avec Tailwind CSS v4, pages autonomes, services API/auth et thème AfriCensus.
- `docker-compose.yml` : orchestration PostgreSQL + backend FastAPI.
- L’image backend construit Angular et FastAPI sert automatiquement le build Angular.

## Lancement containerisé

```powershell
docker compose up --build
```

Ouvrir ensuite `http://127.0.0.1:8000/`.

L’API reste exposée sur `http://127.0.0.1:8000/api/v1` et PostgreSQL sur `127.0.0.1:5432`.

## Démarrage rapide

```powershell
cd backend
python -m poetry install
python -m poetry run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Ouvrir ensuite `http://127.0.0.1:8000/` seulement si le build Angular existe dans `frontend/dist/africensus-link/browser`.
Sinon lancez aussi le frontend avec `npm start` et ouvrez `http://127.0.0.1:4200/`.

Sans `DATABASE_URL`, le backend utilise SQLite local via ORM : `sqlite:///./data/africensus.db`. Pour utiliser PostgreSQL hors Docker :

```powershell
$env:DATABASE_URL="postgresql+psycopg://africensus:africensus@127.0.0.1:5432/africensus"
cd backend
python -m poetry run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Comptes de démonstration :

- `admin` / `admin123`
- `superviseur` / `demo123`
- `agent` / `agent123`
- `statisticien` / `stat123`
- `auditeur` / `audit123`

## Configuration du Stockage des Médias

Par défaut, les fichiers téléchargés (ex: photos de profil) sont stockés localement dans le dossier `data/uploads/`.
Vous pouvez personnaliser l'hébergeur en utilisant le fichier `.env` :

### Google Drive
Pour envoyer les fichiers directement sur Google Drive :
```env
MEDIA_STORAGE_PROVIDER=google_drive
GOOGLE_DRIVE_FOLDER_ID=votre_id_de_dossier
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type": "service_account", ...}
```

### Stockage Local avec CDN personnalisé
```env
MEDIA_STORAGE_PROVIDER=local
MEDIA_BASE_URL=https://cdn.monsite.com/uploads
```

## Développement frontend

```powershell
cd frontend
npm install
npm start
```

Le proxy Angular redirige `/api` vers `http://127.0.0.1:8000`.

## Vérification

```powershell
cd backend
python -m poetry run pytest tests
cd frontend
npm run build
```
