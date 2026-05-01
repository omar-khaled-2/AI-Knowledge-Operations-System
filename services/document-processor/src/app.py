"""Document Processor Service - FastAPI Application."""

import os
import sys
import threading
import time
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, status
from pydantic import BaseModel

from src.config import Config
from src.worker import start_worker, WorkerStatus

logger = structlog.get_logger()

# Global worker status
worker_status = WorkerStatus()


class HealthResponse(BaseModel):
    status: str
    worker_running: bool


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start worker in background thread on startup."""
    config = Config.from_env()
    
    structlog.configure(
        wrapper_class=structlog.make_filtering_bound_logger(getattr(__import__("logging"), config.log_level)),
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
    )
    
    logger.info("Starting Document Processor service")
    
    # Start worker in background thread
    worker_thread = threading.Thread(
        target=start_worker,
        args=(config, worker_status),
        daemon=True,
    )
    worker_thread.start()
    
    # Wait a bit for worker to initialize
    time.sleep(2)
    
    yield
    
    logger.info("Shutting down Document Processor service")


app = FastAPI(
    title="Document Processor",
    description="Document processing worker for vector ingestion pipeline",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Liveness probe - returns 200 if service is running."""
    return HealthResponse(
        status="healthy",
        worker_running=worker_status.is_running,
    )


@app.get("/ready", response_model=HealthResponse)
async def readiness_check():
    """Readiness probe - returns 200 if worker is ready to process."""
    if not worker_status.is_running:
        return HealthResponse(
            status="not_ready",
            worker_running=False,
        )
    
    return HealthResponse(
        status="ready",
        worker_running=True,
    )


@app.get("/")
async def root():
    """Service info endpoint."""
    return {
        "service": "document-processor",
        "version": "1.0.0",
        "worker_running": worker_status.is_running,
    }
