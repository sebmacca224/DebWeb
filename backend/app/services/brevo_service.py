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

