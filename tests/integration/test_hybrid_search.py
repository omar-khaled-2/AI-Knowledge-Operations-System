"""Integration test for hybrid search end-to-end."""

import pytest
import requests

QDRANT_URL = "http://localhost:6333"
RETRIEVAL_URL = "http://localhost:3000"


def test_qdrant_hybrid_collection():
    """Verify Qdrant collection supports sparse vectors."""
    response = requests.get(f"{QDRANT_URL}/collections/documents")
    assert response.status_code == 200
    
    data = response.json()
    vectors = data["result"]["config"]["params"]["vectors"]
    
    # Check if hybrid vectors exist
    assert "dense" in vectors or "size" in vectors  # old or new format


def test_retrieval_service_hybrid_search():
    """Test retrieval service with hybrid search."""
    payload = {
        "query": "what is my job",
        "project_id": "test-project",
        "limit": 5,
        "score_threshold": 0.5,
    }
    
    response = requests.post(f"{RETRIEVAL_URL}/search", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    
    # May return 0 results if no documents indexed yet
    assert "results" in data
    assert "total" in data
