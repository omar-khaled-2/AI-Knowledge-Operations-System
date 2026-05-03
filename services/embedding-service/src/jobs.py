"""Embedding Service - RQ Job Functions."""

from typing import Dict, Any

import requests
import structlog

from src.config import Config
from src.model import EmbeddingModel
from src.qdrant_client import QdrantVectorClient
from src.redis_client import ChunkTracker
from src.sparse_model import SparseEmbeddingModel

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
    total_chunks = chunk_data.get("total_chunks", 1)

    logger.info(
        "Embedding chunk",
        chunk_id=chunk_id,
        document_id=document_id,
        chunk_index=chunk_index,
    )

    # Load models
    dense_model = EmbeddingModel()
    sparse_model = SparseEmbeddingModel()

    # Embed text (dense)
    dense_vector = dense_model.embed(text)
    logger.info("Chunk embedded (dense)", chunk_id=chunk_id, vector_dim=len(dense_vector))
    
    # Embed text (sparse)
    sparse_vector = sparse_model.embed(text)
    logger.info(
        "Chunk embedded (sparse)",
        chunk_id=chunk_id,
        sparse_dim=len(sparse_vector.indices),
    )

    # Upsert to Qdrant
    qdrant = QdrantVectorClient(config.qdrant_url, config.qdrant_collection)
    qdrant.ensure_collection(vector_size=len(dense_vector))

    qdrant.upsert_chunks([
        {
            "id": chunk_id,
            "vector": {
                "dense": dense_vector,
                "sparse": {
                    "indices": sparse_vector.indices,
                    "values": sparse_vector.values,
                },
            },
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

    # Track chunk completion
    tracker = ChunkTracker(config)
    completed = tracker.mark_chunk_embedded(document_id, total_chunks)

    logger.info(
        "Chunk progress",
        document_id=document_id,
        completed=completed,
        total_chunks=total_chunks,
    )

    # Check if all chunks are embedded
    if tracker.is_complete(document_id, total_chunks):
        logger.info(
            "All chunks embedded",
            document_id=document_id,
        )

        # Update document status to "embedded"
        if config.backend_url:
            try:
                response = requests.patch(
                    f"{config.backend_url}/documents/{document_id}",
                    json={"status": "embedded"},
                    timeout=10,
                )
                response.raise_for_status()
                logger.info(
                    "Document status updated to embedded",
                    document_id=document_id,
                )
            except Exception as e:
                logger.warning(
                    "Failed to update document status",
                    document_id=document_id,
                    error=str(e),
                )

        # Cleanup Redis tracking
        tracker.cleanup(document_id)
