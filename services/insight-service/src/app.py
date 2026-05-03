import os
import sys
import threading
import time
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from pydantic import BaseModel

from src.config import Config
from src.worker import start_worker, WorkerStatus

logger = structlog.get_logger()
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

    logger.info("Starting Insight Service")

    worker_thread = threading.Thread(
        target=start_worker,
        args=(config, worker_status),
        daemon=True,
    )
    worker_thread.start()
    time.sleep(2)

    yield

    logger.info("Shutting down Insight Service")

app = FastAPI(
    title="Insight Service",
    description="AI-powered insight generation for uploaded documents",
    version="1.0.0",
    lifespan=lifespan,
)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        worker_running=worker_status.is_running,
    )

@app.get("/ready", response_model=HealthResponse)
async def readiness_check():
    if not worker_status.is_running:
        return HealthResponse(status="not_ready", worker_running=False)
    return HealthResponse(status="ready", worker_running=True)

@app.get("/")
async def root():
    return {
        "service": "insight-service",
        "version": "1.0.0",
        "worker_running": worker_status.is_running,
    }
