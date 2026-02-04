from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.db import engine, Base

from app.api.routes.auth import router as auth_router
from app.api.routes.studies import router as studies_router
from app.api.routes.instruments import router as instruments_router
from app.api.routes.sessions import router as sessions_router
from app.api.routes.responses import router as responses_router

def create_app() -> FastAPI:
    app = FastAPI(title="olcme-lab API", version="0.1.0")

    # DB tables (MVP hızlı başlangıç)
    Base.metadata.create_all(bind=engine)

    allow_origins = [o.strip() for o in settings.cors_allow_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth_router)
    app.include_router(studies_router)
    app.include_router(instruments_router)
    app.include_router(sessions_router)
    app.include_router(responses_router)

    @app.get("/health")
    def health():
        return {"ok": True}

    return app

app = create_app()
