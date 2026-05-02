"""Tests for chat engine."""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from src.config import Config
from src.services.chat_engine import ChatEngine


@pytest_asyncio.fixture
async def chat_engine():
    """Create a chat engine instance for testing."""
    config = Config()
    engine = ChatEngine(config)
    
    # Mock the retrieval client
    engine.retrieval_client = AsyncMock()
    engine.retrieval_client.search = AsyncMock(return_value=[])
    
    yield engine


@pytest.mark.asyncio
async def test_process_message_without_project(chat_engine):
    """Test processing a message without project ID (no RAG)."""
    message = {
        "userId": "user123",
        "sessionId": "session456",
        "message": "Hello",
        "history": [],
        "projectId": None,
    }
    
    chunks = []
    async for chunk in chat_engine.process_message(message):
        chunks.append(chunk)
    
    # Should produce at least 2 chunks (content + final)
    assert len(chunks) >= 2
    
    # First chunks should not be done
    for chunk in chunks[:-1]:
        assert chunk["done"] is False
        assert chunk["userId"] == "user123"
        assert chunk["sessionId"] == "session456"
    
    # Last chunk should be done
    assert chunks[-1]["done"] is True
    assert chunks[-1]["chunk"] == ""
    assert chunks[-1]["sources"] is None
    
    # Retrieval should not be called
    chat_engine.retrieval_client.search.assert_not_called()


@pytest.mark.asyncio
async def test_process_message_with_project(chat_engine):
    """Test processing a message with project ID (with RAG)."""
    # Mock retrieval results
    chat_engine.retrieval_client.search = AsyncMock(return_value=[
        {
            "document_id": "doc1",
            "title": "Test Document",
            "content": "This is test content",
            "score": 0.95,
        }
    ])
    
    message = {
        "userId": "user123",
        "sessionId": "session456",
        "message": "What is this?",
        "history": [],
        "projectId": "project789",
    }
    
    chunks = []
    async for chunk in chat_engine.process_message(message):
        chunks.append(chunk)
    
    # Should produce multiple chunks
    assert len(chunks) >= 2
    
    # Last chunk should have sources
    final_chunk = chunks[-1]
    assert final_chunk["done"] is True
    assert final_chunk["sources"] is not None
    assert len(final_chunk["sources"]) == 1
    assert final_chunk["sources"][0]["documentId"] == "doc1"
    
    # Retrieval should be called
    chat_engine.retrieval_client.search.assert_called_once_with(
        query="What is this?",
        project_id="project789",
    )


@pytest.mark.asyncio
async def test_process_message_invalid_format(chat_engine):
    """Test processing an invalid message."""
    message = {
        "invalid": "data",
    }
    
    chunks = []
    async for chunk in chat_engine.process_message(message):
        chunks.append(chunk)
    
    # Should return error chunk
    assert len(chunks) == 1
    assert chunks[0]["done"] is True
    assert "Invalid message format" in chunks[0]["chunk"]
