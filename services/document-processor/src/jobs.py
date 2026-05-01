import uuid
from typing import List

import structlog
from redis import Redis
from rq import Queue

from src.config import Config

logger = structlog.get_logger()


def get_embedding_queue(redis_url: str = None) -> Queue:
    """Get RQ queue for embedding jobs.

    Args:
        redis_url: Redis connection URL.

    Returns:
        RQ Queue instance.
    """
    if redis_url is None:
        redis_url = Config.from_env().redis_url
    redis_conn = Redis.from_url(redis_url)
    config = Config.from_env()
    return Queue(config.embedding_queue_name, connection=redis_conn)


def enqueue_embedding_jobs(
    document_id: str,
    project_id: str,
    chunks: List[str],
    filename: str,
    queue: Queue = None
) -> List[str]:
    """Enqueue embedding jobs for each chunk.

    Args:
        document_id: Document UUID.
        project_id: Project UUID.
        chunks: List of text chunks to embed.
        filename: Original filename.
        queue: RQ queue instance (optional, creates default if None).

    Returns:
        List of job IDs.
    """
    if queue is None:
        queue = get_embedding_queue()

    job_ids = []
    total_chunks = len(chunks)

    for idx, chunk_text in enumerate(chunks):
        chunk_id = str(uuid.uuid4())
        job = queue.enqueue(
            "src.jobs.embed_chunk",
            {
                "chunk_id": chunk_id,
                "document_id": document_id,
                "project_id": project_id,
                "chunk_index": idx,
                "text": chunk_text,
                "filename": filename,
                "total_chunks": total_chunks,
            }
        )
        job_ids.append(job.id)
        logger.info(
            "Enqueued embedding job",
            job_id=job.id,
            chunk_id=chunk_id,
            chunk_index=idx,
            total_chunks=total_chunks,
        )

    logger.info(
        "Enqueued all embedding jobs",
        document_id=document_id,
        total_chunks=total_chunks,
        total_jobs=len(job_ids),
    )
    return job_ids
