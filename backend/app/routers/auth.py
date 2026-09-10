import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field

from app.config import Settings, get_settings
from app.security import require_same_origin

router = APIRouter(prefix="/api/auth", tags=["authentication"])


class SignInCredentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=256)


@router.post("/login")
async def login(
    credentials: SignInCredentials,
    request: Request,
    _: None = Depends(require_same_origin),
    settings: Settings = Depends(get_settings),
) -> dict[str, str | bool]:
    """Verify a Supabase Auth account, then create a signed HTTP-only session."""
    if not settings.admin_auth_is_configured:
        raise HTTPException(status_code=503, detail="Admin sign-in is not configured yet")
    email = str(credentials.email).lower()
    if email not in settings.permitted_admin_emails:
        raise HTTPException(status_code=401, detail="This account is not allowed to manage the website")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{settings.supabase_url.rstrip('/')}/auth/v1/token?grant_type=password",
                headers={"apikey": settings.supabase_service_key, "Content-Type": "application/json"},
                json={"email": email, "password": credentials.password},
            )
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Sign-in is temporarily unavailable")
    if response.status_code >= 400:
        raise HTTPException(status_code=401, detail="Email address or password was not recognised")
    user_email = str(response.json().get("user", {}).get("email", "")).lower()
    if user_email != email:
        raise HTTPException(status_code=401, detail="Email address or password was not recognised")
    request.session.clear()
    request.session["admin_email"] = email
    return {"success": True, "message": "Signed in"}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, _: None = Depends(require_same_origin)) -> Response:
    request.session.clear()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
