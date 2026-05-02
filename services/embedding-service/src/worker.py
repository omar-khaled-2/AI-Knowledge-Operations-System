"""Embedding Service - RabbitMQ Consumer."""

import json
import sys
from dataclasses import dataclass

import pika
import structlog

from src.config import Config
from src.jobs import embed_chunk

logger = structlog.get_logger()


@dataclass
class WorkerStatus:
    """Worker status for health checks."""
    is_running: bool = False
    messages_processed: int = 0
    last_error: str = ""


class EmbeddingConsumer:
    """RabbitMQ consumer for embedding jobs."""

    def __init__(self, config: Config, status: WorkerStatus):
        self.config = config
        self.status = status
        self.connection = None
        self.channel = None

    def connect(self):
        """Establish connection to RabbitMQ."""
        params = pika.URLParameters(self.config.rabbitmq_url)
        params.heartbeat = 600
        params.blocked_connection_timeout = 300

        self.connection = pika.BlockingConnection(params)
        self.channel = self.connection.channel()

        # Declare exchange
        self.channel.exchange_declare(
            exchange=self.config.rabbitmq_exchange,
            exchange_type='topic',
            durable=True,
        )

        # Declare queue
        self.channel.queue_declare(
            queue=self.config.rabbitmq_queue,
            durable=True,
        )

        # Bind queue to exchange
        self.channel.queue_bind(
            queue=self.config.rabbitmq_queue,
            exchange=self.config.rabbitmq_exchange,
            routing_key=self.config.rabbitmq_routing_key,
        )

        # Set QoS - prefetch 1 message at a time
        self.channel.basic_qos(prefetch_count=1)

        logger.info(
            "Connected to RabbitMQ",
            url=self.config.rabbitmq_url,
            exchange=self.config.rabbitmq_exchange,
            queue=self.config.rabbitmq_queue,
        )

    def process_message(self, ch, method, properties, body):
        """Process incoming message."""
        try:
            chunk_data = json.loads(body.decode('utf-8'))
            chunk_id = chunk_data.get("chunk_id")

            logger.info(
                "Processing embedding job",
                chunk_id=chunk_id,
                delivery_tag=method.delivery_tag,
            )

            # Embed the chunk
            embed_chunk(chunk_data)
            self.status.messages_processed += 1

            # Acknowledge message
            ch.basic_ack(delivery_tag=method.delivery_tag)

            logger.info(
                "Chunk embedded successfully",
                chunk_id=chunk_id,
            )

        except Exception as e:
            logger.error(
                "Failed to embed chunk",
                error=str(e),
                delivery_tag=method.delivery_tag,
            )
            self.status.last_error = str(e)
            # Reject message without requeue (no retries for MVP)
            ch.basic_reject(delivery_tag=method.delivery_tag, requeue=False)

    def start(self):
        """Start consuming messages."""
        self.connect()

        self.channel.basic_consume(
            queue=self.config.rabbitmq_queue,
            on_message_callback=self.process_message,
        )

        self.status.is_running = True

        logger.info(
            "Started consuming messages",
            queue=self.config.rabbitmq_queue,
        )

        try:
            self.channel.start_consuming()
        except KeyboardInterrupt:
            logger.info("Consumer stopped by user")
            self.stop()
        except Exception as e:
            logger.error("Consumer crashed", error=str(e))
            self.status.last_error = str(e)
            self.stop()
            sys.exit(1)

    def stop(self):
        """Stop the consumer."""
        self.status.is_running = False
        if self.channel and self.channel.is_open:
            self.channel.stop_consuming()
        if self.connection and self.connection.is_open:
            self.connection.close()


def start_worker(config, status: WorkerStatus = None) -> None:
    """Start the embedding service worker."""
    if status is None:
        status = WorkerStatus()

    consumer = EmbeddingConsumer(config, status)

    logger.info(
        "Starting Embedding Service worker",
        rabbitmq_url=config.rabbitmq_url,
        queue=config.rabbitmq_queue,
    )

    consumer.start()
