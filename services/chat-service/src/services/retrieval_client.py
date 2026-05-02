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
        logger.info(f"[RETRIEVAL] Initialized with base_url={self.base_url}, timeout={timeout}")

    async def search(
        self,
        query: str,
        project_id: str,
        limit: int = 5,
        score_threshold: float = 0.5,
    ) -> list[dict[str, Any]]:
        """Search for relevant documents."""
        url = f"{self.base_url}/search"
        
        payload = {
            "query": query,
            "project_id": project_id,
            "limit": limit,
            "score_threshold": score_threshold,
        }
        
        logger.info(f"[RETRIEVAL] POST {url} (query='{query}', project_id={project_id}, limit={limit}, score_threshold={score_threshold})")
        logger.debug(f"[RETRIEVAL] Payload: {payload}")

        try:
            logger.debug(f"[RETRIEVAL] Sending request to {url}")
            response = await self.client.post(url, json=payload)
            logger.debug(f"[RETRIEVAL] Response status: {response.status_code}")
            response.raise_for_status()
            data = response.json()

            # Extract results from response
            results = data.get("results", [])
            logger.info(f"[RETRIEVAL] Search returned {len(results)} results")
            
            if results:
                for i, result in enumerate(results):
                    logger.debug(f"[RETRIEVAL] Result {i+1}: score={result.get('score', 0):.3f}, title={result.get('title', 'Unknown')}")
            else:
                logger.warning(f"[RETRIEVAL] No results found for query='{query}'")
            
            logger.debug(f"[RETRIEVAL] Response data: {data}")
            return results

        except httpx.HTTPStatusError as e:
            logger.error(f"[RETRIEVAL] HTTP error {e.response.status_code}: {e.response.text}")
            logger.error(f"[RETRIEVAL] URL: {url}")
            logger.error(f"[RETRIEVAL] Payload: {payload}")
            raise
        except httpx.RequestError as e:
            logger.error(f"[RETRIEVAL] Request error: {e}")
            logger.error(f"[RETRIEVAL] URL: {url}")
            raise
        except Exception as e:
            logger.error(f"[RETRIEVAL] Unexpected error: {e}", exc_info=True)
            logger.error(f"[RETRIEVAL] URL: {url}")
            raise

    async def close(self):
        """Close the HTTP client."""
        logger.info("[RETRIEVAL] Closing HTTP client...")
        await self.client.aclose()
        logger.info("[RETRIEVAL] HTTP client closed")
