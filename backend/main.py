import logging
import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api import auth, expenses, recurring, reports, settlements, users
from db.init_db import init_db

logging.basicConfig(level=logging.INFO)

# On Azure App Service, /home is the persistent storage mount.
# Locally, we fall back to ./data
_AZURE_HOME = Path("/home")
DATA_DIR = _AZURE_HOME / "data" if (_AZURE_HOME / "data").exists() or os.getenv("WEBSITE_SITE_NAME") else Path("data")

AVATARS_DIR = DATA_DIR / "avatars"
DATA_DIR.mkdir(parents=True, exist_ok=True)
AVATARS_DIR.mkdir(parents=True, exist_ok=True)

# Export for other modules that resolve paths at import time
os.environ.setdefault("COHABIT_DATA_DIR", str(DATA_DIR))

app = FastAPI(title="Cohabit Finance API", version="1.0.0")

# CORS — only needed in development (Vite proxy eliminates this in prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB on startup
@app.on_event("startup")
def startup():
    init_db()


# API routers
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(expenses.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(settlements.router, prefix="/api")
app.include_router(recurring.router, prefix="/api")


# Serve user avatars from persistent storage
app.mount("/avatars", StaticFiles(directory=str(AVATARS_DIR)), name="avatars")

# Serve React SPA in production
DIST_DIR = Path(__file__).parent / "frontend" / "dist"
if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str, request: Request):
        # Don't intercept API routes
        if full_path.startswith("api/"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404)
        index = DIST_DIR / "index.html"
        return FileResponse(str(index))
