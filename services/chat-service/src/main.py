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


async def handle_process_message(message: dict):
    """Handle incoming chat:process messages."""
    global chat_engine, redis_client
    
    if chat_engine is None or redis_client is None:
        logger.error("Chat engine or redis client not initialized")
        return
    
    try:
        # Generate response stream
        async for chunk in chat_engine.process_message(message):
            # Publish each chunk to chat:response
            await redis_client.publish("chat:response", chunk)
    except Exception as e:
        logger.error(f"Error processing message: {e}", exc_info=True)
        # Publish error chunk
        error_response = {
            "userId": message.get("userId", "unknown"),
            "sessionId": message.get("sessionId", "unknown"),
            "chunk": f"Error: {str(e)}",
            "done": True,
            "sources": None,
        }
        await redis_client.publish("chat:response", error_response)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan."""
    global redis_client, chat_engine
    
    logger.info("Starting chat service...")
    
    # Initialize services
    redis_client = RedisClient(config.redis_url)
    chat_engine = ChatEngine(config)
    
    # Connect to Redis
    await redis_client.connect()
    
    # Subscribe to chat:process channel
    await redis_client.subscribe("chat:process", handle_process_message)
    
    logger.info("Chat service started and listening for messages")
    
    yield
    
    # Cleanup
    logger.info("Shutting down chat service...")
    await redis_client.disconnect()
    logger.info("Chat service stopped")


# Create FastAPI app
app = FastAPI(
    title="Chat Service",
    description="AI Chat Processing Service - Pub/Sub Worker",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes probes."""
    return {"status": "ok", "service": "chat-service"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=config.host, port=config.port)
