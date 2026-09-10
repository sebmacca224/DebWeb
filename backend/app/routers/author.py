import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.config import Settings, get_settings
from app.schemas import AuthorProfile
from app.services.supabase_service import SupabaseService

router = APIRouter(prefix="/api/author", tags=["author"])


@router.get("", response_model=AuthorProfile)
async def get_author(settings: Settings = Depends(get_settings)) -> dict:
    try:
        author = await SupabaseService(settings).get_author()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Author information is temporarily unavailable") from error
    if not author:
        raise HTTPException(status_code=404, detail="Author information has not been added yet")
    return author
