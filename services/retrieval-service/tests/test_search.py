"""Tests for search orchestration."""

import pytest
from unittest.mock import MagicMock, Mock, patch

from src.models import FilterCondition, SearchFilters, SearchRequest
from src.search import SearchService


class TestSearchService:
    @pytest.mark.asyncio
    async def test_search_success(self, test_config):
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

        mock_sparse = Mock()
        mock_sparse.embed.return_value = Mock(indices=[], values=[])
        
        service = SearchService(
            test_config,
            openai_client=mock_openai,
            qdrant_client=mock_qdrant,
            sparse_model=mock_sparse,
        )

        request = SearchRequest(query="test query", limit=5)
        response = await service.search(request)

        assert response.total == 1
        assert len(response.results) == 1
        assert response.results[0].chunk_id == "chunk-1"
        assert response.results[0].content == "test content"
        assert response.results[0].document_id == "doc-1"
        assert response.results[0].score == 0.95
        assert response.results[0].metadata["project_id"] == "proj-1"

        mock_openai.embed.assert_called_once_with("test query")
        mock_qdrant.search.assert_called_once()

    @pytest.mark.asyncio
    async def test_search_with_filters(self, test_config):
        mock_openai = Mock()
        mock_openai.embed.return_value = [0.1] * 384

        mock_qdrant = Mock()
        mock_qdrant.search.return_value = []

        mock_sparse = Mock()
        mock_sparse.embed.return_value = Mock(indices=[], values=[])
        
        service = SearchService(
            test_config,
            openai_client=mock_openai,
            qdrant_client=mock_qdrant,
            sparse_model=mock_sparse,
        )

        request = SearchRequest(
            query="test query",
            filters=SearchFilters(
                must=[FilterCondition(key="project_id", match="123")]
            ),
            limit=10,
        )
        response = await service.search(request)

        assert response.total == 0
        assert len(response.results) == 0

        # Verify Qdrant search was called with filter
        call_args = mock_qdrant.search.call_args
        assert call_args.kwargs['filter_obj'] is not None

    @pytest.mark.asyncio
    async def test_search_empty_results(self, test_config):
        mock_openai = Mock()
        mock_openai.embed.return_value = [0.1] * 384

        mock_qdrant = Mock()
        mock_qdrant.search.return_value = []

        mock_sparse = Mock()
        mock_sparse.embed.return_value = Mock(indices=[], values=[])
        
        service = SearchService(
            test_config,
            openai_client=mock_openai,
            qdrant_client=mock_qdrant,
            sparse_model=mock_sparse,
        )

        request = SearchRequest(query="test query")
        response = await service.search(request)

        assert response.total == 0
        assert len(response.results) == 0

    @pytest.mark.asyncio
    async def test_search_offset_and_score_threshold(self, test_config):
        mock_openai = Mock()
        mock_openai.embed.return_value = [0.1] * 384

        mock_qdrant = Mock()
        mock_qdrant.search.return_value = []

        mock_sparse = Mock()
        mock_sparse.embed.return_value = Mock(indices=[], values=[])
        
        service = SearchService(
            test_config,
            openai_client=mock_openai,
            qdrant_client=mock_qdrant,
            sparse_model=mock_sparse,
        )

        request = SearchRequest(
            query="test query",
            limit=5,
            offset=10,
            score_threshold=0.5,
        )
        response = await service.search(request)

        assert response.total == 0
        call_args = mock_qdrant.search.call_args
        assert call_args.kwargs["offset"] == 10
        assert call_args.kwargs["score_threshold"] == 0.5

    @pytest.mark.asyncio
    async def test_search_embedding_error(self, test_config):
        mock_openai = Mock()
        mock_openai.embed.side_effect = Exception("OpenAI API Error")

        mock_sparse = Mock()
        mock_sparse.embed.return_value = Mock(indices=[], values=[])
        
        service = SearchService(
            test_config,
            openai_client=mock_openai,
            sparse_model=mock_sparse,
        )

        request = SearchRequest(query="test query")

        with pytest.raises(Exception, match="OpenAI API Error"):
            await service.search(request)

    @pytest.mark.asyncio
    async def test_search_qdrant_error(self, test_config):
        mock_openai = Mock()
        mock_openai.embed.return_value = [0.1] * 384

        mock_qdrant = Mock()
        mock_qdrant.search.side_effect = Exception("Qdrant Error")

        mock_sparse = Mock()
        mock_sparse.embed.return_value = Mock(indices=[], values=[])
        
        service = SearchService(
            test_config,
            openai_client=mock_openai,
            qdrant_client=mock_qdrant,
            sparse_model=mock_sparse,
        )

        request = SearchRequest(query="test query")

        with pytest.raises(Exception, match="Qdrant Error"):
            await service.search(request)

    @pytest.mark.asyncio
    async def test_result_mapping(self, test_config):
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

        mock_sparse = Mock()
        mock_sparse.embed.return_value = Mock(indices=[], values=[])
        
        service = SearchService(
            test_config,
            openai_client=mock_openai,
            qdrant_client=mock_qdrant,
            sparse_model=mock_sparse,
        )

        request = SearchRequest(query="test")
        response = await service.search(request)

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

    @pytest.mark.asyncio
    @patch("src.search.asyncio.to_thread")
    @patch("src.search.SparseEmbeddingModel")
    async def test_search_service_hybrid(self, mock_sparse_model, mock_to_thread, test_config):
        """SearchService should use hybrid search."""
        mock_qdrant = Mock()
        mock_qdrant.search.return_value = [
            {"id": "chunk-1", "score": 0.72, "payload": {"text": "Backend Engineer", "document_id": "doc-1", "project_id": "proj-1"}}
        ]
        
        mock_openai = Mock()
        mock_openai.embed.return_value = [0.1, 0.2, 0.3]
        
        mock_sparse = Mock()
        mock_sparse.embed.return_value = MagicMock(indices=[], values=[])
        mock_sparse_model.return_value = mock_sparse
        
        service = SearchService(test_config, openai_client=mock_openai, qdrant_client=mock_qdrant)
        
        request = SearchRequest(query="what is my job", project_id="proj-1")
        response = await service.search(request)
        
        assert len(response.results) == 1
        assert response.results[0].score == 0.72
        mock_qdrant.search.assert_called_once()
        
        # Verify hybrid parameters
        call_kwargs = mock_qdrant.search.call_args[1]
        assert "dense_vector" in call_kwargs
        assert "sparse_vector" in call_kwargs
