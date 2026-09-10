import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from app.config import Settings, get_settings
from app.schemas import NewsletterSubscription
from app.services.brevo_service import BrevoService

router = APIRouter(prefix="/api/newsletter", tags=["newsletter"])


@router.post("/subscribe", status_code=status.HTTP_202_ACCEPTED)
async def subscribe(
    subscription: NewsletterSubscription,
    settings: Settings = Depends(get_settings),
) -> dict[str, str | bool]:
    """Adds a contact to Brevo. Confirmation/double opt-in is set in Brevo."""
    if not settings.brevo_is_configured:
        raise HTTPException(status_code=503, detail="Newsletter service is not configured yet")
    try:
        await BrevoService(settings).subscribe(subscription)
    except httpx.HTTPStatusError:
        raise HTTPException(status_code=502, detail="The newsletter service could not accept the subscription")
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="The newsletter service is temporarily unavailable")
    return {"success": True, "message": "Subscription received"}

