import json
import structlog
from openai import OpenAI
from src.config import Config

logger = structlog.get_logger()

SYSTEM_PROMPT = """
You are an expert document analyst. Analyze the provided document and generate actionable insights.

Return ONLY a JSON object with this structure:
{
  "insights": [
    {
      "type": "action-item" | "connection" | "trend" | "anomaly",
      "title": "Concise 5-8 word headline",
      "description": "2-3 sentence explanation with context",
      "confidence": 0.0-1.0,
      "relatedDocuments": ["doc-id-1"]
    }
  ]
}

Rules:
- action-item: Extract follow-ups, decisions, deadlines
- connection: Link to similar documents in the project
- trend: Detect shifts in topics or sentiment
- anomaly: Flag unusual content or patterns
- Only include insights with confidence >= 0.7
- Maximum 6 insights total
"""


class LLMClient:
    """Client for generating insights using OpenAI."""

    def __init__(self, config: Config):
        self.config = config
        self.client = OpenAI(api_key=config.openai_api_key)
        logger.info("LLM client initialized", model=config.openai_model)

    def generate_insights(self, document_text: str, similar_docs_text: str) -> list[dict]:
        """Generate insights from document content."""
        user_prompt = f"""
Document Content:
{document_text}

Similar Documents in Project:
{similar_docs_text}

Generate insights for this new document.
"""

        try:
            response = self.client.chat.completions.create(
                model=self.config.openai_model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=2000,
            )

            content = response.choices[0].message.content
            result = json.loads(content)
            insights = result.get("insights", [])

            logger.info(f"Generated {len(insights)} insights")
            return insights

        except Exception as e:
            logger.error("Failed to generate insights", error=str(e))
            return []
