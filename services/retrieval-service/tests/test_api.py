"""Tests for FastAPI application endpoints."""

from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient

from src.app import app
from src.models import SearchResponse, SearchResult


class TestHealthEndpoints:
    def test_health_endpoint(self):
        client = TestClient(app)
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_ready_endpoint_success(self):
        mock_service = Mock()
        mock_service.qdrant_client.health_check.return_value = True
        app.state.search_service = mock_service

        try:
            client = TestClient(app)
            response = client.get("/ready")
            assert response.status_code == 200
            assert response.json()["status"] == "ready"
            assert response.json()["qdrant_connected"] is True
        finally:
            delattr(app.state, "search_service")

    def test_ready_endpoint_failure(self):
        mock_service = Mock()
        mock_service.qdrant_client.health_check.return_value = False
        app.state.search_service = mock_service

        try:
            client = TestClient(app)
            response = client.get("/ready")
            assert response.status_code == 503
            assert response.json()["status"] == "not_ready"
            assert response.json()["qdrant_connected"] is False
        finally:
            delattr(app.state, "search_service")

    def test_root_endpoint(self):
        client = TestClient(app)
        response = client.get("/")
        assert response.status_code == 200
        assert response.json()["service"] == "retrieval-service"


class TestSearchEndpoint:
    def test_search_success(self):
        mock_service = Mock()
        mock_response = SearchResponse(
            results=[
                SearchResult(
                    chunk_id="chunk-1",
                    document_id="doc-1",
                    content="test content",
                    score=0.95,
                    metadata={"project_id": "123"},
                )
            ],
            total=1,
            query_embedding_time_ms=100,
            search_time_ms=10,
        )
        mock_service.search.return_value = mock_response
        app.state.search_service = mock_service

        try:
            client = TestClient(app)
            response = client.post("/search", json={"query": "test query"})
            
            assert response.status_code == 200
            data = response.json()
            assert data["total"] == 1
            assert len(data["results"]) == 1
            assert data["results"][0]["chunk_id"] == "chunk-1"
        finally:
            delattr(app.state, "search_service")

    def test_search_with_filters(self):
        mock_service = Mock()
        mock_response = SearchResponse(
            results=[],
            total=0,
            query_embedding_time_ms=50,
            search_time_ms=5,
        )
        mock_service.search.return_value = mock_response
        app.state.search_service = mock_service

        try:
            client = TestClient(app)
            response = client.post("/search", json={
                "query": "test query",
                "filters": {
                    "must": [
                        {"key": "project_id", "match": "123"}
                    ]
                },
                "limit": 5,
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["total"] == 0
        finally:
            delattr(app.state, "search_service")

    def test_search_validation_error(self):
        client = TestClient(app)
        response = client.post("/search", json={"query": "", "limit": 0})
        
        assert response.status_code == 422

    def test_search_service_error(self):
        mock_service = Mock()
        mock_service.search.side_effect = Exception("Search failed")
        app.state.search_service = mock_service

        try:
            client = TestClient(app)
            response = client.post("/search", json={"query": "test query"})
            
            assert response.status_code == 500
            assert "Search failed" in response.json()["detail"]
        finally:
            delattr(app.state, "search_service")
