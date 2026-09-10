from typing import Any
from urllib.parse import quote

import httpx

from app.config import Settings


class SupabaseService:
    """Small REST adapter for public data. Administrative writes come after auth."""

    def __init__(self, settings: Settings):
        self.settings = settings

    @property
    def headers(self) -> dict[str, str]:
        return {
            "apikey": self.settings.supabase_service_key or "",
            "Authorization": f"Bearer {self.settings.supabase_service_key or ''}",
        }

    async def list_books(self) -> list[dict[str, Any]] | None:
        if not self.settings.supabase_is_configured:
            return None
        url = f"{self.settings.supabase_url.rstrip('/')}/rest/v1/books"
        params = {"select": "*", "order": "featured.desc,title.asc"}
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
        return [self._book_from_row(row) for row in response.json()]

    async def get_book(self, slug: str) -> dict[str, Any] | None:
        if not self.settings.supabase_is_configured:
            return None
        url = f"{self.settings.supabase_url.rstrip('/')}/rest/v1/books"
        params = {"select": "*", "slug": f"eq.{slug}", "limit": "1"}
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
        rows = response.json()
        return self._book_from_row(rows[0]) if rows else None

    async def create_book(self, row: dict[str, Any]) -> dict[str, Any]:
        return self._book_from_row(await self._insert("books", row))

    async def update_book(self, book_id: str, row: dict[str, Any]) -> dict[str, Any] | None:
        result = await self._update("books", "id", book_id, row)
        return self._book_from_row(result) if result else None

    async def delete_book(self, book_id: str) -> bool:
        return await self._delete("books", "id", book_id)

    async def list_newsletters(self) -> list[dict[str, Any]]:
        rows = await self._select("newsletter_drafts", {"select": "*", "order": "updated_at.desc"})
        return [self._newsletter_from_row(row) for row in rows]

    async def get_newsletter(self, draft_id: str) -> dict[str, Any] | None:
        rows = await self._select("newsletter_drafts", {"select": "*", "id": f"eq.{draft_id}", "limit": "1"})
        return self._newsletter_from_row(rows[0]) if rows else None

    async def create_newsletter(self, row: dict[str, Any]) -> dict[str, Any]:
        return self._newsletter_from_row(await self._insert("newsletter_drafts", row))

    async def update_newsletter(self, draft_id: str, row: dict[str, Any]) -> dict[str, Any] | None:
        result = await self._update("newsletter_drafts", "id", draft_id, row)
        return self._newsletter_from_row(result) if result else None

    async def get_author(self) -> dict[str, Any] | None:
        rows = await self._select("author_profile", {"select": "*", "limit": "1"})
        return self._author_from_row(rows[0]) if rows else None

    async def save_author(self, row: dict[str, Any]) -> dict[str, Any]:
        current = await self._select("author_profile", {"select": "id", "limit": "1"})
        if current:
            saved = await self._update("author_profile", "id", str(current[0]["id"]), row)
            if saved:
                return self._author_from_row(saved)
        return self._author_from_row(await self._insert("author_profile", row))

    async def upload_public_image(self, object_path: str, content: bytes, content_type: str) -> str:
        bucket = quote(self.settings.supabase_storage_bucket, safe="")
        encoded_path = quote(object_path, safe="/")
        url = f"{self.settings.supabase_url.rstrip('/')}/storage/v1/object/{bucket}/{encoded_path}"
        headers = {**self.headers, "Content-Type": content_type, "x-upsert": "false"}
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(url, headers=headers, content=content)
            response.raise_for_status()
        return f"{self.settings.supabase_url.rstrip('/')}/storage/v1/object/public/{bucket}/{encoded_path}"

    async def _select(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        url = f"{self.settings.supabase_url.rstrip('/')}/rest/v1/{table}"
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
        return response.json()

    async def _insert(self, table: str, row: dict[str, Any]) -> dict[str, Any]:
        url = f"{self.settings.supabase_url.rstrip('/')}/rest/v1/{table}"
        headers = {**self.headers, "Prefer": "return=representation"}
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(url, headers=headers, json=row)
            response.raise_for_status()
        return response.json()[0]

    async def _update(self, table: str, field: str, value: str, row: dict[str, Any]) -> dict[str, Any] | None:
        url = f"{self.settings.supabase_url.rstrip('/')}/rest/v1/{table}"
        headers = {**self.headers, "Prefer": "return=representation"}
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.patch(url, headers=headers, params={field: f"eq.{value}"}, json=row)
            response.raise_for_status()
        rows = response.json()
        return rows[0] if rows else None

    async def _delete(self, table: str, field: str, value: str) -> bool:
        url = f"{self.settings.supabase_url.rstrip('/')}/rest/v1/{table}"
        headers = {**self.headers, "Prefer": "return=representation"}
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.delete(url, headers=headers, params={field: f"eq.{value}"})
            response.raise_for_status()
        return bool(response.json())

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

    @staticmethod
    def _newsletter_from_row(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": str(row["id"]),
            "subject": row["subject"],
            "previewText": row.get("preview_text"),
            "content": row["content"],
            "status": row.get("status", "draft"),
            "lastEdited": row.get("updated_at", ""),
        }

    @staticmethod
    def _author_from_row(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": str(row["id"]),
            "name": row["name"],
            "biography": row.get("biography", ""),
            "photoUrl": row.get("photo_url"),
            "photoAlt": row.get("photo_alt"),
        }
