"""Chat Service - Message Schemas."""

from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """A single message in the chat history."""

    role: Literal["user", "assistant", "system"] = Field(..., description="The role of the message sender")
    content: str = Field(..., description="The message content")


class ChatNotification(BaseModel):
    """Incoming notification from backend on chat:process channel."""

    userId: str = Field(..., description="The user ID")
    sessionId: str = Field(..., description="The chat session ID")
    projectId: str | None = Field(default=None, description="Optional project ID for RAG")


class Source(BaseModel):
    """A source document from retrieval."""

    documentId: str = Field(..., description="Document identifier")
    title: str = Field(..., description="Document title")
    snippet: str = Field(..., description="Relevant text snippet")
    score: float = Field(..., description="Relevance score")


class ResponseChunk(BaseModel):
    """Outgoing streaming chunk to backend on chat:response channel."""

    userId: str = Field(..., description="The user ID")
    sessionId: str = Field(..., description="The chat session ID")
    chunk: str = Field(..., description="Text chunk (empty when done=True)")
    done: bool = Field(default=False, description="Whether this is the final chunk")
    sources: list[Source] | None = Field(default=None, description="Sources when done=True")
