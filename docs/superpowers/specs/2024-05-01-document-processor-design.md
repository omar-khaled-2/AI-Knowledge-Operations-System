# Document Processor Service Design

**Date:** 2024-05-01  
**Status:** Draft  
**Author:** System  
**Version:** 1.0

## 1. Overview

### 1.1 Purpose
The Document Processor Service (Service 2 of 3) handles document parsing and text chunking for the vector ingestion pipeline. It consumes raw document upload events, downloads files from S3, parses content (PDF/MD/TXT), splits text into chunks, and publishes structured chunk events for downstream embedding.

### 1.2 Scope
- **In Scope:** Document parsing, text extraction, chunking, metadata extraction, event publishing
- **Out of Scope:** HTTP upload handling, embedding generation, vector storage, search queries

### 1.3 Context
```
┌─────────────────┐     ┌──────────────────────────┐     ┌──────────────────┐
│  API Service    │────▶│  Document Processor      │────▶│ Vector Indexer   │
│  (exists)       │     │  (this service)          │     │  (future)        │
└─────────────────┘     └──────────────────────────┘     └──────────────────┘
        │                          │                              │
        ▼                          ▼                              ▼
   ┌─────────┐              ┌─────────┐                    ┌──────────┐
   │   S3    │              │  Redis  │                    │  Qdrant  │
   └─────────┘              │  Queue  │                    └──────────┘
                            └─────────┘
```

## 2. Architecture

### 2.1 Service Type
Standalone NestJS application running as a BullMQ worker process.

### 2.2 Technology Stack
- **Runtime:** Node.js 20+ / Bun
- **Framework:** NestJS 10+
- **Queue:** BullMQ (Redis)
- **File Storage:** AWS S3
- **Database:** MongoDB (for status tracking)
- **Parsing Libraries:**
  - PDF: `pdf-parse`
  - Markdown: `marked`
  - TXT: Native Node.js streams

### 2.3 Component Architecture

```
DocumentProcessorModule
├── QueueConsumer
│   └── Listens for "document.uploaded" events
├── ProcessingService
│   ├── downloadFromS3()
│   ├── parseDocument()
│   ├── chunkText()
│   └── publishChunks()
├── ParserModule
│   ├── PdfParser
│   ├── MarkdownParser
│   └── TextParser
├── ChunkerModule
│   └── RecursiveCharacterChunker
└── S3Module (client)
```

## 3. Data Models

### 3.1 Input Event

**Topic:** `document.uploaded`

```typescript
interface DocumentUploadedEvent {
  version: number;        // Event schema version (integer)
  event: "document.uploaded";
  documentId: string;     // MongoDB ObjectId
  version: number;        // Document version number
  s3Key: string;          // S3 object key
  mimeType: "application/pdf" | "text/markdown" | "text/plain";
  filename: string;
  projectId: string;
  uploadedBy: string;
  fileSize: number;       // Bytes
  checksum: string;       // SHA256
}
```

**Example:**
```json
{
  "version": 1,
  "event": "document.uploaded",
  "documentId": "6579a1b2c3d4e5f6a7b8c9d0",
  "version": 1,
  "s3Key": "projects/proj-123/documents/doc-456/v1/report.pdf",
  "mimeType": "application/pdf",
  "filename": "Q4-Report.pdf",
  "projectId": "proj-123",
  "uploadedBy": "user-789",
  "fileSize": 1048576,
  "checksum": "a3f5c8..."
}
```

### 3.2 Output Event

**Topic:** `text.chunks.ready`

```typescript
interface TextChunksReadyEvent {
  version: number;        // Event schema version (integer)
  event: "text.chunks.ready";
  documentId: string;
  version: number;        // Document version number
  projectId: string;
  chunks: Array<{
    index: number;        // 0-based sequence
    text: string;         // Chunk content
    metadata: {
      startPage?: number;
      endPage?: number;
      startChar: number;  // Position in original text
      endChar: number;
      wordCount: number;
      charCount: number;
    };
  }>;
  documentMetadata: {
    title?: string;
    author?: string;
    totalPages?: number;
    totalWords: number;
    totalChunks: number;
    parsedAt: string;     // ISO 8601
  };
  processingMetadata: {
    parserVersion: string;
    processorVersion: string;
    startedAt: string;
    completedAt: string;
  };
}
```

**Example:**
```json
{
  "version": 1,
  "event": "text.chunks.ready",
  "documentId": "6579a1b2c3d4e5f6a7b8c9d0",
  "version": 1,
  "projectId": "proj-123",
  "chunks": [
    {
      "index": 0,
      "text": "This is the first chunk of text...",
      "metadata": {
        "startPage": 1,
        "endPage": 1,
        "startChar": 0,
        "endChar": 1000,
        "wordCount": 150,
        "charCount": 1000
      }
    }
  ],
  "documentMetadata": {
    "title": "Q4 Report",
    "totalPages": 10,
    "totalWords": 5000,
    "totalChunks": 5,
    "parsedAt": "2024-05-01T10:30:00Z"
  },
  "processingMetadata": {
    "parserVersion": "pdf-parse@1.1.1",
    "processorVersion": "1.0.0",
    "startedAt": "2024-05-01T10:30:00Z",
    "completedAt": "2024-05-01T10:30:05Z"
  }
}
```

### 3.3 Error Event

**Topic:** `document.processing.failed`

```typescript
interface DocumentProcessingFailedEvent {
  version: number;
  event: "document.processing.failed";
  documentId: string;
  version: number;
  projectId: string;
  error: {
    code: string;         // Error code
    message: string;      // Human-readable message
  };
  retryCount: number;
  failedAt: string;       // ISO 8601
}
```

## 4. Processing Pipeline

### 4.1 Step-by-Step Flow

```
1. CONSUME EVENT
   └── Validate version === 1
   └── Validate required fields

2. UPDATE STATUS
   └── MongoDB: status = "downloading"

3. DOWNLOAD FROM S3
   └── GET s3Key → /tmp/{documentId}-{version}-{filename}
   └── Verify checksum
   └── MongoDB: status = "parsing"

4. PARSE DOCUMENT
   ├── Detect mimeType
   ├── Route to parser:
   │   ├── application/pdf → PdfParser
   │   ├── text/markdown → MarkdownParser
   │   └── text/plain → TextParser
   └── Extract: text, metadata (title, author, pages)

5. CHUNK TEXT
   └── Split text into chunks
   └── Size: 1000 chars, overlap: 200 chars
   └── Add metadata per chunk

6. UPDATE STATUS
   └── MongoDB: status = "completed"

7. PUBLISH EVENT
   └── Publish "text.chunks.ready" to Redis
```

### 4.2 Status States

```typescript
type ProcessingStatus = 
  | "pending"      // Event received
  | "downloading"  // Fetching from S3
  | "parsing"      // Extracting text
  | "chunking"     // Splitting text
  | "completed"    // Done, chunks published
  | "failed";      // Error occurred
```

## 5. File Type Support

### 5.1 PDF (`application/pdf`)
- **Library:** `pdf-parse`
- **Output:** Plain text, page metadata
- **Limitations:** Scanned PDFs (images) not supported
- **Max Size:** 100MB

### 5.2 Markdown (`text/markdown`)
- **Library:** `marked` (convert to text)
- **Output:** Plain text without formatting
- **Limitations:** None
- **Max Size:** 50MB

### 5.3 Text (`text/plain`)
- **Library:** Native Node.js `fs.readFile`
- **Output:** Direct text
- **Limitations:** None
- **Max Size:** 50MB

## 6. Chunking Strategy

### 6.1 Algorithm
Recursive character splitter:
1. Try to split by paragraphs (`\n\n`)
2. If chunk too big, split by sentences (`.`)
3. If still too big, split by words (` `)
4. If still too big, split by characters

### 6.2 Configuration
```typescript
interface ChunkingConfig {
  chunkSize: number;      // 1000 characters (default)
  chunkOverlap: number;   // 200 characters (default)
  separators: string[];   // ["\n\n", "\n", ". ", " ", ""]
}
```

## 7. Error Handling

### 7.1 Retry Policy
- **Max Retries:** 3
- **Backoff:** Exponential (1s, 2s, 4s)
- **Retryable Errors:** S3 timeout, network errors, memory issues
- **Non-Retryable Errors:** Invalid file type, corrupted file, too large

### 7.2 Error Codes
| Code | Description | Action |
|------|-------------|--------|
| `S3_DOWNLOAD_ERROR` | Failed to download from S3 | Retry |
| `CHECKSUM_MISMATCH` | File integrity check failed | Fail |
| `UNSUPPORTED_FILE_TYPE` | MIME type not supported | Fail |
| `FILE_TOO_LARGE` | File exceeds size limit | Fail |
| `PARSE_ERROR` | Failed to parse document | Fail |
| `INVALID_EVENT_VERSION` | Event version not supported | Fail |

### 7.3 Dead Letter Queue
Failed events (after retries) go to DLQ for manual inspection.

## 8. Configuration

### 8.1 Environment Variables
```env
# Redis
REDIS_URL=redis://localhost:6379

# S3
S3_BUCKET=documents-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

# MongoDB
MONGODB_URI=mongodb://localhost:27017/db

# Processing
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
MAX_FILE_SIZE_MB=100
MAX_RETRIES=3

# Service
PROCESSOR_VERSION=1.0.0
```

## 9. Deployment

### 9.1 Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["node", "dist/main"]
```

### 9.2 Kubernetes
- **Replicas:** 2-5 (horizontal scaling)
- **Resources:** 1 CPU, 2GB RAM per pod
- **Health Checks:** Liveness + readiness probes

## 10. Monitoring

### 10.1 Metrics
- Documents processed (counter)
- Processing duration (histogram)
- Failed documents (counter)
- Queue depth (gauge)

### 10.2 Logging
- Structured JSON logs
- Correlation ID from event
- Log levels: error, warn, info, debug

## 11. Testing Strategy

### 11.1 Unit Tests
- Parser modules (mocked files)
- Chunker logic
- Event validation

### 11.2 Integration Tests
- End-to-end flow with test files
- S3 mock (MinIO)
- Redis mock

### 11.3 Test Files
- `test/fixtures/sample.pdf`
- `test/fixtures/sample.md`
- `test/fixtures/sample.txt`

## 12. Future Considerations

### 12.1 Version 2 Events
When event version 2 is needed:
1. Update consumer to handle version 1 AND 2
2. Deploy consumer
3. Update producer to emit version 2
4. Remove version 1 support (after migration)

### 12.2 Scaling
- Add more worker replicas for parallel processing
- Separate queue per file type
- Priority queue for urgent documents

## 13. Acceptance Criteria

- [ ] PDF files parsed correctly with page metadata
- [ ] Markdown files converted to plain text
- [ ] Text files processed as-is
- [ ] Documents chunked with configurable size/overlap
- [ ] Events published with correct version (integer)
- [ ] Failed documents retried 3x then sent to DLQ
- [ ] MongoDB status updated throughout pipeline
- [ ] Checksum verified after S3 download
- [ ] Processing completes within 30s for 10MB file
- [ ] 80%+ test coverage

---

**Next Step:** Write implementation plan using `writing-plans` skill.
