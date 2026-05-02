"""Chat Service - Chat Engine."""

import asyncio
import json
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
        logger.info("[ENGINE] Initializing ChatEngine...")
        
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
        logger.info("[ENGINE] ChatEngine initialized")

    async def process_message(self, message: dict) -> None:
        """Process a chat message: generate query, retrieve, generate response, save."""
        logger.info(f"[PIPELINE] ==========================================")
        logger.info(f"[PIPELINE] Starting message processing pipeline")
        logger.info(f"[PIPELINE] Raw message: {json.dumps(message, default=str)}")
        
        try:
            notification = ChatNotification.model_validate(message)
        except Exception as e:
            logger.error(f"[PIPELINE] Invalid notification format: {e}")
            logger.error(f"[PIPELINE] Message: {json.dumps(message, default=str)}")
            return

        user_id = notification.userId
        session_id = notification.sessionId
        project_id = notification.projectId

        logger.info(f"[PIPELINE] user_id={user_id}, session_id={session_id}, project_id={project_id}")

        try:
            # Step 1: Fetch latest 8 messages with sources from backend API
            logger.info("[STEP 1] Fetching message history from backend...")
            all_messages = await self.backend_client.get_messages(session_id, limit=8)
            if not all_messages:
                logger.error(f"[STEP 1] No messages found for session {session_id}")
                logger.error("[STEP 1] Aborting pipeline - cannot process without message history")
                return

            logger.info(f"[STEP 1] Fetched {len(all_messages)} messages for context")
            logger.debug(f"[STEP 1] Messages: {json.dumps(all_messages, default=str)}")

            # Step 2: Use LLM to generate optimized search query
            logger.info("[STEP 2] Generating search query with LLM...")
            search_query = await self.llm_client.generate_search_query(all_messages)
            logger.info(f"[STEP 2] Generated search query: '{search_query}'")

            # Step 3: Retrieve from retrieval-service using generated query
            logger.info("[STEP 3] Retrieving chunks from retrieval service...")
            retrieved_chunks: list[dict] = []
            if project_id and search_query:
                try:
                    logger.info(f"[STEP 3] Searching project={project_id}, query='{search_query}', limit={self.config.retrieval_limit}, score_threshold={self.config.retrieval_score_threshold}")
                    retrieval_results = await self.retrieval_client.search(
                        query=search_query,
                        project_id=project_id,
                        limit=self.config.retrieval_limit,
                        score_threshold=self.config.retrieval_score_threshold,
                    )
                    retrieved_chunks = retrieval_results
                    logger.info(f"[STEP 3] Retrieved {len(retrieved_chunks)} chunks")
                    if retrieved_chunks:
                        for i, chunk in enumerate(retrieved_chunks):
                            logger.debug(f"[STEP 3] Chunk {i+1}: {json.dumps(chunk, default=str)[:200]}")
                except Exception as e:
                    logger.error(f"[STEP 3] Retrieval failed: {e}")
                    logger.error("[STEP 3] Continuing without retrieved context")
            else:
                if not project_id:
                    logger.warning("[STEP 3] No project_id provided, skipping retrieval")
                if not search_query:
                    logger.warning("[STEP 3] No search query generated, skipping retrieval")

            # Step 4: Use latest 7 messages as history
            logger.info("[STEP 4] Preparing conversation history...")
            history = all_messages[:-1]  # All except the latest
            latest_message = all_messages[-1]
            logger.info(f"[STEP 4] History: {len(history)} messages, latest: {latest_message.get('role', 'unknown')}")
            logger.debug(f"[STEP 4] Latest message: {json.dumps(latest_message, default=str)}")

            # Step 5: Generate response with LLM using history + retrieved chunks
            logger.info("[STEP 5] Generating AI response...")
            response_text = ""
            chunk_count = 0
            async for chunk in self.llm_client.generate_response(
                history=history,
                latest_message=latest_message,
                retrieved_chunks=retrieved_chunks,
            ):
                response_text += chunk
                chunk_count += 1
                if chunk_count % 10 == 0:
                    logger.debug(f"[STEP 5] Received {chunk_count} chunks so far, response length: {len(response_text)}")

            logger.info(f"[STEP 5] Generated response ({len(response_text)} chars, {chunk_count} chunks)")
            logger.debug(f"[STEP 5] Response preview: {response_text[:200]}...")

            # Step 6: Call backend API to create assistant message
            logger.info("[STEP 6] Saving assistant message to backend...")
            sources = [
                {
                    "documentId": r.get("document_id", "unknown"),
                    "title": r.get("title", "Untitled"),
                    "snippet": r.get("content", "")[:200],
                    "score": r.get("score", 0.0),
                }
                for r in retrieved_chunks
            ] if retrieved_chunks else None

            logger.info(f"[STEP 6] Sources: {len(sources) if sources else 0}")
            if sources:
                for i, src in enumerate(sources):
                    logger.debug(f"[STEP 6] Source {i+1}: {json.dumps(src, default=str)}")

            created_message = await self.backend_client.create_message(
                session_id=session_id,
                user_id=user_id,
                role="assistant",
                content=response_text,
                sources=sources,
            )

            if created_message:
                logger.info(f"[STEP 6] Saved assistant message for session {session_id}")
                logger.debug(f"[STEP 6] Created message: {json.dumps(created_message, default=str)}")
            else:
                logger.error(f"[STEP 6] Failed to save assistant message for session {session_id}")

            logger.info("[PIPELINE] ==========================================")
            logger.info("[PIPELINE] Message processing pipeline completed")

        except Exception as e:
            logger.error(f"[PIPELINE] Error processing message: {e}", exc_info=True)
            logger.error(f"[PIPELINE] session_id={session_id}, user_id={user_id}, project_id={project_id}")

    async def close(self):
        """Close all clients."""
        logger.info("[ENGINE] Closing all clients...")
        await self.retrieval_client.close()
        await self.backend_client.close()
        await self.llm_client.close()
        logger.info("[ENGINE] All clients closed")
