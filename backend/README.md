# AfriCensus Link Backend

API FastAPI MVP alignée avec le backlog AfriCensus Link.

Le backend est organisé par responsabilités :

- `app/api/routes/` : routers FastAPI par domaine.
- `app/dependencies.py` : authentification et contrôle de rôles.
- `app/services.py` : logique métier partagée.
- `app/container.py` : instances applicatives partagées.
- `app/models.py` : modèles SQLAlchemy ORM par table métier.
- `app/database.py` : engine SQLAlchemy et sessions.
- `app/store.py` : repository ORM utilisé par les services MVP.
- `app/config.py` : configuration par variables d’environnement.

## Lancement

```powershell
cd backend
python -m poetry install
python -m poetry run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Pour utiliser PostgreSQL :

```powershell
$env:DATABASE_URL="postgresql+psycopg://africensus:africensus@127.0.0.1:5432/africensus"
python -m poetry run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Sans `DATABASE_URL`, le backend utilise `sqlite:///./data/africensus.db` pour le développement local et les tests.

Comptes de démonstration :

- `admin` / `admin123`
- `superviseur` / `demo123`
- `agent` / `demo123`

L’API expose `/api/v1/health`, `/api/v1/auth/login`, les ressources zones, campagnes, ménages, personnes, relations familiales, synchronisation, validation, rapports et audit.

Quand le frontend Angular est compilé dans `frontend/dist/africensus-link/browser`, FastAPI sert aussi l’application SPA.

## Tests

```powershell
python -m poetry run pytest tests
```
