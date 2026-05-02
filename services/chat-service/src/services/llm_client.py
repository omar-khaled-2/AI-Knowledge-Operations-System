"""Chat Service - OpenAI LLM Client."""

import logging
from typing import AsyncGenerator

import openai

logger = logging.getLogger(__name__)


class LLMClient:
    """OpenAI LLM client for query generation and chat completion."""

    def __init__(self, api_key: str, model: str = "gpt-4o-mini", base_url: str | None = None):
        self.client = openai.AsyncOpenAI(
            api_key=api_key,
            base_url=base_url,
        )
        self.model = model

    async def generate_search_query(
        self,
        messages: list[dict],
    ) -> str:
        """Generate an optimized search query based on conversation context."""
        
        system_prompt = """You are a search query optimizer. Given a conversation history, generate a concise, specific search query that captures the user's intent.
        
Rules:
- Focus on the latest user message and context
- Include key technical terms, names, or concepts
- Keep it under 100 characters when possible
- Return ONLY the search query, no explanations"""

        conversation = "\n".join([
            f"{msg['role']}: {msg['content']}"
            for msg in messages[-8:]  # Last 8 messages
        ])

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Conversation:\n{conversation}\n\nGenerate a search query for the latest user intent:"},
                ],
                temperature=0.3,
                max_tokens=100,
            )
            
            query = response.choices[0].message.content.strip()
            logger.info(f"Generated search query: {query}")
            return query

        except Exception as e:
            logger.error(f"Failed to generate search query: {e}")
            # Fallback: use last user message
            for msg in reversed(messages):
                if msg["role"] == "user":
                    return msg["content"]
            return ""

    async def generate_response(
        self,
        history: list[dict],
        latest_message: dict,
        retrieved_chunks: list[dict],
    ) -> AsyncGenerator[str, None]:
        """Generate a response using conversation history and retrieved chunks."""
        
        system_prompt = """You are a helpful AI assistant. Answer questions based on the provided conversation history and retrieved document chunks.
        
Rules:
- Use the retrieved chunks to answer accurately
- If the chunks don't contain the answer, say so honestly
- Cite sources naturally (e.g., "According to the API documentation...")
- Be concise but thorough
- Maintain conversation context from history"""

        # Build context from retrieved chunks
        context = "\n\n".join([
            f"[Source {i+1}: {chunk.get('title', 'Unknown')} - Score: {chunk.get('score', 0):.2f}]\n{chunk.get('content', chunk.get('snippet', ''))}"
            for i, chunk in enumerate(retrieved_chunks[:5])  # Top 5 chunks
        ])

        # Build messages array
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add history (last 7 messages)
        for msg in history[-7:]:
            messages.append({
                "role": msg["role"],
                "content": msg["content"],
            })
        
        # Add retrieved context as part of the latest message
        if context:
            messages.append({
                "role": "user",
                "content": f"{latest_message['content']}\n\n[Retrieved Context]:\n{context}",
            })
        else:
            messages.append({
                "role": "user",
                "content": latest_message["content"],
            })

        try:
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1000,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            logger.error(f"Failed to generate response: {e}")
            yield "I apologize, but I encountered an error generating a response. Please try again."

    async def close(self):
        """Close the HTTP client."""
        await self.client.close()
