"""Document Processor Service - Redis Streams Worker."""

import os
import sys
import time
from dataclasses import dataclass, field

import structlog
from redis import Redis

from src.processor import process_document

logger = structlog.get_logger()


@dataclass
class WorkerStatus:
    """Worker status for health checks."""
    is_running: bool = False
    messages_processed: int = 0
    last_error: str = ""


def create_consumer_group(redis_client: Redis, stream_key: str, group_name: str) -> None:
    """Create consumer group if it doesn't exist."""
    try:
        redis_client.xgroup_create(stream_key, group_name, id="0", mkstream=True)
        logger.info("Created consumer group", group_name=group_name, stream_key=stream_key)
    except Exception as e:
        if "BUSYGROUP" in str(e):
            logger.info("Consumer group already exists", group_name=group_name)
        else:
            raise


def process_stream_messages(redis_client: Redis, stream_key: str, group_name: str, consumer_name: str, status: WorkerStatus) -> None:
    """Process messages from Redis Stream using consumer groups."""
    while True:
        try:
            # Read messages from stream using consumer group
            messages = redis_client.xreadgroup(
                groupname=group_name,
                consumername=consumer_name,
                streams={stream_key: ">"},
                block=5000,
                count=1,
            )

            if not messages:
                continue

            for stream_name, stream_messages in messages:
                for message_id, fields in stream_messages:
                    try:
                        # Convert fields dict to event dict
                        event_data = {k.decode() if isinstance(k, bytes) else k: 
                                      v.decode() if isinstance(v, bytes) else v 
                                      for k, v in fields.items()}

                        logger.info(
                            "Processing message",
                            message_id=message_id.decode() if isinstance(message_id, bytes) else message_id,
                            document_id=event_data.get("documentId"),
                        )

                        # Process the document
                        process_document(event_data)
                        status.messages_processed += 1

                        # Acknowledge message (remove from pending)
                        redis_client.xack(stream_key, group_name, message_id)
                        logger.info("Message acknowledged", message_id=message_id)

                    except Exception as e:
                        logger.error(
                            "Failed to process message",
                            message_id=message_id,
                            error=str(e),
                        )
                        status.last_error = str(e)
                        # Message will remain in pending list and be retried

        except Exception as e:
            logger.error("Error reading from stream", error=str(e))
            status.last_error = str(e)
            time.sleep(5)  # Wait before retrying


def start_worker(config, status: WorkerStatus = None) -> None:
    """Start the document processor worker."""
    from src.config import Config
    
    if status is None:
        status = WorkerStatus()
    
    if isinstance(config, dict):
        config = Config(**config)
    
    redis_client = Redis.from_url(config.redis_url, decode_responses=False)
    
    # Unique consumer name (hostname + pid)
    consumer_name = f"worker-{os.uname().nodename}-{os.getpid()}"
    group_name = "document-processors"

    logger.info(
        "Starting Document Processor worker",
        redis_url=config.redis_url,
        stream_key=config.stream_key,
        group_name=group_name,
        consumer_name=consumer_name,
    )

    # Create consumer group if it doesn't exist
    create_consumer_group(redis_client, config.stream_key, group_name)
    
    status.is_running = True

    try:
        process_stream_messages(redis_client, config.stream_key, group_name, consumer_name, status)
    except KeyboardInterrupt:
        logger.info("Worker stopped by user")
        status.is_running = False
        redis_client.close()
        sys.exit(0)
    except Exception as e:
        logger.error("Worker crashed", error=str(e))
        status.is_running = False
        status.last_error = str(e)
        redis_client.close()
        sys.exit(1)
