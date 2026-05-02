"""Tests for Redis client."""

import json
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from src.redis_client import RedisClient


@pytest_asyncio.fixture
async def redis_client():
    """Create a Redis client for testing."""
    client = RedisClient("redis://localhost:6379")
    
    # Mock Redis connection
    client.redis = AsyncMock()
    client.pubsub = AsyncMock()
    
    yield client


@pytest.mark.asyncio
async def test_connect(redis_client):
    """Test connecting to Redis."""
    with patch("redis.asyncio.from_url", new_callable=AsyncMock) as mock_from_url:
        mock_redis = AsyncMock()
        mock_pubsub = AsyncMock()
        mock_redis.pubsub = MagicMock(return_value=mock_pubsub)
        mock_from_url.return_value = mock_redis
        
        await redis_client.connect()
        
        mock_from_url.assert_called_once_with(
            "redis://localhost:6379",
            decode_responses=True,
        )
        assert redis_client.redis is not None
        assert redis_client.pubsub is not None


@pytest.mark.asyncio
async def test_publish(redis_client):
    """Test publishing a message."""
    message = {"test": "data", "value": 123}
    
    await redis_client.publish("test-channel", message)
    
    redis_client.redis.publish.assert_called_once()
    call_args = redis_client.redis.publish.call_args[0]
    assert call_args[0] == "test-channel"
    
    # Verify JSON encoding
    published_data = json.loads(call_args[1])
    assert published_data["test"] == "data"
    assert published_data["value"] == 123


@pytest.mark.asyncio
async def test_subscribe(redis_client):
    """Test subscribing to a channel."""
    handler = AsyncMock()
    
    await redis_client.subscribe("test-channel", handler)
    
    redis_client.pubsub.subscribe.assert_called_once_with("test-channel")
    assert "test-channel" in redis_client._handlers
    assert redis_client._handlers["test-channel"] == handler


@pytest.mark.asyncio
async def test_unsubscribe(redis_client):
    """Test unsubscribing from a channel."""
    handler = AsyncMock()
    redis_client._handlers["test-channel"] = handler
    
    await redis_client.unsubscribe("test-channel")
    
    redis_client.pubsub.unsubscribe.assert_called_once_with("test-channel")
    assert "test-channel" not in redis_client._handlers


@pytest.mark.asyncio
async def test_disconnect(redis_client):
    """Test disconnecting from Redis."""
    redis_client._listener_task = AsyncMock()
    redis_client._listener_task.done = MagicMock(return_value=False)
    
    await redis_client.disconnect()
    
    redis_client._listener_task.cancel.assert_called_once()
    redis_client.pubsub.close.assert_called_once()
    redis_client.redis.close.assert_called_once()
