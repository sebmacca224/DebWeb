import os
import unittest
from unittest.mock import AsyncMock, patch

os.environ.update({
    "ENVIRONMENT": "production",
    "CORS_ORIGINS": "https://debweb.pages.dev",
    "SUPABASE_URL": "https://example.supabase.co",
    "SUPABASE_SERVICE_KEY": "test-service-key",
    "ADMIN_EMAILS": "deborah@example.com",
    "SESSION_SECRET": "test-session-secret-that-is-not-used-in-production",
})

from fastapi.testclient import TestClient

from app.main import app


class FakeAuthResponse:
    status_code = 200

    @staticmethod
    def json():
        return {"user": {"email": "deborah@example.com"}}


class FakeAuthClient:
    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return None

    async def post(self, *args, **kwargs):
        return FakeAuthResponse()


BOOK = {
    "id": "11111111-1111-1111-1111-111111111111",
    "slug": "a-test-book",
    "title": "A Test Book",
    "subtitle": None,
    "description": "Description",
    "coverUrl": "/assets/book-placeholder.svg",
    "coverAlt": "Cover of A Test Book",
    "publicationDate": None,
    "genre": "Mystery",
    "isbn": None,
    "purchaseLinks": [],
    "featured": False,
    "extract": None,
    "isPlaceholder": False,
}


class AdminApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app, base_url="https://testserver")
        self.origin = {"Origin": "https://debweb.pages.dev"}

    def login(self):
        with patch("app.routers.auth.httpx.AsyncClient", FakeAuthClient):
            response = self.client.post(
                "/api/auth/login",
                headers=self.origin,
                json={"email": "deborah@example.com", "password": "correct-password"},
            )
        self.assertEqual(response.status_code, 200)

    def test_admin_requires_authenticated_session(self):
        response = self.client.get("/api/admin/session")
        self.assertEqual(response.status_code, 401)

    def test_login_creates_admin_session(self):
        self.login()
        response = self.client.get("/api/admin/session")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["email"], "deborah@example.com")

    def test_book_write_requires_approved_origin(self):
        self.login()
        response = self.client.post("/api/admin/books", json={"title": "A Test Book"})
        self.assertEqual(response.status_code, 403)

    def test_authenticated_book_create(self):
        self.login()
        with patch("app.routers.admin.SupabaseService.create_book", new=AsyncMock(return_value=BOOK)):
            response = self.client.post(
                "/api/admin/books",
                headers=self.origin,
                json={"title": "A Test Book", "description": "Description"},
            )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["slug"], "a-test-book")

    def test_image_type_is_checked_before_upload(self):
        self.login()
        response = self.client.post(
            "/api/admin/images",
            headers=self.origin,
            files={"image": ("cover.txt", b"not an image", "text/plain")},
        )
        self.assertEqual(response.status_code, 415)

    def test_newsletter_send_requires_exact_confirmation(self):
        self.login()
        response = self.client.post(
            "/api/admin/newsletters/11111111-1111-1111-1111-111111111111/send",
            headers=self.origin,
            json={"confirmation": "no"},
        )
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
