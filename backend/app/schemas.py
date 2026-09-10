from datetime import date

from pydantic import BaseModel, EmailStr, Field, HttpUrl


class PurchaseLink(BaseModel):
    label: str = Field(min_length=1, max_length=80)
    url: HttpUrl


class Book(BaseModel):
    """Public book shape. Field names match the existing vanilla-JS frontend."""

    id: str
    slug: str
    title: str
    subtitle: str | None = None
    description: str
    coverUrl: str
    coverAlt: str
    publicationDate: date | None = None
    genre: str | None = None
    isbn: str | None = None
    purchaseLinks: list[PurchaseLink] = Field(default_factory=list)
    featured: bool = False
    extract: str | None = None
    # Temporary presentation flag while the remaining catalogue is placeholder data.
    isPlaceholder: bool = False


class NewsletterSubscription(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    email: EmailStr


class NewsletterDraft(BaseModel):
    """Private admin-only draft shape; it is never public website content."""

    id: str
    subject: str
    previewText: str | None = None
    content: str
    status: str = "draft"
