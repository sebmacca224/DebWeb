from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

router = APIRouter(prefix="/api", tags=["contact"])


class ContactMessage(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    message: str = Field(min_length=1, max_length=5000)


@router.post("/contact", status_code=status.HTTP_503_SERVICE_UNAVAILABLE)
async def contact(_: ContactMessage) -> None:
    """A deliberate, honest placeholder until a secure contact destination exists."""
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="The contact service is not configured yet",
    )
