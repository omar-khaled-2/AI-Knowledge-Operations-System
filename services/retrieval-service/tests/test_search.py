"""Tests for search orchestration."""

from unittest.mock import Mock, patch

import pytest

from src.models import SearchFilters, FilterCondition, SearchRequest
from src.search import SearchService


class TestSearchService:
    def test_search_success(self, test_config):
        # Mock OpenAI client
        mock_openai = Mock()
        mock_openai.embed.return_value = [0.1] * 384

        # Mock Qdrant client
        mock_qdrant = Mock()
        mock_qdrant.search.return_value = [
            {
                "id": "chunk-1",
                "score": 0.95,
                "payload": {
                    "text": "test content",
                    "document_id": "doc-1",
                    "project_id": "proj-1",
                    "chunk_index": 0,
                    "filename": "test.pdf",
                },
            }
        ]

        service = SearchService(
            test_config,
            openai_client=mock_openai,
            qdrant_client=mock_qdrant,
        )

        request = SearchRequest(query="test query", limit=5)
        response = service.search(request)

        assert response.total == 1
        assert len(response.results) == 1
        assert response.results[0].chunk_id == "chunk-1"
        assert response.results[0].content == "test content"
        assert response.results[0].document_id == "doc-1"
        assert response.results[0].score == 0.95
        assert response.results[0].metadata["project_id"] == "proj-1"

        mock_openai.embed.assert_called_once_with("test query")
        mock_qdrant.search.assert_called_once()

    def test_search_with_filters(self, test_config):
        mock_openai = Mock()
        mock_openai.embed.return_value = [0.1] * 384

        mock_qdrant = Mock()
        mock_qdrant.search.return_value = []

        service = SearchService(
            test_config,
            openai_client=mock_openai,
            qdrant_client=mock_qdrant,
        )

        request = SearchRequest(
            query="test query",
            filters=SearchFilters(
                must=[FilterCondition(key="project_id", match="123")]
            ),
            limit=10,
        )
        response = service.search(request)

        assert response.total == 0
        assert len(response.results) == 0

        # Verify Qdrant search was called with filter
        call_args = mock_qdrant.search.call_args
        assert call_args.kwargs['filter_obj'] is not None

    def test_search_empty_results(self, test_config):
        mock_openai = Mock()
        mock_openai.embed.return_value = [0.1] * 384

        mock_qdrant = Mock()
        mock_qdrant.search.return_value = []

        service = SearchService(
            test_config,
            openai_client=mock_openai,
            qdrant_client=mock_qdrant,
        )

        request = SearchRequest(query="test query")
        response = service.search(request)

        assert response.total == 0
        assert len(response.results) == 0

    def test_search_offset_and_score_threshold(self, test_config):
        mock_openai = Mock()
        mock_openai.embed.return_value = [0.1] * 384

        mock_qdrant = Mock()
        mock_qdrant.search.return_value = []

        service = SearchService(
            test_config,
            openai_client=mock_openai,
            qdrant_client=mock_qdrant,
        )

        request = SearchRequest(
            query="test query",
            limit=5,
            offset=10,
            score_threshold=0.5,
        )
        response = service.search(request)

        assert response.total == 0
        call_args = mock_qdrant.search.call_args
        assert call_args.kwargs["offset"] == 10
        assert call_args.kwargs["score_threshold"] == 0.5

    def test_search_embedding_error(self, test_config):
        mock_openai = Mock()
        mock_openai.embed.side_effect = Exception("OpenAI API Error")

        service = SearchService(
            test_config,
            openai_client=mock_openai,
        )

        request = SearchRequest(query="test query")

        with pytest.raises(Exception, match="OpenAI API Error"):
            service.search(request)

    def test_search_qdrant_error(self, test_config):
        mock_openai = Mock()
        mock_openai.embed.return_value = [0.1] * 384

        mock_qdrant = Mock()
        mock_qdrant.search.side_effect = Exception("Qdrant Error")

        service = SearchService(
            test_config,
            openai_client=mock_openai,
            qdrant_client=mock_qdrant,
        )

        request = SearchRequest(query="test query")

        with pytest.raises(Exception, match="Qdrant Error"):
            service.search(request)

    def test_result_mapping(self, test_config):
        """Test that Qdrant payload is correctly mapped to response schema."""
        mock_openai = Mock()
        mock_openai.embed.return_value = [0.1] * 384

        mock_qdrant = Mock()
        mock_qdrant.search.return_value = [
            {
                "id": "chunk-1",
                "score": 0.88,
                "payload": {
                    "text": "content text",
                    "document_id": "doc-1",
                    "project_id": "proj-1",
                    "chunk_index": 5,
                    "filename": "file.pdf",
                    "custom_field": "custom_value",
                },
            }
        ]

        service = SearchService(
            test_config,
            openai_client=mock_openai,
            qdrant_client=mock_qdrant,
        )

        request = SearchRequest(query="test")
        response = service.search(request)

        result = response.results[0]
        assert result.chunk_id == "chunk-1"
        assert result.content == "content text"
        assert result.document_id == "doc-1"
        assert result.score == 0.88
        # Additional payload fields should be in metadata
        assert result.metadata["project_id"] == "proj-1"
        assert result.metadata["chunk_index"] == 5
        assert result.metadata["filename"] == "file.pdf"
        assert result.metadata["custom_field"] == "custom_value"
