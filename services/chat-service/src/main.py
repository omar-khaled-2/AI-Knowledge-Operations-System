"""Chat Service - Main Entrypoint."""

import asyncio
import json
import logging

from fastapi import FastAPI
from contextlib import asynccontextmanager

from src.config import Config
from src.redis_client import RedisClient
from src.services.chat_engine import ChatEngine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Global instances
config = Config()
redis_client: RedisClient | None = None
chat_engine: ChatEngine | None = None


async def handle_chat_notification(message: dict):
    """Handle incoming chat:process notifications."""
    global chat_engine
    
    if chat_engine is None:
        logger.error("Chat engine not initialized")
        return
    
    try:
        # Process message (fetch history, retrieve, generate, save)
        await chat_engine.process_message(message)
    except Exception as e:
        logger.error(f"Error processing chat notification: {e}", exc_info=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan."""
    global redis_client, chat_engine
    
    logger.info("Starting chat service...")
    
    # Initialize services
    redis_url = f"redis://{config.redis_host}:{config.redis_port}"
    redis_client = RedisClient(redis_url)
    chat_engine = ChatEngine(config)
    
    # Connect to Redis
    await redis_client.connect()
    
    # Subscribe to chat:process channel
    await redis_client.subscribe("chat:process", handle_chat_notification)
    
    logger.info("Chat service started and listening for notifications")
    
    yield
    
    # Cleanup
    logger.info("Shutting down chat service...")
    if chat_engine:
        await chat_engine.close()
    if redis_client:
        await redis_client.disconnect()
    logger.info("Chat service stopped")


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
