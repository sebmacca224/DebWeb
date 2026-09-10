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


class BookInput(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    subtitle: str | None = Field(default=None, max_length=240)
    description: str = Field(default="", max_length=20000)
    coverUrl: str = Field(default="/assets/book-placeholder.svg", max_length=2000)
    coverAlt: str | None = Field(default=None, max_length=300)
    publicationDate: date | None = None
    genre: str | None = Field(default=None, max_length=120)
    isbn: str | None = Field(default=None, max_length=40)
    purchaseLinks: list[PurchaseLink] = Field(default_factory=list, max_length=12)
    featured: bool = False
    extract: str | None = Field(default=None, max_length=30000)


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


class NewsletterDraftInput(BaseModel):
    subject: str = Field(min_length=1, max_length=240)
    previewText: str | None = Field(default=None, max_length=300)
    content: str = Field(min_length=1, max_length=100000)


class NewsletterTestRequest(BaseModel):
    email: EmailStr


class NewsletterSendRequest(BaseModel):
    confirmation: str


class AuthorProfile(BaseModel):
    id: str | None = None
    name: str
    biography: str
    photoUrl: str | None = None
    photoAlt: str | None = None


class AuthorProfileInput(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    biography: str = Field(min_length=1, max_length=50000)
    photoUrl: str | None = Field(default=None, max_length=2000)
    photoAlt: str | None = Field(default=None, max_length=300)
