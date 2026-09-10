import re
from datetime import datetime, timezone
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.config import Settings, get_settings
from app.schemas import (
    AuthorProfile,
    AuthorProfileInput,
    Book,
    BookInput,
    NewsletterDraft,
    NewsletterDraftInput,
    NewsletterSendRequest,
    NewsletterTestRequest,
)
from app.security import require_configured_admin
from app.security import require_same_origin
from app.services.brevo_service import BrevoService
from app.services.supabase_service import SupabaseService

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_configured_admin)],
)

IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_IMAGE_BYTES = 8 * 1024 * 1024


@router.get("/session")
async def admin_session(email: str = Depends(require_configured_admin)) -> dict[str, str | bool]:
    """Used by the static admin shell before it renders management controls."""
    return {"authenticated": True, "email": email}


@router.get("/integrations")
async def integration_status(settings: Settings = Depends(get_settings)) -> dict[str, bool]:
    """Reports configuration presence only; it never exposes credentials."""
    return {
        "database": settings.supabase_is_configured,
        "newsletterSubscriptions": settings.brevo_subscription_is_configured,
        "newsletterSending": settings.brevo_sending_is_configured,
    }


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or f"book-{uuid4().hex[:8]}"


def book_row(payload: BookInput) -> dict:
    return {
        "slug": slugify(payload.title),
        "title": payload.title.strip(),
        "subtitle": payload.subtitle or None,
        "description": payload.description,
        "cover_url": payload.coverUrl,
        "cover_alt": payload.coverAlt or f"Cover of {payload.title}",
        "publication_date": payload.publicationDate.isoformat() if payload.publicationDate else None,
        "genre": payload.genre or None,
        "isbn": payload.isbn or None,
        "purchase_links": [link.model_dump(mode="json") for link in payload.purchaseLinks],
        "featured": payload.featured,
        "extract": payload.extract or None,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def provider_error(error: httpx.HTTPStatusError) -> HTTPException:
    code = 409 if error.response.status_code == 409 else 502
    detail = "That record conflicts with existing data" if code == 409 else "The data service could not complete the request"
    return HTTPException(status_code=code, detail=detail)


@router.get("/books", response_model=list[Book])
async def list_admin_books(settings: Settings = Depends(get_settings)) -> list[dict]:
    try:
        return await SupabaseService(settings).list_books() or []
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="The catalogue could not be loaded") from error


@router.post("/books", response_model=Book, status_code=status.HTTP_201_CREATED)
async def create_book(payload: BookInput, _: None = Depends(require_same_origin), settings: Settings = Depends(get_settings)) -> dict:
    try:
        return await SupabaseService(settings).create_book(book_row(payload))
    except httpx.HTTPStatusError as error:
        raise provider_error(error) from error


@router.put("/books/{book_id}", response_model=Book)
async def update_book(book_id: str, payload: BookInput, _: None = Depends(require_same_origin), settings: Settings = Depends(get_settings)) -> dict:
    try:
        book = await SupabaseService(settings).update_book(book_id, book_row(payload))
    except httpx.HTTPStatusError as error:
        raise provider_error(error) from error
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@router.delete("/books/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book(book_id: str, _: None = Depends(require_same_origin), settings: Settings = Depends(get_settings)) -> None:
    try:
        deleted = await SupabaseService(settings).delete_book(book_id)
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="The book could not be deleted") from error
    if not deleted:
        raise HTTPException(status_code=404, detail="Book not found")


@router.post("/images", status_code=status.HTTP_201_CREATED)
async def upload_image(image: UploadFile = File(...), _: None = Depends(require_same_origin), settings: Settings = Depends(get_settings)) -> dict[str, str]:
    if image.content_type not in IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="Please choose a JPEG, PNG or WebP image")
    content = await image.read(MAX_IMAGE_BYTES + 1)
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Images must be smaller than 8 MB")
    folder = "uploads"
    object_path = f"{folder}/{uuid4().hex}{IMAGE_TYPES[image.content_type]}"
    try:
        url = await SupabaseService(settings).upload_public_image(object_path, content, image.content_type)
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="The image could not be uploaded") from error
    return {"url": url}


@router.get("/newsletters", response_model=list[NewsletterDraft])
async def list_newsletters(settings: Settings = Depends(get_settings)) -> list[dict]:
    try:
        return await SupabaseService(settings).list_newsletters()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Newsletter drafts could not be loaded") from error


@router.post("/newsletters", response_model=NewsletterDraft, status_code=status.HTTP_201_CREATED)
async def create_newsletter(payload: NewsletterDraftInput, _: None = Depends(require_same_origin), settings: Settings = Depends(get_settings)) -> dict:
    try:
        return await SupabaseService(settings).create_newsletter({
            "subject": payload.subject, "preview_text": payload.previewText, "content": payload.content, "status": "draft"
        })
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="The newsletter draft could not be saved") from error


@router.put("/newsletters/{draft_id}", response_model=NewsletterDraft)
async def update_newsletter(draft_id: str, payload: NewsletterDraftInput, _: None = Depends(require_same_origin), settings: Settings = Depends(get_settings)) -> dict:
    row = {"subject": payload.subject, "preview_text": payload.previewText, "content": payload.content, "updated_at": datetime.now(timezone.utc).isoformat()}
    try:
        draft = await SupabaseService(settings).update_newsletter(draft_id, row)
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="The newsletter draft could not be saved") from error
    if not draft:
        raise HTTPException(status_code=404, detail="Newsletter draft not found")
    return draft


@router.post("/newsletters/{draft_id}/test")
async def test_newsletter(draft_id: str, payload: NewsletterTestRequest, _: None = Depends(require_same_origin), settings: Settings = Depends(get_settings)) -> dict[str, str | bool]:
    draft = await SupabaseService(settings).get_newsletter(draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Save the newsletter draft before sending a test")
    if draft.get("status") == "sent":
        raise HTTPException(status_code=409, detail="This newsletter has already been sent")
    try:
        campaign = await BrevoService(settings).create_campaign(draft["subject"], draft.get("previewText"), draft["content"])
        await BrevoService(settings).send_test_campaign(campaign, str(payload.email))
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Brevo could not send the test email") from error
    return {"success": True, "message": "Test email sent"}


@router.post("/newsletters/{draft_id}/send")
async def send_newsletter(draft_id: str, payload: NewsletterSendRequest, _: None = Depends(require_same_origin), settings: Settings = Depends(get_settings)) -> dict[str, str | bool]:
    if payload.confirmation != "SEND":
        raise HTTPException(status_code=400, detail="Newsletter sending was not confirmed")
    service = SupabaseService(settings)
    draft = await service.get_newsletter(draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Save the newsletter draft before sending")
    if draft.get("status") == "sent":
        raise HTTPException(status_code=409, detail="This newsletter has already been sent")
    try:
        campaign = await BrevoService(settings).create_campaign(draft["subject"], draft.get("previewText"), draft["content"])
        await BrevoService(settings).send_campaign_now(campaign)
        await service.update_newsletter(draft_id, {"status": "sent", "updated_at": datetime.now(timezone.utc).isoformat()})
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Brevo could not send the newsletter") from error
    return {"success": True, "message": "Newsletter sent"}


@router.get("/author", response_model=AuthorProfile | None)
async def get_author(settings: Settings = Depends(get_settings)) -> dict | None:
    try:
        return await SupabaseService(settings).get_author()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Author information could not be loaded") from error


@router.put("/author", response_model=AuthorProfile)
async def save_author(payload: AuthorProfileInput, _: None = Depends(require_same_origin), settings: Settings = Depends(get_settings)) -> dict:
    row = {"name": payload.name, "biography": payload.biography, "photo_url": payload.photoUrl, "photo_alt": payload.photoAlt, "updated_at": datetime.now(timezone.utc).isoformat()}
    try:
        return await SupabaseService(settings).save_author(row)
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Author information could not be saved") from error
