# Hybrid Search Design Document

**Date:** 2026-05-03  
**Status:** Draft  
**Author:** AI-Knowledge-Operations-System Team  
**Related Systems:** embedding-service, retrieval-service, Qdrant  
**Depends On:** 2026-05-02-retrieval-service-design.md, 2026-05-02-chat-service-design.md  

## 1. Overview

### 1.1 Problem Statement
Pure semantic (dense vector) search fails on conversational queries that don't semantically match document content. For example:
- Query: "what is my job"
- Document: "Backend Engineer at Osus Prog"
- Semantic similarity: ~0.35 (below 0.5 threshold)
- Result: No results returned

This happens because embedding models map "job" and "Engineer" to different vector spaces despite being conceptually related.

### 1.2 Solution
Implement **hybrid search** combining:
- **Dense vectors** (OpenAI embeddings): Captures semantic meaning and conceptual similarity
- **Sparse vectors** (BM25): Captures keyword frequency and exact term matching

Qdrant performs both searches in parallel and returns merged results.

### 1.3 Success Criteria
- "what is my job" query on resume returns relevant results (score > 0.5)
- "what is my professional experience" still works (existing behavior preserved)
- Latency increase < 50ms per query
- Storage increase < 30% per point

## 2. Architecture

### 2.1 Component Diagram

```
Document Upload
    ↓
Document Processor (extract text, chunk)
    ↓
Embedding Service
    ├─ Dense Vector: OpenAI text-embedding-3-small (1536d)
    └─ Sparse Vector: BM25 tokenization (variable dimensions)
    ↓
Qdrant Point
    id: chunk_uuid
    vectors:
      dense: [0.023, -0.156, ...]     # 1536 dimensions
      sparse: {42: 2.34, 128: 1.56}   # token_id: tf-idf weight
    payload:
      text: "Backend Engineer..."
      document_id: "..."
      project_id: "..."

Search Query: "what is my job"
    ↓
Retrieval Service
    ├─ Dense Query: OpenAI embed("what is my job")
    └─ Sparse Query: BM25 tokenize("what is my job")
    ↓
Qdrant Hybrid Search (parallel)
    ├─ Dense Results: [score: 0.32, ...]
    └─ Sparse Results: [score: 0.78, ...]
    ↓
Score Fusion (weighted average)
    final_score = 0.7 * dense_score + 0.3 * sparse_score
    ↓
Filter by threshold, return top-k
```

### 2.2 Qdrant Collection Schema

**Before (Dense Only):**
```json
{
  "vectors": {
    "size": 1536,
    "distance": "Cosine"
  }
}
```

**After (Hybrid):**
```json
{
  "vectors": {
    "dense": {
      "size": 1536,
      "distance": "Cosine"
    },
    "sparse": {
      "index": {
        "on_disk": false
      }
    }
  },
  "sparse_vectors": {
    "sparse": {
      "index": {
        "full_scan_threshold": 10000
      }
    }
  }
}
```

## 3. Implementation Plan

### 3.1 Phase 1: Embedding Service Updates

**File:** `services/embedding-service/src/jobs.py`

Changes:
1. Add BM25 sparse vector generation
2. Update Qdrant upsert to include both vectors
3. Add sparse vector field to collection creation

**Code Changes:**
```python
# New: Generate sparse vector
from fastembed.sparse import SparseTextEmbedding

sparse_model = SparseTextEmbedding("Qdrant/bm25")

def embed_chunk(chunk_data: Dict[str, Any]) -> None:
    # ... existing dense embedding ...
    
    # New: Sparse embedding
    sparse_vector = list(sparse_model.embed(text))[0]
    # sparse_vector format: SparseEmbedding(indices=[...], values=[...])
    
    qdrant.upsert_chunks([
        {
            "id": chunk_id,
            "vector": {
                "dense": vector,           # renamed from "vector"
                "sparse": sparse_vector,
            },
            "payload": {
                "text": text,
                "document_id": document_id,
                "project_id": project_id,
                "chunk_index": chunk_index,
                "filename": filename,
            },
        }
    ])
```

**New Dependency:**
```
fastembed==0.3.6
```

### 3.2 Phase 2: Qdrant Collection Migration

**One-time migration script:**
```python
# Create new collection with dual vector support
collection_info = client.get_collection("documents")

# Check if sparse vectors exist
if "sparse" not in collection_info.config.params.vectors:
    # Option A: Recreate collection (requires re-indexing all documents)
    client.create_collection(
        collection_name="documents_v2",
        vectors_config={
            "dense": VectorParams(size=1536, distance=Distance.COSINE),
        },
        sparse_vectors_config={
            "sparse": SparseVectorParams(),
        },
    )
    # Re-index all documents via embedding service
    
    # Option B: If Qdrant supports adding sparse vectors to existing collection
    # (check Qdrant 1.17.1 capabilities)
```

**Decision:** Since Qdrant 1.17.1 may not support adding sparse vectors to existing collections, we may need to:
1. Create new collection with hybrid support
2. Re-index all existing documents (trigger re-processing)
3. Or: keep dense-only as fallback, use hybrid only for new collections

### 3.3 Phase 3: Retrieval Service Updates

**File:** `services/retrieval-service/src/search.py`

Changes:
1. Generate both dense and sparse query vectors
2. Update Qdrant search to use hybrid query
3. Configure score fusion weights

**Code Changes:**
```python
# New: Sparse embedding model
from fastembed.sparse import SparseTextEmbedding

class SearchService:
    def __init__(self, config: Config):
        # ... existing init ...
        self.sparse_model = SparseTextEmbedding("Qdrant/bm25")
        self.dense_weight = config.hybrid_dense_weight  # 0.7
        self.sparse_weight = config.hybrid_sparse_weight  # 0.3
    
    async def search(self, request: SearchRequest) -> SearchResponse:
        # Generate query embeddings
        dense_vector = await asyncio.to_thread(self.openai_client.embed, request.query)
        sparse_vector = list(self.sparse_model.embed(request.query))[0]
        
        # Build filter
        filter_obj = build_qdrant_filter(request.filters)
        
        # Hybrid search
        raw_results = self.qdrant_client.search(
            dense_vector=dense_vector,
            sparse_vector=sparse_vector,
            limit=request.limit,
            filter_obj=filter_obj,
            score_threshold=request.score_threshold,
            dense_weight=self.dense_weight,
            sparse_weight=self.sparse_weight,
        )
        
        # ... rest of method ...
```

**File:** `services/retrieval-service/src/qdrant_client.py`

```python
def search(
    self,
    dense_vector: List[float],
    sparse_vector: Any,  # SparseEmbedding type
    limit: int = 10,
    filter_obj: Optional[Any] = None,
    score_threshold: Optional[float] = None,
    dense_weight: float = 0.7,
    sparse_weight: float = 0.3,
) -> List[Dict[str, Any]]:
    """Hybrid search using both dense and sparse vectors."""
    
    # Convert sparse vector to Qdrant format
    sparse_query = models.SparseVector(
        indices=sparse_vector.indices.tolist(),
        values=sparse_vector.values.tolist(),
    )
    
    # Execute hybrid search
    response = self.client.query_points(
        collection_name=self.collection_name,
        query=models.FusionQuery(
            fusion=models.Fusion.RRF,  # Reciprocal Rank Fusion
            prefetch=[
                models.Prefetch(
                    query=dense_vector,
                    using="dense",
                    limit=limit * 2,
                ),
                models.Prefetch(
                    query=sparse_query,
                    using="sparse",
                    limit=limit * 2,
                ),
            ],
        ),
        limit=limit,
        query_filter=filter_obj,
        score_threshold=score_threshold,
    )
    
    return [
        {
            "id": str(point.id),
            "score": point.score,
            "payload": point.payload,
        }
        for point in response.points
    ]
```

### 3.4 Phase 4: Configuration Updates

**New environment variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `HYBRID_SEARCH_ENABLED` | `true` | Enable hybrid search |
| `HYBRID_DENSE_WEIGHT` | `0.7` | Weight for dense (semantic) scores |
| `HYBRID_SPARSE_WEIGHT` | `0.3` | Weight for sparse (keyword) scores |
| `SPARSE_EMBEDDING_MODEL` | `Qdrant/bm25` | FastEmbed model for sparse vectors |

**Files to update:**
- `services/embedding-service/src/config.py`
- `services/retrieval-service/src/config.py`
- `services/embedding-service/.env.example`
- `services/retrieval-service/.env.example`

### 3.5 Phase 5: Chat Service Integration

No changes required. The chat service calls `POST /search` with the same payload. The retrieval service handles hybrid search internally.

## 4. Data Flow

### 4.1 Document Indexing Flow (Updated)

```
1. Document uploaded to S3
2. Document processor extracts text and chunks
3. Embedding service receives chunk job
4. Generate dense vector (OpenAI): 1536 dimensions
5. Generate sparse vector (BM25): variable dimensions
6. Upsert to Qdrant with dual vectors
7. Mark document as "embedded" in backend
```

### 4.2 Search Flow (Updated)

```
1. User asks: "what is my job"
2. Chat service generates search query via LLM
3. Retrieval service receives POST /search
4. Generate dense query vector (OpenAI)
5. Generate sparse query vector (BM25)
6. Execute hybrid search in Qdrant:
   - Dense search: finds semantically similar chunks
   - Sparse search: finds keyword-matching chunks
   - Fusion: merges results with RRF
7. Filter by project_id and score_threshold
8. Return top-k results to chat service
9. LLM generates answer using retrieved chunks
```

## 5. API Changes

### 5.1 No Breaking Changes

The `/search` endpoint maintains the same request/response format:

**Request:**
```json
{
  "query": "what is my job",
  "project_id": "69f685a683e7fde9d14b10fa",
  "limit": 5,
  "score_threshold": 0.5
}
```

**Response:**
```json
{
  "results": [
    {
      "chunk_id": "...",
      "document_id": "...",
      "content": "Backend Engineer at Osus Prog...",
      "score": 0.72,
      "metadata": {
        "project_id": "...",
        "chunk_index": 0,
        "filename": "resume.pdf"
      }
    }
  ],
  "total": 1,
  "query_embedding_time_ms": 245,
  "search_time_ms": 18
}
```

The only difference is the `score` field now reflects the hybrid fusion score instead of pure cosine similarity.

## 6. Migration Strategy

### 6.1 Option A: In-Place Upgrade (Preferred if supported)

If Qdrant 1.17.1 supports adding sparse vectors to existing collections:

1. Update Qdrant collection to support sparse vectors
2. Run migration script to generate sparse vectors for existing points
3. Update embedding service to generate sparse vectors for new documents
4. Update retrieval service to use hybrid search
5. Test and validate

### 6.2 Option B: New Collection (Fallback)

If Qdrant doesn't support adding sparse vectors:

1. Create new collection `documents_hybrid` with dual vector support
2. Update embedding service to write to new collection
3. Trigger re-processing of all existing documents
4. Update retrieval service to read from new collection
5. Verify data integrity
6. Switch retrieval service to new collection
7. Drop old collection (after validation period)

### 6.3 Backward Compatibility

- Add `HYBRID_SEARCH_ENABLED=false` to use dense-only mode
- Support both old and new collection names during transition
- Log which search mode is active for debugging

## 7. Testing Strategy

### 7.1 Unit Tests

**Test hybrid score calculation:**
```python
def test_hybrid_score_fusion():
    dense_score = 0.32
    sparse_score = 0.78
    
    result = calculate_hybrid_score(dense_score, sparse_score, dense_weight=0.7)
    
    assert result == 0.7 * 0.32 + 0.3 * 0.78
    assert result == 0.458  # Above 0.5 threshold
```

**Test sparse vector generation:**
```python
def test_sparse_embedding():
    text = "Backend Engineer at Osus Prog"
    sparse = generate_sparse_vector(text)
    
    assert sparse.indices is not None
    assert sparse.values is not None
    assert len(sparse.indices) == len(sparse.values)
```

### 7.2 Integration Tests

**Test conversational query:**
```python
async def test_conversational_query():
    response = await search("what is my job", project_id="test-project")
    
    assert len(response.results) > 0
    assert response.results[0].score > 0.5
    assert "Engineer" in response.results[0].content
```

**Test semantic query still works:**
```python
async def test_semantic_query():
    response = await search("professional experience", project_id="test-project")
    
    assert len(response.results) > 0
    assert response.results[0].score > 0.5
```

### 7.3 Performance Tests

**Benchmark hybrid vs dense:**
- Query latency: dense vs hybrid
- Storage overhead: dense vs hybrid
- Accuracy: conversational queries with hybrid enabled/disabled

## 8. Operational Concerns

### 8.1 Logging

Add structured logging for hybrid search:
```json
{
  "event": "hybrid_search_executed",
  "query": "what is my job",
  "dense_results": 5,
  "sparse_results": 8,
  "fused_results": 3,
  "dense_time_ms": 245,
  "sparse_time_ms": 12,
  "fusion_time_ms": 1
}
```

### 8.2 Monitoring

Track metrics:
- Hybrid search latency (p50, p95, p99)
- Dense vs sparse result overlap
- Score distribution (dense-only vs hybrid)
- Query types that benefit from hybrid

### 8.3 Failure Modes

| Scenario | Behavior | Recovery |
|----------|----------|----------|
| Sparse model load fails | Fall back to dense-only | Restart service |
| Qdrant doesn't support sparse | Use dense-only mode | Upgrade Qdrant |
| Sparse vector missing for point | Skip sparse, use dense only | Re-index document |

## 9. Rollback Plan

If hybrid search causes issues:

1. Set `HYBRID_SEARCH_ENABLED=false`
2. Restart retrieval service (uses dense-only)
3. Embedding service continues generating sparse vectors (no harm)
4. Fix issues and re-enable

## 10. Future Considerments

- **Learned sparse embeddings:** Replace BM25 with learned sparse models (SPLADE) for better semantic + keyword balance
- **Query expansion:** Use LLM to expand "job" → "role, position, title, occupation" before embedding
- **Re-ranking:** Add cross-encoder re-ranking of top-k hybrid results
- **Dynamic weights:** Adjust dense/sparse weights based on query length or type

## 11. Open Questions

1. Does Qdrant 1.17.1 support adding sparse vectors to existing collections?
2. What is the storage overhead of sparse vectors per point?
3. Should we use RRF or weighted sum for score fusion?

---

**Next Step:** Implementation planning via `writing-plans` skill.
