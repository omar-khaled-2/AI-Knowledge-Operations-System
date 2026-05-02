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
        self.redis = await redis.from_url(
            self.redis_url,
            decode_responses=True,
        )
        self.pubsub = self.redis.pubsub()
        logger.info(f"Connected to Redis at {self.redis_url}")

    async def disconnect(self):
        """Disconnect from Redis."""
        if self._listener_task:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass

        if self.pubsub:
            await self.pubsub.close()

        if self.redis:
            await self.redis.close()

        logger.info("Disconnected from Redis")

    async def subscribe(
        self,
        channel: str,
        handler: Callable[[dict], Awaitable[None]],
    ):
        """Subscribe to a Redis channel with a message handler."""
        if self.pubsub is None:
            raise RuntimeError("Redis client not connected")

        self._handlers[channel] = handler
        await self.pubsub.subscribe(channel)

        # Start listener if not already running
        if self._listener_task is None or self._listener_task.done():
            self._listener_task = asyncio.create_task(self._listen())

        logger.info(f"Subscribed to channel: {channel}")

    async def unsubscribe(self, channel: str):
        """Unsubscribe from a Redis channel."""
        if self.pubsub is None:
            return

        if channel in self._handlers:
            del self._handlers[channel]

        await self.pubsub.unsubscribe(channel)
        logger.info(f"Unsubscribed from channel: {channel}")

    async def publish(self, channel: str, message: dict):
        """Publish a message to a Redis channel."""
        if self.redis is None:
            raise RuntimeError("Redis client not connected")

        try:
            message_json = json.dumps(message)
            await self.redis.publish(channel, message_json)
        except Exception as e:
            logger.error(f"Failed to publish message to {channel}: {e}")
            raise

    async def _listen(self):
        """Listen for messages on subscribed channels."""
        if self.pubsub is None:
            return

        try:
            async for message in self.pubsub.listen():
                if message["type"] == "message":
                    channel = message["channel"]
                    data = message["data"]

                    try:
                        parsed_data = json.loads(data)
                    except json.JSONDecodeError:
                        logger.error(f"Failed to parse message on {channel}: {data}")
                        continue

                    handler = self._handlers.get(channel)
                    if handler:
                        try:
                            await handler(parsed_data)
                        except Exception as e:
                            logger.error(
                                f"Error handling message on {channel}: {e}",
                                exc_info=True,
                            )
        except asyncio.CancelledError:
            logger.info("Redis listener cancelled")
            raise
        except Exception as e:
            logger.error(f"Redis listener error: {e}", exc_info=True)
