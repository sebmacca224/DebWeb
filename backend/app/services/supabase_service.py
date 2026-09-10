from typing import Any

import httpx

from app.config import Settings


class SupabaseService:
    """Small REST adapter for public data. Administrative writes come after auth."""

    def __init__(self, settings: Settings):
        self.settings = settings

    async def list_books(self) -> list[dict[str, Any]] | None:
        if not self.settings.supabase_is_configured:
            return None
        headers = {
            "apikey": self.settings.supabase_service_key,
            "Authorization": f"Bearer {self.settings.supabase_service_key}",
        }
        url = f"{self.settings.supabase_url.rstrip('/')}/rest/v1/books"
        params = {"select": "*", "order": "featured.desc,title.asc"}
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
        return [self._book_from_row(row) for row in response.json()]

    async def get_book(self, slug: str) -> dict[str, Any] | None:
        if not self.settings.supabase_is_configured:
            return None
        headers = {
            "apikey": self.settings.supabase_service_key,
            "Authorization": f"Bearer {self.settings.supabase_service_key}",
        }
        url = f"{self.settings.supabase_url.rstrip('/')}/rest/v1/books"
        params = {"select": "*", "slug": f"eq.{slug}", "limit": "1"}
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
        rows = response.json()
        return self._book_from_row(rows[0]) if rows else None

    @staticmethod
    def _book_from_row(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": str(row["id"]),
            "slug": row["slug"],
            "title": row["title"],
            "subtitle": row.get("subtitle"),
            "description": row.get("description") or "",
            "coverUrl": row["cover_url"],
            "coverAlt": row.get("cover_alt") or f"Cover of {row['title']}",
            "publicationDate": row.get("publication_date"),
            "genre": row.get("genre"),
            "isbn": row.get("isbn"),
            "purchaseLinks": row.get("purchase_links") or [],
            "featured": row.get("featured", False),
            "extract": row.get("extract"),
            "isPlaceholder": False,
        }
