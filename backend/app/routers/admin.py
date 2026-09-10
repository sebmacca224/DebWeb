from fastapi import APIRouter, Depends

from app.security import require_configured_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/session")
async def admin_session(email: str = Depends(require_configured_admin)) -> dict[str, str | bool]:
    """Used by the static admin shell before it renders management controls."""
    return {"authenticated": True, "email": email}
