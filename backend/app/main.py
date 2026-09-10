from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.config import get_settings
from app.routers import admin, auth, books, contact, newsletter

settings = get_settings()
app = FastAPI(title="Deborah Fowler website API", version="0.1.0")

# This must be narrowed to real Pages/custom-domain origins in the backend host.
# Authentication must protect /admin and /api/admin/* before write routes exist.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)
# A missing secret leaves admin authentication unavailable; it never grants access.
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret or "admin-auth-not-configured",
    https_only=settings.environment.lower() == "production",
    same_site="none" if settings.environment.lower() == "production" else "lax",
)

app.include_router(books.router)
app.include_router(newsletter.router)
app.include_router(contact.router)
app.include_router(auth.router)
app.include_router(admin.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "healthy"}
