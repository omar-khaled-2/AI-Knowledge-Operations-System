"""Chat Service - Main Entrypoint."""

import asyncio
import json
import logging
import os

from fastapi import FastAPI
from contextlib import asynccontextmanager

from src.config import Config
from src.redis_client import RedisClient
from src.services.chat_engine import ChatEngine

# Global instances
config = Config()

# Configure logging
log_level = config.log_level.upper()
logging.basicConfig(
    level=getattr(logging, log_level, logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

redis_client: RedisClient | None = None
chat_engine: ChatEngine | None = None


async def handle_chat_notification(message: dict):
    """Handle incoming chat:process notifications."""
    global chat_engine
    
    logger.debug(f"[REDIS] Received raw message: {json.dumps(message, default=str)}")
    
    if chat_engine is None:
        logger.error("[HANDLER] Chat engine not initialized")
        return
    
    try:
        logger.info("[HANDLER] Starting message processing pipeline")
        # Process message (fetch history, retrieve, generate, save)
        await chat_engine.process_message(message)
        logger.info("[HANDLER] Message processing completed successfully")
    except Exception as e:
        logger.error(f"[HANDLER] Error processing chat notification: {e}", exc_info=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan."""
    global redis_client, chat_engine
    
    logger.info("[STARTUP] Starting chat service...")
    logger.info(f"[STARTUP] Environment: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info(f"[STARTUP] Log level: {log_level}")
    
    # Initialize services
    redis_url = f"redis://{config.redis_host}:{config.redis_port}"
    logger.info(f"[STARTUP] Redis URL: redis://{config.redis_host}:{config.redis_port}")
    logger.info(f"[STARTUP] Backend URL: {config.backend_url}")
    logger.info(f"[STARTUP] Retrieval Service URL: {config.retrieval_service_url}")
    logger.info(f"[STARTUP] LLM Model: {config.openai_model}")
    
    redis_client = RedisClient(redis_url)
    chat_engine = ChatEngine(config)
    
    # Connect to Redis
    logger.info("[STARTUP] Connecting to Redis...")
    await redis_client.connect()
    
    # Subscribe to chat:process channel
    logger.info("[STARTUP] Subscribing to chat:process channel...")
    await redis_client.subscribe("chat:process", handle_chat_notification)
    
    logger.info("[STARTUP] Chat service started and listening for notifications")
    
    yield
    
    # Cleanup
    logger.info("[SHUTDOWN] Shutting down chat service...")
    if chat_engine:
        logger.info("[SHUTDOWN] Closing chat engine...")
        await chat_engine.close()
    if redis_client:
        logger.info("[SHUTDOWN] Disconnecting from Redis...")
        await redis_client.disconnect()
    logger.info("[SHUTDOWN] Chat service stopped")


# Create FastAPI app
app = FastAPI(
    title="Chat Service",
    description="AI Chat Processing Service - LLM-based with Retrieval",
    version="2.0.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes probes."""
    return {"status": "ok", "service": "chat-service"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=config.host, port=config.port)
