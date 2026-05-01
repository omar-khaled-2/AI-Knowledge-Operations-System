"""Document Processor Service - Event models and processing logic."""

from dataclasses import dataclass
from typing import Any

import structlog

logger = structlog.get_logger()


@dataclass(frozen=True)
class DocumentUploadedEvent:
    """Event payload for document.uploaded events."""

    version: int
    event: str
    documentId: str
    objectKey: str
    mimeType: str
    filename: str
    projectId: str
    uploadedBy: str

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "DocumentUploadedEvent":
        """Create event from dictionary payload."""
        return cls(
            version=data["version"],
            event=data["event"],
            documentId=data["documentId"],
            objectKey=data["objectKey"],
            mimeType=data["mimeType"],
            filename=data["filename"],
            projectId=data["projectId"],
            uploadedBy=data["uploadedBy"],
        )


def process_document(event_data: dict[str, Any]) -> bool:
    """Process a document upload event.

    MVP: Logs the event and marks as completed.
    Future: Download from S3, parse, chunk, and publish for embedding.
    """
    try:
        event = DocumentUploadedEvent.from_dict(event_data)
        logger.info(
            "Received document upload event",
            document_id=event.documentId,
            filename=event.filename,
            mime_type=event.mimeType,
            object_key=event.objectKey,
            project_id=event.projectId,
            uploaded_by=event.uploadedBy,
        )
        return True
    except Exception as e:
        logger.error("Failed to process document event", error=str(e), event_data=event_data)
        raise
