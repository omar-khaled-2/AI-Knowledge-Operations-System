"""Chat Service - Retrieval Service Client."""

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class RetrievalClient:
    """HTTP client for the retrieval service."""

    def __init__(self, base_url: str, timeout: float = 10.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.client = httpx.AsyncClient(timeout=timeout)

    async def search(
        self,
        query: str,
        project_id: str,
        top_k: int = 5,
    ) -> list[dict[str, Any]]:
        """Search for relevant documents."""
        url = f"{self.base_url}/api/v1/search"

        payload = {
            "query": query,
            "project_id": project_id,
            "top_k": top_k,
        }

        try:
            response = await self.client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()

            # Extract results from response
            results = data.get("results", [])
            logger.info(f"Retrieval search returned {len(results)} results")
            return results

        except httpx.HTTPStatusError as e:
            logger.error(f"Retrieval service HTTP error: {e.response.status_code} - {e.response.text}")
            raise
        except httpx.RequestError as e:
            logger.error(f"Retrieval service request error: {e}")
            raise
        except Exception as e:
            logger.error(f"Retrieval service unexpected error: {e}")
            raise

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
