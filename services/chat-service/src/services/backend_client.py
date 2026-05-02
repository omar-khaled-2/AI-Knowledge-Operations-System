"""Chat Service - Backend API Client."""

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class BackendClient:
    """HTTP client for the backend API."""

    def __init__(self, base_url: str, timeout: float = 10.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.client = httpx.AsyncClient(timeout=timeout)

    async def get_messages(
        self,
        session_id: str,
        page: int = 1,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """Fetch chat messages from backend REST API."""
        url = f"{self.base_url}/api/v1/chat/sessions/{session_id}/messages"

        try:
            response = await self.client.get(
                url,
                params={"page": page, "limit": limit},
            )
            response.raise_for_status()
            data = response.json()

            messages = data.get("messages", [])
            logger.info(f"Fetched {len(messages)} messages from backend for session {session_id}")
            return messages

        except httpx.HTTPStatusError as e:
            logger.error(f"Backend API HTTP error: {e.response.status_code} - {e.response.text}")
            return []
        except httpx.RequestError as e:
            logger.error(f"Backend API request error: {e}")
            return []
        except Exception as e:
            logger.error(f"Backend API unexpected error: {e}")
            return []

    async def get_latest_message(self, session_id: str) -> dict[str, Any] | None:
        """Fetch the latest message for a session."""
        messages = await self.get_messages(session_id, limit=1)
        return messages[0] if messages else None

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
