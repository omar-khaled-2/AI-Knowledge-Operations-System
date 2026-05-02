"""Chat Service - Async Redis Client."""

import asyncio
import json
import logging
from typing import Callable, Awaitable

import redis.asyncio as redis

logger = logging.getLogger(__name__)


class RedisClient:
    """Async Redis client for pub/sub messaging."""

    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.redis: redis.Redis | None = None
        self.pubsub: redis.client.PubSub | None = None
        self._handlers: dict[str, Callable[[dict], Awaitable[None]]] = {}
        self._listener_task: asyncio.Task | None = None

    async def connect(self):
        """Connect to Redis."""
        logger.info(f"[REDIS] Connecting to {self.redis_url}")
        try:
            self.redis = await redis.from_url(
                self.redis_url,
                decode_responses=True,
            )
            self.pubsub = self.redis.pubsub()
            logger.info(f"[REDIS] Connected successfully")
            
            # Log Redis server info
            try:
                info = await self.redis.info('server')
                logger.info(f"[REDIS] Server version: {info.get('redis_version', 'unknown')}")
            except Exception as e:
                logger.warning(f"[REDIS] Could not get server info: {e}")
                
        except Exception as e:
            logger.error(f"[REDIS] Connection failed: {e}", exc_info=True)
            raise

    async def disconnect(self):
        """Disconnect from Redis."""
        logger.info("[REDIS] Disconnecting...")
        if self._listener_task:
            logger.debug("[REDIS] Cancelling listener task...")
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                logger.debug("[REDIS] Listener task cancelled")

        if self.pubsub:
            logger.debug("[REDIS] Closing pubsub...")
            await self.pubsub.close()

        if self.redis:
            logger.debug("[REDIS] Closing Redis connection...")
            await self.redis.close()

        logger.info("[REDIS] Disconnected")

    async def subscribe(
        self,
        channel: str,
        handler: Callable[[dict], Awaitable[None]],
    ):
        """Subscribe to a Redis channel with a message handler."""
        if self.pubsub is None:
            raise RuntimeError("Redis client not connected")

        logger.info(f"[REDIS] Subscribing to channel: {channel}")
        self._handlers[channel] = handler
        await self.pubsub.subscribe(channel)
        logger.info(f"[REDIS] Subscribed to channel: {channel}")

        # Start listener if not already running
        if self._listener_task is None or self._listener_task.done():
            logger.debug("[REDIS] Starting message listener...")
            self._listener_task = asyncio.create_task(self._listen())
            logger.debug("[REDIS] Message listener started")

    async def unsubscribe(self, channel: str):
        """Unsubscribe from a Redis channel."""
        if self.pubsub is None:
            return

        logger.info(f"[REDIS] Unsubscribing from channel: {channel}")
        if channel in self._handlers:
            del self._handlers[channel]

        await self.pubsub.unsubscribe(channel)
        logger.info(f"[REDIS] Unsubscribed from channel: {channel}")

    async def publish(self, channel: str, message: str):
        """Publish a message to a Redis channel."""
        if self.redis is None:
            raise RuntimeError("Redis client not connected")

        logger.debug(f"[REDIS] Publishing to {channel}: {message[:200]}...")
        try:
            result = await self.redis.publish(channel, message)
            logger.debug(f"[REDIS] Published to {channel}, subscribers: {result}")
        except Exception as e:
            logger.error(f"[REDIS] Failed to publish to {channel}: {e}")
            raise

    async def _listen(self):
        """Listen for messages on subscribed channels."""
        if self.pubsub is None:
            logger.error("[REDIS] Cannot listen, pubsub is None")
            return

        logger.info("[REDIS] Listener started")
        try:
            async for message in self.pubsub.listen():
                logger.debug(f"[REDIS] Raw message received: {message}")
                
                if message["type"] == "message":
                    channel = message["channel"]
                    data = message["data"]
                    
                    logger.info(f"[REDIS] Message on channel '{channel}': {data[:200]}...")

                    try:
                        parsed_data = json.loads(data)
                        logger.debug(f"[REDIS] Parsed data: {json.dumps(parsed_data, default=str)}")
                    except json.JSONDecodeError as e:
                        logger.error(f"[REDIS] Failed to parse message on {channel}: {data}")
                        logger.error(f"[REDIS] Parse error: {e}")
                        continue

                    handler = self._handlers.get(channel)
                    if handler:
                        logger.info(f"[REDIS] Found handler for channel: {channel}")
                        try:
                            await handler(parsed_data)
                            logger.info(f"[REDIS] Handler completed for channel: {channel}")
                        except Exception as e:
                            logger.error(
                                f"[REDIS] Error handling message on {channel}: {e}",
                                exc_info=True,
                            )
                    else:
                        logger.warning(f"[REDIS] No handler registered for channel: {channel}")
                elif message["type"] == "subscribe":
                    logger.info(f"[REDIS] Subscription confirmed: {message['channel']}")
                elif message["type"] == "unsubscribe":
                    logger.info(f"[REDIS] Unsubscription confirmed: {message['channel']}")
                else:
                    logger.debug(f"[REDIS] Other message type: {message['type']}")
                    
        except asyncio.CancelledError:
            logger.info("[REDIS] Listener cancelled")
            raise
        except Exception as e:
            logger.error(f"[REDIS] Listener error: {e}", exc_info=True)
