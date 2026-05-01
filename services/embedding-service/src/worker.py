"""Embedding Service - RQ Worker."""

import os
import sys
import time
from dataclasses import dataclass, field

import structlog
from redis import Redis
from rq import Queue, Worker

from src.config import Config
from src.jobs import embed_chunk

logger = structlog.get_logger()


@dataclass
class WorkerStatus:
    """Worker status for health checks."""
    is_running: bool = False
    messages_processed: int = 0
    last_error: str = ""


def start_worker(config, status: WorkerStatus = None) -> None:
    """Start the embedding service worker.

    Args:
        config: Service configuration.
        status: Worker status tracker.
    """
    if status is None:
        status = WorkerStatus()

    redis_conn = Redis.from_url(config.redis_url)
    queue = Queue(config.queue_name, connection=redis_conn)

    logger.info(
        "Starting Embedding Service worker",
        redis_url=config.redis_url,
        queue_name=config.queue_name,
    )

    status.is_running = True

    try:
        worker = Worker([queue], connection=redis_conn)
        worker.work()
    except KeyboardInterrupt:
        logger.info("Worker stopped by user")
        status.is_running = False
        sys.exit(0)
    except Exception as e:
        logger.error("Worker crashed", error=str(e))
        status.is_running = False
        status.last_error = str(e)
        sys.exit(1)
