"""Document Processor Service - Event models and processing logic."""

import os
import tempfile
from typing import Any

import structlog

from src.config import Config
from src.jobs import enqueue_embedding_jobs
from src.parsers.factory import get_parser
from src.s3_client import S3Client
from src.chunker import SemanticChunker

logger = structlog.get_logger()


def process_document(event_data: dict[str, Any]) -> bool:
    """Process a document upload event.

    Downloads file from S3, parses it, chunks it semantically,
    and enqueues embedding jobs for each chunk.

    Args:
        event_data: Event payload from Redis Stream.

    Returns:
        True if processing succeeded.
    """
    try:
        document_id = event_data["documentId"]
        object_key = event_data["objectKey"]
        mime_type = event_data["mimeType"]
        filename = event_data["filename"]
        project_id = event_data["projectId"]

        logger.info(
            "Processing document",
            document_id=document_id,
            filename=filename,
            mime_type=mime_type,
            object_key=object_key,
            project_id=project_id,
        )

        config = Config.from_env()

        # Download from S3
        s3_client = S3Client(bucket=config.s3_bucket_name, region=config.aws_region)
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_path = temp_file.name

        try:
            s3_client.download_file(object_key, temp_path)
            logger.info("Downloaded file", document_id=document_id, temp_path=temp_path)

            # Parse document
            parser = get_parser(mime_type)
            text = parser.parse(temp_path)
            logger.info("Parsed document", document_id=document_id, text_length=len(text))

            if not text or not text.strip():
                logger.warning("Document has no text content", document_id=document_id)
                return True

            # Chunk text
            chunker = SemanticChunker(
                model=config.embedding_model,
                max_chunk_size=config.max_chunk_size,
            )
            chunks = chunker.chunk(text)
            logger.info("Chunked document", document_id=document_id, chunk_count=len(chunks))

            # Enqueue embedding jobs
            enqueue_embedding_jobs(
                document_id=document_id,
                project_id=project_id,
                chunks=chunks,
                filename=filename,
            )

            logger.info(
                "Document processing complete",
                document_id=document_id,
                chunk_count=len(chunks),
            )
            return True

        finally:
            # Cleanup temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    except Exception as e:
        logger.error("Failed to process document", error=str(e), event_data=event_data)
        raise
