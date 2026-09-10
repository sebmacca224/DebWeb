"""Small server-side session checks for private admin routes."""

from fastapi import Depends, HTTPException, Request, status

from app.config import Settings, get_settings


def require_configured_admin(request: Request, settings: Settings = Depends(get_settings)) -> str:
    """Allow only an authenticated Supabase user on the explicit administrator list."""
    if not settings.admin_auth_is_configured:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Admin authentication is not configured yet")
    email = str(request.session.get("admin_email", "")).lower()
    if not email or email not in settings.permitted_admin_emails:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Please sign in to access the admin area")
    return email


def require_same_origin(request: Request, settings: Settings = Depends(get_settings)) -> None:
    """Block cross-site state-changing requests that could otherwise carry a session cookie."""
    origin = request.headers.get("origin")
    if origin and origin.rstrip("/") in settings.allowed_origins:
        return
    if settings.environment.lower() == "development" and not origin:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This request did not come from an approved website origin")
