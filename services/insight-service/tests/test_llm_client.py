import pytest
from unittest.mock import Mock, patch
from src.services.llm_client import LLMClient


@pytest.fixture
def mock_config():
    return Mock(
        openai_api_key="test-key",
        openai_model="gpt-4o-mini",
    )


def test_generate_insights_returns_list(mock_config):
    with patch('src.services.llm_client.OpenAI') as mock_openai_class:
        mock_client = Mock()
        mock_response = Mock()
        mock_choice = Mock()
        mock_choice.message.content = '''
        {
          "insights": [
            {
              "type": "action-item",
              "title": "Test action",
              "description": "Test description",
              "confidence": 0.92,
              "relatedDocuments": ["doc-123"]
            }
          ]
        }
        '''
        mock_response.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_response
        mock_openai_class.return_value = mock_client

        llm = LLMClient(mock_config)
        result = llm.generate_insights("test content", "similar docs")

        assert isinstance(result, list)
        assert len(result) == 1
        assert result[0]["type"] == "action-item"
        assert result[0]["confidence"] == 0.92
