"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Breadcrumbs } from "@/components/app/breadcrumbs";
import { UploadButton } from "./upload-button";
import { DocumentList } from "./document-list";
import type { Document } from "@/lib/mock-data";

interface DocumentsClientProps {
  projectId: string;
  projectName: string;
}

export function DocumentsClient({ projectId, projectName }: DocumentsClientProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);

  const handleDocumentCreated = useCallback((doc: Document) => {
    setDocuments((prev) => [doc, ...prev]);
    setTotalCount((prev) => prev + 1);
  }, []);

  const handleDocumentsLoaded = useCallback((data: Document[], total: number) => {
    setDocuments(data);
    setTotalCount(total);
  }, []);

  return (
    <div className="p-4 lg:p-8 flex flex-col gap-6">
      {/* Header */}
      <PageHeader
        title="Documents"
        action={<UploadButton projectId={projectId} onDocumentCreated={handleDocumentCreated} />}
      >
        <Breadcrumbs projectId={projectId} projectName={projectName} section="documents" />
      </PageHeader>

      <DocumentList
        projectId={projectId}
        documents={documents}
        totalCount={totalCount}
        onDocumentsLoaded={handleDocumentsLoaded}
      />
    </div>
  );
}
