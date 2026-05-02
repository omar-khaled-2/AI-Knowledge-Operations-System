"""Chat Service - Message Schemas."""

from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """A single message in the chat history."""

    role: Literal["user", "assistant", "system"] = Field(..., description="The role of the message sender")
    content: str = Field(..., description="The message content")


class ProcessMessage(BaseModel):
    """Incoming message from backend on chat:process channel."""

    user_id: str = Field(..., alias="userId", description="The user ID")
    session_id: str = Field(..., alias="sessionId", description="The chat session ID")
    message: str = Field(..., description="The user's message")
    history: list[ChatMessage] = Field(default_factory=list, description="Chat history")
    project_id: str | None = Field(default=None, alias="projectId", description="Optional project ID for RAG")

    model_config = {"populate_by_name": True}


class Source(BaseModel):
    """A source document from retrieval."""

    document_id: str = Field(..., alias="documentId", description="Document identifier")
    title: str = Field(..., description="Document title")
    snippet: str = Field(..., description="Relevant text snippet")
    score: float = Field(..., description="Relevance score")

    model_config = {"populate_by_name": True}


class ResponseChunk(BaseModel):
    """Outgoing streaming chunk to backend on chat:response channel."""

    user_id: str = Field(..., alias="userId", description="The user ID")
    session_id: str = Field(..., alias="sessionId", description="The chat session ID")
    chunk: str = Field(..., description="Text chunk (empty when done=True)")
    done: bool = Field(default=False, description="Whether this is the final chunk")
    sources: list[Source] | None = Field(default=None, description="Sources when done=True")

    model_config = {"populate_by_name": True}
