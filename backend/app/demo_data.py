"""Development-only fallback data matching js/content.js.

It lets the API be checked before Supabase is configured. It is read-only and
is not a substitute for a database.
"""


def placeholder_book(number: int) -> dict:
    return {
        "id": f"placeholder-{number}",
        "slug": f"book-{number}",
        "title": f"Book {number}",
        "subtitle": None,
        "description": "A description of this book will be added here.",
        "coverUrl": "/assets/book-placeholder.svg",
        "coverAlt": f"Placeholder cover for Book {number}",
        "publicationDate": None,
        "genre": "Mystery novel",
        "isbn": None,
        "purchaseLinks": [],
        "featured": False,
        "extract": None,
        "isPlaceholder": True,
    }


DEMO_BOOKS = [
    {
        "id": "secrets-in-st-ives",
        "slug": "secrets-in-st-ives",
        "title": "Secrets in St Ives",
        "subtitle": None,
        "description": "A description of Secrets in St Ives will be added here.",
        "coverUrl": "/assets/secrets-in-st-ives.jpg",
        "coverAlt": "Cover of Secrets in St Ives by Deborah Fowler",
        "publicationDate": None,
        "genre": "Mystery novel",
        "isbn": None,
        "purchaseLinks": [],
        "featured": True,
        "extract": "A short approved sample from this book can appear here—only a few paragraphs, enough to draw a reader in without giving away the story.",
        "isPlaceholder": False,
    },
    *[placeholder_book(number) for number in range(2, 16)],
]
