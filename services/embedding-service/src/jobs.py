"""Embedding Service - RQ Job Functions."""

from typing import Dict, Any

import structlog

from src.config import Config
from src.model import EmbeddingModel
from src.qdrant_client import QdrantVectorClient

logger = structlog.get_logger()


def embed_chunk(chunk_data: Dict[str, Any]) -> None:
    """Embed a single chunk and upsert to Qdrant.

    Args:
        chunk_data: Dictionary with chunk info:
            - chunk_id: UUID for the chunk
            - document_id: Parent document UUID
            - project_id: Project UUID
            - chunk_index: Position in document
            - text: Chunk text content
            - filename: Original filename
            - total_chunks: Total number of chunks
    """
    config = Config.from_env()

    chunk_id = chunk_data["chunk_id"]
    document_id = chunk_data["document_id"]
    project_id = chunk_data["project_id"]
    chunk_index = chunk_data["chunk_index"]
    text = chunk_data["text"]
    filename = chunk_data["filename"]

    logger.info(
        "Embedding chunk",
        chunk_id=chunk_id,
        document_id=document_id,
        chunk_index=chunk_index,
    )

    # Load model
    model = EmbeddingModel()

    # Embed text
    vector = model.embed(text)
    logger.info("Chunk embedded", chunk_id=chunk_id, vector_dim=len(vector))

    # Upsert to Qdrant
    qdrant = QdrantVectorClient(config.qdrant_url, config.qdrant_collection)
    qdrant.ensure_collection(vector_size=len(vector))

    qdrant.upsert_chunks([
        {
            "id": chunk_id,
            "vector": vector,
            "payload": {
                "text": text,
                "document_id": document_id,
                "project_id": project_id,
                "chunk_index": chunk_index,
                "filename": filename,
            },
        }
    ])

    logger.info(
        "Chunk upserted to Qdrant",
        chunk_id=chunk_id,
        document_id=document_id,
        collection=config.qdrant_collection,
    )
