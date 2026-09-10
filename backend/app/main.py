from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import books, contact, newsletter

settings = get_settings()
app = FastAPI(title="Deborah Fowler website API", version="0.1.0")

# This must be narrowed to real Pages/custom-domain origins in the backend host.
# Authentication must protect /admin and /api/admin/* before write routes exist.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)

app.include_router(books.router)
app.include_router(newsletter.router)
app.include_router(contact.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "healthy"}
