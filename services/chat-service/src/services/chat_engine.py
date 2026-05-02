"""Chat Service - Chat Engine."""

import asyncio
import logging
import random
from typing import AsyncGenerator

from src.config import Config
from src.schemas.messages import ChatNotification, Source
from src.services.retrieval_client import RetrievalClient
from src.services.backend_client import BackendClient

logger = logging.getLogger(__name__)

# Sample responses for stub AI
SAMPLE_RESPONSES = [
    "Based on the documents provided, I found several relevant sections that address your question. The key information suggests that the implementation should focus on modular design and clear separation of concerns.",
    "Looking at the available context, there are three main points to consider. First, the architecture supports horizontal scaling. Second, the data model is normalized for efficiency. Third, the API design follows RESTful principles throughout.",
    "The documents indicate that this approach has been successfully used in production environments. Key benefits include improved performance, better maintainability, and reduced complexity for new team members.",
    "From the retrieved sources, I can see that the recommended pattern involves using an event-driven architecture with clear message contracts. This ensures loose coupling between services and makes the system more resilient.",
    "According to the documentation, the best practice here is to implement caching at multiple layers. The retrieval results show that this can reduce response times by up to 80% while maintaining data consistency.",
]


class ChatEngine:
    """Core chat processing engine."""

    def __init__(self, config: Config):
        self.config = config
        self.retrieval_client = RetrievalClient(
            base_url=config.retrieval_service_url,
            timeout=config.retrieval_timeout,
        )
        self.backend_client = BackendClient(
            base_url=config.backend_url,
            timeout=config.backend_timeout,
        )

    async def process_message(
        self,
        message: dict,
    ) -> AsyncGenerator[dict, None]:
        """Process a chat message and generate response chunks."""
        try:
            notification = ChatNotification.model_validate(message)
        except Exception as e:
            logger.error(f"Invalid message format: {e}")
            yield {
                "userId": message.get("userId", "unknown"),
                "sessionId": message.get("sessionId", "unknown"),
                "chunk": f"Invalid message format: {str(e)}",
                "done": True,
                "sources": None,
            }
            return

        user_id = notification.userId
        session_id = notification.sessionId
        user_message = notification.message
        project_id = notification.projectId

        logger.info(
            f"Processing message for user={user_id}, session={session_id}, "
            f"project={project_id}"
        )

        # NOTE: If you need chat history for real AI, fetch it from backend API:
        # history = await self.backend_client.get_messages(session_id)
        # For stub AI, we don't need history

        # Retrieve RAG context if project_id is provided
        sources: list[Source] | None = None
        if project_id:
            try:
                retrieval_results = await self.retrieval_client.search(
                    query=user_message,
                    project_id=project_id,
                )
                sources = [
                    Source(
                        documentId=r.get("document_id", "unknown"),
                        title=r.get("title", "Untitled"),
                        snippet=r.get("content", "")[:200],
                        score=r.get("score", 0.0),
                    )
                    for r in retrieval_results
                ]
                logger.info(f"Retrieved {len(sources)} sources for RAG")
            except Exception as e:
                logger.error(f"RAG retrieval failed: {e}")
                # Continue without RAG sources

        # Generate stub response
        response_text = self._generate_stub_response(user_message, sources)

        # Split into chunks and stream
        chunks = response_text.split()
        chunk_delay = self.config.chunk_delay_ms / 1000.0

        for i, word in enumerate(chunks):
            # Group words into chunks of 1-3 words for more natural streaming
            chunk_size = random.randint(1, 3)
            chunk_words = chunks[i : i + chunk_size]
            chunk_text = " ".join(chunk_words)

            yield {
                "userId": user_id,
                "sessionId": session_id,
                "chunk": chunk_text + " ",
                "done": False,
                "sources": None,
            }

            # Wait before sending next chunk
            if i + chunk_size < len(chunks):
                await asyncio.sleep(chunk_delay)

        # Send final chunk with sources
        yield {
            "userId": user_id,
            "sessionId": session_id,
            "chunk": "",
            "done": True,
            "sources": [s.model_dump() for s in sources] if sources else None,
        }

        logger.info(f"Completed response for session={session_id}")

    def _generate_stub_response(
        self,
        message: str,
        sources: list[Source] | None,
    ) -> str:
        """Generate a stub response (random text)."""
        # Pick a random sample response
        base_response = random.choice(SAMPLE_RESPONSES)

        # If we have sources, prepend a reference note
        if sources:
            source_titles = ", ".join([s.title for s in sources[:3]])
            prefix = f"Based on {len(sources)} retrieved documents ({source_titles}), "
            return prefix + base_response

        return base_response
