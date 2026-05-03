"""Retrieval Service - FastAPI Application."""

import logging
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse

from src.config import Config
from src.models import ErrorResponse, SearchRequest, SearchResponse
from src.search import SearchService

logger = structlog.get_logger()


def safe_truncate(text: str, max_length: int) -> str:
    """Safely truncate text to max_length without splitting multi-byte characters."""
    if len(text) <= max_length:
        return text
    return text[:max_length]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Configure logging and initialize services on startup."""
    config = Config.from_env()
    app.state.config = config

    structlog.configure(
        wrapper_class=structlog.make_filtering_bound_logger(getattr(logging, config.log_level)),
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
    )

    app.state.search_service = SearchService(config)
    
    # Ensure Qdrant collection exists with hybrid support
    app.state.search_service.qdrant_client.ensure_collection()

    logger.info("Starting Retrieval Service")

    yield

    logger.info("Shutting down Retrieval Service")

    # Graceful cleanup of clients
    try:
        if hasattr(app.state.search_service, "openai_client"):
            app.state.search_service.openai_client.close()
    except Exception as e:
        logger.warning("Failed to close OpenAI client", error=str(e))

    try:
        if hasattr(app.state.search_service, "qdrant_client"):
            app.state.search_service.qdrant_client.close()
    except Exception as e:
        logger.warning("Failed to close Qdrant client", error=str(e))


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
    if app.state.search_service.qdrant_client.health_check():
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
    logger.info(
        "Search request received",
        query=safe_truncate(request.query, 100),
        project_id=request.project_id,
        limit=request.limit,
        score_threshold=request.score_threshold,
        has_filters=request.filters is not None,
    )
    try:
        response = await app.state.search_service.search(request)
        logger.info(
            "Search request completed",
            query=safe_truncate(request.query, 50),
            results_count=len(response.results),
            total=response.total,
        )
        return response
    except ValueError as e:
        logger.warning(
            "Invalid filters",
            error=str(e),
            query=safe_truncate(request.query, 50),
        )
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=ErrorResponse(
                detail="Invalid filters provided",
                code="INVALID_FILTERS",
            ).model_dump(),
        )
    except Exception as e:
        error_module = type(e).__module__
        error_type = type(e).__name__

        # OpenAI errors
        if "openai" in error_module:
            logger.error(
                "Embedding failed",
                error=str(e),
                query=safe_truncate(request.query, 50),
            )
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content=ErrorResponse(
                    detail="Embedding generation failed",
                    code="EMBEDDING_FAILED",
                ).model_dump(),
            )

        # Connection errors (Qdrant unreachable)
        if any(conn in error_type for conn in ("ConnectionError", "ConnectTimeout", "MaxRetryError")):
            logger.error(
                "Qdrant unreachable",
                error=str(e),
                query=safe_truncate(request.query, 50),
            )
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content=ErrorResponse(
                    detail="Vector database unavailable",
                    code="SERVICE_UNAVAILABLE",
                ).model_dump(),
            )

        # Qdrant or other errors
        logger.error(
            "Search failed",
            error=str(e),
            query=safe_truncate(request.query, 50),
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorResponse(
                detail="Search operation failed",
                code="SEARCH_FAILED",
            ).model_dump(),
        )
