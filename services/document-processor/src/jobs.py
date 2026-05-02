import json
import uuid
from typing import Dict, Any, List

import pika
import structlog

from src.config import Config

logger = structlog.get_logger()


def publish_embedding_jobs(
    document_id: str,
    project_id: str,
    chunks: List[str],
    filename: str,
) -> int:
    """Publish embedding jobs to RabbitMQ.

    Args:
        document_id: Document UUID.
        project_id: Project UUID.
        chunks: List of text chunks to embed.
        filename: Original filename.

    Returns:
        Number of chunks published.
    """
    config = Config.from_env()
    total_chunks = len(chunks)

    params = pika.URLParameters(config.rabbitmq_url)
    connection = pika.BlockingConnection(params)
    channel = connection.channel()

    channel.exchange_declare(
        exchange=config.rabbitmq_exchange,
        exchange_type='topic',
        durable=True,
    )

    for idx, chunk_text in enumerate(chunks):
        chunk_id = str(uuid.uuid4())
        message = {
            "chunk_id": chunk_id,
            "document_id": document_id,
            "project_id": project_id,
            "chunk_index": idx,
            "text": chunk_text,
            "filename": filename,
            "total_chunks": total_chunks,
        }

        channel.basic_publish(
            exchange=config.rabbitmq_exchange,
            routing_key=config.embedding_routing_key,
            body=json.dumps(message).encode('utf-8'),
            properties=pika.BasicProperties(
                content_type='application/json',
                delivery_mode=2,  # Persistent
            ),
        )

        logger.info(
            "Published embedding job",
            chunk_id=chunk_id,
            chunk_index=idx,
            total_chunks=total_chunks,
        )

    connection.close()

    logger.info(
        "Published all embedding jobs",
        document_id=document_id,
        total_chunks=total_chunks,
    )
    return total_chunks
