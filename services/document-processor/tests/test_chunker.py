import pytest
from unittest.mock import Mock, patch
from src.chunker import SemanticChunker, cosine_similarity, split_sentences


def test_cosine_similarity():
    a = [1.0, 0.0, 0.0]
    b = [1.0, 0.0, 0.0]
    assert cosine_similarity(a, b) == pytest.approx(1.0)

    c = [0.0, 1.0, 0.0]
    assert cosine_similarity(a, c) == pytest.approx(0.0)


def test_split_sentences():
    text = "First sentence. Second sentence! Third one?"
    sentences = split_sentences(text)
    assert len(sentences) == 3
    assert "First sentence" in sentences[0]
    assert "Second sentence" in sentences[1]
    assert "Third one" in sentences[2]


def test_chunker_with_mock():
    mock_response = Mock()
    mock_response.data = [
        Mock(embedding=[1.0, 0.0, 0.0]),
        Mock(embedding=[0.9, 0.1, 0.0]),
        Mock(embedding=[0.1, 0.9, 0.0]),
        Mock(embedding=[0.0, 1.0, 0.0]),
    ]

    with patch("src.chunker.OpenAI") as mock_openai_class:
        mock_client = Mock()
        mock_client.embeddings.create.return_value = mock_response
        mock_openai_class.return_value = mock_client

        chunker = SemanticChunker(api_key="test-key", model="text-embedding-3-small")
        text = "This is about AI. AI is interesting. Now about cooking. Cooking is fun."
        chunks = chunker.chunk(text)

        assert isinstance(chunks, list)
        assert len(chunks) > 0
        assert all(isinstance(c, str) for c in chunks)
        mock_client.embeddings.create.assert_called_once()


def test_chunker_preserves_content():
    mock_response = Mock()
    mock_response.data = [
        Mock(embedding=[1.0, 0.0]),
        Mock(embedding=[1.0, 0.0]),
    ]

    with patch("src.chunker.OpenAI") as mock_openai_class:
        mock_client = Mock()
        mock_client.embeddings.create.return_value = mock_response
        mock_openai_class.return_value = mock_client

        chunker = SemanticChunker(api_key="test-key")
        text = "Hello world. This is a test."
        chunks = chunker.chunk(text)

        combined = " ".join(chunks)
        assert "Hello" in combined
        assert "test" in combined


def test_chunker_empty_text():
    chunker = SemanticChunker(api_key="test-key")
    assert chunker.chunk("") == []
    assert chunker.chunk("   ") == []
