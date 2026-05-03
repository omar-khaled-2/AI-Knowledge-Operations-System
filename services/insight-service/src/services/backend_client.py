import structlog
import httpx
from src.config import Config

logger = structlog.get_logger()


class BackendClient:
    """Client for posting insights to backend internal API."""

    def __init__(self, base_url: str, config: Config | None = None):
        self.base_url = base_url
        self.config = config or Config.from_env()

        headers = {}
        if self.config.backend_internal_api_key:
            headers["X-Internal-API-Key"] = self.config.backend_internal_api_key

        self.client = httpx.Client(base_url=base_url, timeout=30.0, headers=headers)
        logger.info("Backend client initialized", base_url=base_url)

    def save_insights(
        self,
        project_id: str,
        source_document_id: str,
        insights: list[dict],
    ) -> dict:
        """Save generated insights to backend."""
        url = "/internal/insights"
        payload = {
            "projectId": project_id,
            "sourceDocumentId": source_document_id,
            "insights": insights,
        }

        logger.info(
            "Saving insights to backend",
            project_id=project_id,
            document_id=source_document_id,
            count=len(insights),
        )

        try:
            response = self.client.post(url, json=payload)
            response.raise_for_status()
            result = response.json()
            logger.info(
                "Insights saved successfully",
                created_count=result.get("createdCount"),
            )
            return result
        except httpx.HTTPError as e:
            logger.error("Failed to save insights", error=str(e))
            raise
