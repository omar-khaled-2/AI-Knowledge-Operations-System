import json
import os
import sys
from dataclasses import dataclass

import pika
import structlog

from src.config import Config
from src.services.llm_client import LLMClient
from src.services.qdrant_client import QdrantInsightClient
from src.services.backend_client import BackendClient

logger = structlog.get_logger()

@dataclass
class WorkerStatus:
    """Worker status for health checks."""
    is_running: bool = False
    messages_processed: int = 0
    last_error: str = ""

class InsightWorker:
    """RabbitMQ consumer for insight generation jobs."""

    def __init__(self, config: Config, status: WorkerStatus):
        self.config = config
        self.status = status
        self.llm = LLMClient(config)
        self.qdrant = QdrantInsightClient(config.qdrant_url, config.qdrant_collection)
        self.backend = BackendClient(config.backend_url)
        self.connection = None
        self.channel = None

    def connect(self):
        """Establish connection to RabbitMQ."""
        params = pika.URLParameters(self.config.rabbitmq_url)
        params.heartbeat = 600
        params.blocked_connection_timeout = 300

        self.connection = pika.BlockingConnection(params)
        self.channel = self.connection.channel()

        self.channel.exchange_declare(
            exchange=self.config.rabbitmq_exchange,
            exchange_type='topic',
            durable=True,
        )

        self.channel.queue_declare(
            queue=self.config.rabbitmq_queue,
            durable=True,
        )

        self.channel.queue_bind(
            queue=self.config.rabbitmq_queue,
            exchange=self.config.rabbitmq_exchange,
            routing_key=self.config.rabbitmq_routing_key,
        )

        self.channel.basic_qos(prefetch_count=1)

        logger.info(
            "Connected to RabbitMQ",
            exchange=self.config.rabbitmq_exchange,
            queue=self.config.rabbitmq_queue,
        )

    def process_message(self, ch, method, properties, body):
        """Process incoming document.embedded event."""
        try:
            event = json.loads(body.decode('utf-8'))
            document_id = event.get('documentId')
            project_id = event.get('projectId')

            logger.info(
                "Processing document for insights",
                document_id=document_id,
                project_id=project_id,
            )

            # Step 1: Get document chunks
            chunks = self.qdrant.get_document_chunks(document_id)
            document_text = "\n".join(chunks)

            # Step 2: Generate insights via LLM (document only for MVP)
            # TODO: Add cross-document similarity search once embedding service is available
            insights = self.llm.generate_insights(document_text, "")

            # Step 3: Save to backend
            if insights:
                self.backend.save_insights(project_id, document_id, insights)
                logger.info(
                    "Insights generated and saved",
                    document_id=document_id,
                    count=len(insights),
                )

            ch.basic_ack(delivery_tag=method.delivery_tag)
            self.status.messages_processed += 1

        except Exception as e:
            logger.error(
                "Failed to process document",
                error=str(e),
                document_id=event.get('documentId'),
            )
            self.status.last_error = str(e)
            ch.basic_reject(delivery_tag=method.delivery_tag, requeue=False)

    def start(self):
        """Start consuming messages."""
        self.connect()

        self.channel.basic_consume(
            queue=self.config.rabbitmq_queue,
            on_message_callback=self.process_message,
        )

        self.status.is_running = True
        logger.info("Started consuming insight jobs")

        try:
            self.channel.start_consuming()
        except KeyboardInterrupt:
            logger.info("Worker stopped by user")
            self.stop()
        except Exception as e:
            logger.error("Worker crashed", error=str(e))
            self.status.last_error = str(e)
            self.stop()
            sys.exit(1)

    def stop(self):
        """Stop the worker."""
        self.status.is_running = False
        if self.channel and self.channel.is_open:
            self.channel.stop_consuming()
        if self.connection and self.connection.is_open:
            self.connection.close()


def start_worker(config, status: WorkerStatus = None) -> None:
    """Start the insight worker."""
    if status is None:
        status = WorkerStatus()

    worker = InsightWorker(config, status)
    logger.info("Starting Insight Service worker")
    worker.start()
