"""Retrieval Service - FastAPI Application."""

import logging
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse

from src.config import Config
from src.models import SearchRequest, SearchResponse
from src.search import SearchService

logger = structlog.get_logger()

# Global search service instance
search_service: SearchService = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Configure logging on startup."""
    config = Config.from_env()

    structlog.configure(
        wrapper_class=structlog.make_filtering_bound_logger(getattr(logging, config.log_level)),
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
    )

    logger.info("Starting Retrieval Service")

    yield

    logger.info("Shutting down Retrieval Service")


app = FastAPI(
    title="Retrieval Service",
    description="Semantic search over vector database",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health_check():
    """Liveness probe - returns 200 if service is running."""
    return {"status": "healthy"}


@app.get("/ready")
async def readiness_check():
    """Readiness probe - returns 200 if Qdrant is accessible."""
    config = Config.from_env()
    service = SearchService(config)

    if service.qdrant_client.health_check():
        return {
            "status": "ready",
            "qdrant_connected": True,
        }

    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "not_ready",
            "qdrant_connected": False,
        },
    )


@app.get("/")
async def root():
    """Service info endpoint."""
    return {
        "service": "retrieval-service",
        "version": "1.0.0",
        "description": "Semantic search over vector database",
    }


@app.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """Perform semantic search with optional metadata filters.

    Args:
        request: Search query with filters.

    Returns:
        Search results with timing metadata.
    """
    config = Config.from_env()
    service = SearchService(config)

    try:
        response = service.search(request)
        return response
    except Exception as e:
        logger.error("Search failed", error=str(e), query=request.query[:50])
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
