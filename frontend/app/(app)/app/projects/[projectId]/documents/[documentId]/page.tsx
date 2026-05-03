"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  FileText,
  Clock,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Database,
  Download,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatFileSize } from "@/lib/utils";
import { Breadcrumbs } from "@/components/app/breadcrumbs";

import { getProject } from "../../../actions";
import { getDocument, getDocumentDownloadUrl } from "../actions";
import type { Document } from "@/lib/mock-data";

function getDisplaySize(doc: Document): string {
  if (typeof doc.size === "number") {
    return formatFileSize(doc.size);
  }
  return doc.size;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type ViewerType = "pdf" | "txt" | "md" | "unsupported";

function getViewerType(mimeType?: string): ViewerType {
  if (!mimeType) return "unsupported";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "text/plain") return "txt";
  if (mimeType === "text/markdown" || mimeType === "text/x-markdown") return "md";
  return "unsupported";
}

function PdfViewer({ url }: { url: string }) {
  return (
    <iframe
      src={url}
      className="w-full h-full min-h-[600px] rounded-lg border border-border"
      title="PDF Viewer"
    />
  );
}

function TextViewer({ content }: { content: string }) {
  return (
    <div className="w-full h-full min-h-[600px] rounded-lg border border-border bg-muted/30 p-6 overflow-auto">
      <pre className="whitespace-pre-wrap font-mono text-sm text-foreground leading-relaxed">
        {content}
      </pre>
    </div>
  );
}

function MarkdownViewer({ content }: { content: string }) {
  return (
    <div className="w-full h-full min-h-[600px] rounded-lg border border-border bg-card p-6 overflow-auto"
    >
      <article className="max-w-none space-y-4 text-foreground"
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>,
            h2: ({ children }) => <h2 className="text-xl font-semibold mt-5 mb-3">{children}</h2>,
            h3: ({ children }) => <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>,
            p: ({ children }) => <p className="leading-relaxed mb-4">{children}</p>,
            ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
            li: ({ children }) => <li>{children}</li>,
            code: ({ children }) => <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
            pre: ({ children }) => <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono my-4">{children}</pre>,
            a: ({ children, href }) => <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
            blockquote: ({ children }) => <blockquote className="border-l-4 border-border pl-4 italic my-4">{children}</blockquote>,
            hr: () => <hr className="my-6 border-border" />,
            table: ({ children }) => <table className="w-full border-collapse my-4">{children}</table>,
            th: ({ children }) => <th className="border border-border px-4 py-2 text-left font-semibold bg-muted">{children}</th>,
            td: ({ children }) => <td className="border border-border px-4 py-2">{children}</td>,
          }}
        >
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
}

function UnsupportedViewer({ mimeType, name }: { mimeType?: string; name: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-border rounded-lg bg-muted/30">
      <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <p className="text-muted-foreground font-medium">Preview not available</p>
      <p className="text-sm text-muted-foreground/70 mt-1">
        {name} ({mimeType ?? "unknown type"})
      </p>
      <p className="text-xs text-muted-foreground/50 mt-2">
        Only PDF, TXT, and Markdown files can be previewed
      </p>
    </div>
  );
}

export default function DocumentViewerPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const documentId = params.documentId as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [downloadUrl, setDownloadUrl] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDocument() {
      setIsLoading(true);
      setError(null);
      try {
        const [doc, project] = await Promise.all([
          getDocument(documentId),
          getProject(projectId),
        ]);

        if (!doc) {
          setError("Document not found");
          return;
        }

        setDocument(doc);
        setProjectName(project?.name ?? "Project");

        // Fetch download URL
        const urlData = await getDocumentDownloadUrl(documentId);
        setDownloadUrl(urlData.downloadUrl);

        // If it's a text-based file, fetch the content
        const viewerType = getViewerType(doc.mimeType);
        if (viewerType === "txt" || viewerType === "md") {
          setIsContentLoading(true);
          try {
            const response = await fetch(urlData.downloadUrl);
            if (response.ok) {
              const text = await response.text();
              setContent(text);
            } else {
              console.error("Failed to fetch document content:", response.status);
            }
          } catch (err) {
            console.error("Error fetching content:", err);
          } finally {
            setIsContentLoading(false);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load document";
        setError(message);
        console.error("Failed to load document:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDocument();
  }, [documentId, projectId]);

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8 flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <Link
            href={`/app/projects/${projectId}/documents`}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">Error</h1>
        </div>
        <p className="text-muted-foreground">{error}</p>
        <Link
          href={`/app/projects/${projectId}/documents`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to documents
        </Link>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-4 lg:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <Link
            href={`/app/projects/${projectId}/documents`}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">Document not found</h1>
        </div>
        <p className="text-muted-foreground">The requested document could not be found.</p>
        <Link
          href={`/app/projects/${projectId}/documents`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to documents
        </Link>
      </div>
    );
  }

  const statusConfig = {
    processed: {
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
      label: "Processed",
    },
    processing: {
      icon: <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />,
      label: "Processing",
    },
    error: {
      icon: <AlertCircle className="h-5 w-5 text-destructive" />,
      label: "Error",
    },
    embedded: {
      icon: <Database className="h-5 w-5 text-blue-500" />,
      label: "Embedded",
    },
  };

  const status = statusConfig[document.status];
  const viewerType = getViewerType(document.mimeType);

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Breadcrumbs
          projectId={projectId}
          projectName={projectName}
          section="documents"
          itemName={document.name}
        />
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/app/projects/${projectId}/documents`}
              className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-foreground truncate">
                {document.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="capitalize">{document.sourceType.replace("-", " ")}</span>
                <span>·</span>
                <span>{getDisplaySize(document)}</span>
                {document.pageCount && (
                  <>
                    <span>·</span>
                    <span>{document.pageCount} pages</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={document.name}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-background border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            )}
            <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-background border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors">
              <RefreshCw className="h-4 w-4" />
              Re-process
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-background border border-border text-destructive rounded-xl text-sm font-medium hover:bg-destructive/5 transition-colors">
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Content Viewer */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-2xl p-4 lg:p-6 border border-border">
            {isContentLoading ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {viewerType === "pdf" && downloadUrl && (
                  <PdfViewer url={downloadUrl} />
                )}
                {viewerType === "txt" && <TextViewer content={content} />}
                {viewerType === "md" && <MarkdownViewer content={content} />}
                {viewerType === "unsupported" && (
                  <UnsupportedViewer mimeType={document.mimeType} name={document.name} />
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Sidebar - Metadata */}
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-card rounded-2xl p-5 space-y-4 border border-border">
            <h3 className="text-sm font-semibold text-foreground">Status</h3>
            <div className="flex items-center gap-2">
              {status.icon}
              <span className="text-sm text-foreground">{status.label}</span>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-card rounded-2xl p-5 space-y-4 border border-border">
            <h3 className="text-sm font-semibold text-foreground">Metadata</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Source Type</p>
                <p className="text-sm text-foreground capitalize">
                  {document.sourceType.replace("-", " ")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">File Size</p>
                <p className="text-sm text-foreground">{getDisplaySize(document)}</p>
              </div>
              {document.pageCount && (
                <div>
                  <p className="text-xs text-muted-foreground">Pages</p>
                  <p className="text-sm text-foreground">{document.pageCount}</p>
                </div>
              )}
              {document.mimeType && (
                <div>
                  <p className="text-xs text-muted-foreground">File Type</p>
                  <p className="text-sm text-foreground">{document.mimeType}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Uploaded</p>
                <p className="text-sm text-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatRelativeTime(document.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-card rounded-2xl p-5 space-y-4 border border-border">
            <h3 className="text-sm font-semibold text-foreground">Actions</h3>
            <div className="space-y-2">
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download={document.name}
                  className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download file
                </a>
              )}
              <button className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
                <RefreshCw className="h-4 w-4" />
                Re-process document
              </button>
              <button className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors">
                <Trash2 className="h-4 w-4" />
                Delete document
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
