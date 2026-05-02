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
        logger.info(f"[BACKEND] Initialized with base_url={self.base_url}, timeout={timeout}")

    async def get_messages(
        self,
        session_id: str,
        page: int = 1,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """Fetch chat messages from backend REST API (internal endpoint)."""
        url = f"{self.base_url}/internal/chat/sessions/{session_id}/messages"
        logger.info(f"[BACKEND] GET {url} (page={page}, limit={limit})")

        try:
            logger.debug(f"[BACKEND] Sending GET request to {url}")
            response = await self.client.get(
                url,
                params={"page": page, "limit": limit},
            )
            logger.debug(f"[BACKEND] Response status: {response.status_code}")
            response.raise_for_status()
            data = response.json()

            messages = data.get("messages", [])
            total = data.get("total", 0)
            logger.info(f"[BACKEND] Fetched {len(messages)} messages (total={total}) from backend for session {session_id}")
            logger.debug(f"[BACKEND] Response data: {data}")
            return messages

        except httpx.HTTPStatusError as e:
            logger.error(f"[BACKEND] HTTP error {e.response.status_code}: {e.response.text}")
            logger.error(f"[BACKEND] URL: {url}")
            return []
        except httpx.RequestError as e:
            logger.error(f"[BACKEND] Request error: {e}")
            logger.error(f"[BACKEND] URL: {url}")
            return []
        except Exception as e:
            logger.error(f"[BACKEND] Unexpected error: {e}", exc_info=True)
            logger.error(f"[BACKEND] URL: {url}")
            return []

    async def get_latest_message(self, session_id: str) -> dict[str, Any] | None:
        """Fetch the latest message for a session."""
        logger.info(f"[BACKEND] Getting latest message for session {session_id}")
        messages = await self.get_messages(session_id, limit=1)
        if messages:
            logger.info(f"[BACKEND] Latest message: {messages[0].get('role', 'unknown')} - {messages[0].get('content', '')[:100]}...")
            return messages[0]
        logger.warning(f"[BACKEND] No messages found for session {session_id}")
        return None

    async def create_message(
        self,
        session_id: str,
        user_id: str,
        role: str,
        content: str,
        sources: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any] | None:
        """Create a new message via backend API (internal endpoint)."""
        url = f"{self.base_url}/internal/chat/sessions/{session_id}/messages"
        
        payload = {
            "sessionId": session_id,
            "userId": user_id,
            "role": role,
            "content": content,
        }
        if sources:
            payload["sources"] = sources

        logger.info(f"[BACKEND] POST {url} (role={role}, content_length={len(content)})")
        logger.debug(f"[BACKEND] Payload: {payload}")

        try:
            response = await self.client.post(url, json=payload)
            logger.debug(f"[BACKEND] Response status: {response.status_code}")
            response.raise_for_status()
            data = response.json()
            logger.info(f"[BACKEND] Created message via backend API for session {session_id}")
            logger.debug(f"[BACKEND] Response data: {data}")
            return data

        except httpx.HTTPStatusError as e:
            logger.error(f"[BACKEND] HTTP error {e.response.status_code}: {e.response.text}")
            logger.error(f"[BACKEND] URL: {url}")
            logger.error(f"[BACKEND] Payload: {payload}")
            return None
        except httpx.RequestError as e:
            logger.error(f"[BACKEND] Request error: {e}")
            logger.error(f"[BACKEND] URL: {url}")
            return None
        except Exception as e:
            logger.error(f"[BACKEND] Unexpected error: {e}", exc_info=True)
            logger.error(f"[BACKEND] URL: {url}")
            return None

    async def close(self):
        """Close the HTTP client."""
        logger.info("[BACKEND] Closing HTTP client...")
        await self.client.aclose()
        logger.info("[BACKEND] HTTP client closed")
