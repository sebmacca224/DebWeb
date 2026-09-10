import html
from datetime import datetime, timezone

import httpx

from app.config import Settings
from app.schemas import NewsletterSubscription


class BrevoService:
    """Server-side adapter for Brevo. API credentials never reach the browser."""

    def __init__(self, settings: Settings):
        self.settings = settings

    async def subscribe(self, subscription: NewsletterSubscription) -> None:
        if not self.settings.brevo_is_configured:
            raise RuntimeError("Newsletter service is not configured")
        attributes = {}
        if subscription.name:
            attributes["FIRSTNAME"] = subscription.name
        payload = {
            "email": str(subscription.email),
            "attributes": attributes,
            "listIds": [self.settings.brevo_list_id],
            "updateEnabled": True,
        }
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                "https://api.brevo.com/v3/contacts",
                headers={"api-key": self.settings.brevo_api_key, "Content-Type": "application/json"},
                json=payload,
            )
            response.raise_for_status()

    async def create_campaign(self, subject: str, preview_text: str | None, content: str) -> int:
        if not self.settings.brevo_is_configured or not self.settings.brevo_sender_email:
            raise RuntimeError("Newsletter sending is not configured")
        paragraphs = "".join(
            f"<p style=\"margin:0 0 1em\">{html.escape(part).replace(chr(10), '<br>')}</p>"
            for part in content.split("\n\n")
            if part.strip()
        )
        payload = {
            "name": f"{subject} — {datetime.now(timezone.utc).date().isoformat()}",
            "subject": subject,
            "previewText": preview_text or "",
            "sender": {"name": self.settings.brevo_sender_name, "email": self.settings.brevo_sender_email},
            "recipients": {"listIds": [self.settings.brevo_list_id]},
            "htmlContent": (
                "<div style=\"max-width:640px;margin:auto;font:17px/1.65 Georgia,serif;color:#262526\">"
                f"<h1 style=\"font-size:30px\">{html.escape(subject)}</h1>{paragraphs}</div>"
            ),
        }
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                "https://api.brevo.com/v3/emailCampaigns",
                headers={"api-key": self.settings.brevo_api_key, "Content-Type": "application/json"},
                json=payload,
            )
            response.raise_for_status()
        return int(response.json()["id"])

    async def send_test_campaign(self, campaign_id: int, email: str) -> None:
        await self._campaign_action(campaign_id, "sendTest", {"emailTo": [email]})

    async def send_campaign_now(self, campaign_id: int) -> None:
        await self._campaign_action(campaign_id, "sendNow", {})

    async def _campaign_action(self, campaign_id: int, action: str, payload: dict) -> None:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                f"https://api.brevo.com/v3/emailCampaigns/{campaign_id}/{action}",
                headers={"api-key": self.settings.brevo_api_key, "Content-Type": "application/json"},
                json=payload,
            )
            response.raise_for_status()
