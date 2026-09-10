import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.config import Settings, get_settings
from app.demo_data import DEMO_BOOKS
from app.schemas import Book
from app.services.supabase_service import SupabaseService

router = APIRouter(prefix="/api/books", tags=["books"])


async def catalogue(settings: Settings) -> list[dict]:
    """Use Supabase when configured; otherwise use visible development seeds."""
    service = SupabaseService(settings)
    try:
        data = await service.list_books()
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="The catalogue is temporarily unavailable")
    # An empty Supabase catalogue is normal during first-time setup. Keep the
    # public demonstration catalogue visible until real book records are added.
    return data or DEMO_BOOKS


@router.get("", response_model=list[Book])
async def list_books(settings: Settings = Depends(get_settings)) -> list[dict]:
    return await catalogue(settings)


@router.get("/{slug}", response_model=Book)
async def get_book(slug: str, settings: Settings = Depends(get_settings)) -> dict:
    service = SupabaseService(settings)
    try:
        if settings.supabase_is_configured:
            book = await service.get_book(slug)
        else:
            book = None
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="The catalogue is temporarily unavailable")
    if not book:
        book = next((item for item in DEMO_BOOKS if item["slug"] == slug), None)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book
