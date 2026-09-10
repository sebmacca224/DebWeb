import asyncio
import unittest
from unittest.mock import patch

from app.config import Settings
from app.schemas import NewsletterSubscription
from app.services.brevo_service import BrevoService


class FakeResponse:
    def raise_for_status(self):
        return None

    def json(self):
        return {"id": 42}


class CapturingClient:
    calls = []

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return None

    async def post(self, url, **kwargs):
        self.calls.append((url, kwargs))
        return FakeResponse()


class BrevoServiceTests(unittest.TestCase):
    def setUp(self):
        CapturingClient.calls = []
        self.settings = Settings(
            brevo_api_key="test-key",
            brevo_list_id=123,
            brevo_doi_template_id=456,
            brevo_doi_redirect_url="https://debweb.pages.dev/newsletter?confirmed=1",
            brevo_sender_email="newsletter@deborahfowler.co.uk",
        )

    def test_subscription_uses_double_opt_in_endpoint(self):
        with patch("app.services.brevo_service.httpx.AsyncClient", CapturingClient):
            asyncio.run(BrevoService(self.settings).subscribe(
                NewsletterSubscription(name="Reader", email="reader@example.com")
            ))

        url, options = CapturingClient.calls[0]
        self.assertEqual(url, "https://api.brevo.com/v3/contacts/doubleOptinConfirmation")
        self.assertEqual(options["json"]["includeListIds"], [123])
        self.assertEqual(options["json"]["templateId"], 456)
        self.assertEqual(options["json"]["redirectionUrl"], "https://debweb.pages.dev/newsletter?confirmed=1")

    def test_campaign_contains_visible_unsubscribe_link(self):
        with patch("app.services.brevo_service.httpx.AsyncClient", CapturingClient):
            campaign_id = asyncio.run(BrevoService(self.settings).create_campaign(
                "Book news", "A short update", "Hello readers."
            ))

        self.assertEqual(campaign_id, 42)
        _, options = CapturingClient.calls[0]
        self.assertIn('{{ unsubscribe }}', options["json"]["htmlContent"])


if __name__ == "__main__":
    unittest.main()
