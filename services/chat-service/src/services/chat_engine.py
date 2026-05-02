"""Chat Service - Chat Engine."""

import asyncio
import logging
from typing import AsyncGenerator

from src.config import Config
from src.schemas.messages import ChatNotification
from src.services.retrieval_client import RetrievalClient
from src.services.backend_client import BackendClient
from src.services.llm_client import LLMClient

logger = logging.getLogger(__name__)


class ChatEngine:
    """Core chat processing engine with LLM-based query generation and response."""

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
        self.llm_client = LLMClient(
            api_key=config.openai_api_key,
            model=config.openai_model,
            base_url=config.openai_base_url,
        )

    async def process_message(self, message: dict) -> None:
        """Process a chat message: generate query, retrieve, generate response, save."""
        try:
            notification = ChatNotification.model_validate(message)
        except Exception as e:
            logger.error(f"Invalid notification format: {e}")
            return

        user_id = notification.userId
        session_id = notification.sessionId
        project_id = notification.projectId

        logger.info(f"Processing message for user={user_id}, session={session_id}, project={project_id}")

        try:
            # Step 1: Fetch latest 8 messages with sources from backend API
            all_messages = await self.backend_client.get_messages(session_id, limit=8)
            if not all_messages:
                logger.error(f"No messages found for session {session_id}")
                return

            logger.info(f"Fetched {len(all_messages)} messages for context")

            # Step 2: Use LLM to generate optimized search query
            search_query = await self.llm_client.generate_search_query(all_messages)
            logger.info(f"Generated search query: {search_query}")

            # Step 3: Retrieve from retrieval-service using generated query
            retrieved_chunks: list[dict] = []
            if project_id and search_query:
                try:
                    retrieval_results = await self.retrieval_client.search(
                        query=search_query,
                        project_id=project_id,
                        top_k=5,
                    )
                    retrieved_chunks = retrieval_results
                    logger.info(f"Retrieved {len(retrieved_chunks)} chunks")
                except Exception as e:
                    logger.error(f"Retrieval failed: {e}")

            # Step 4: Use latest 7 messages as history
            history = all_messages[:-1]  # All except the latest
            latest_message = all_messages[-1]

            # Step 5: Generate response with LLM using history + retrieved chunks
            response_text = ""
            async for chunk in self.llm_client.generate_response(
                history=history,
                latest_message=latest_message,
                retrieved_chunks=retrieved_chunks,
            ):
                response_text += chunk

            logger.info(f"Generated response ({len(response_text)} chars)")

            # Step 6: Call backend API to create assistant message
            sources = [
                {
                    "documentId": r.get("document_id", "unknown"),
                    "title": r.get("title", "Untitled"),
                    "snippet": r.get("content", "")[:200],
                    "score": r.get("score", 0.0),
                }
                for r in retrieved_chunks
            ] if retrieved_chunks else None

            created_message = await self.backend_client.create_message(
                session_id=session_id,
                user_id=user_id,
                role="assistant",
                content=response_text,
                sources=sources,
            )

            if created_message:
                logger.info(f"Saved assistant message for session {session_id}")
            else:
                logger.error(f"Failed to save assistant message for session {session_id}")

        except Exception as e:
            logger.error(f"Error processing message: {e}", exc_info=True)

    async def close(self):
        """Close all clients."""
        await self.retrieval_client.close()
        await self.backend_client.close()
        await self.llm_client.close()
