"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  LayoutGrid,
  List,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  getProjectById,
  getDocumentsByProjectId,
  formatRelativeTime,
} from "@/lib/mock-data";
import { Breadcrumbs } from "@/components/app/breadcrumbs";

function DocumentCard({
  document,
  projectId,
}: {
  document: ReturnType<typeof getDocumentsByProjectId>[0];
  projectId: string;
}) {
  const statusIcons = {
    processed: <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />,
    processing: <Loader2 className="h-4 w-4 text-[#f59e0b] animate-spin" />,
    error: <AlertCircle className="h-4 w-4 text-[#ef4444]" />,
  };

  const sourceIcons: Record<string, React.ReactNode> = {
    upload: <FileText className="h-5 w-5" />,
    notion: <span className="text-xs font-bold">N</span>,
    slack: <span className="text-xs font-bold">S</span>,
    drive: <span className="text-xs font-bold">G</span>,
    confluence: <span className="text-xs font-bold">C</span>,
    github: <span className="text-xs font-bold">GH</span>,
  };

  return (
    <Link
      href={`/app/projects/${projectId}/documents/${document.id}`}
      className={cn(
        "block bg-[#f5f0e0] rounded-2xl p-5 space-y-3 transition-transform hover:scale-[1.02]",
        "focus:outline-none focus:ring-2 focus:ring-[#0a0a0a] focus:ring-offset-2",
      )}
    >
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-[#fffaf0] border border-[#e5e5e5] flex items-center justify-center text-[#6a6a6a]">
          {sourceIcons[document.sourceType] || <FileText className="h-5 w-5" />}
        </div>
        {statusIcons[document.status]}
      </div>
      <h3 className="text-sm font-semibold text-[#0a0a0a] line-clamp-2">
        {document.name}
      </h3>
      <div className="flex items-center gap-3 text-xs text-[#9a9a9a]">
        <span>{document.size}</span>
        {document.pageCount && <span>{document.pageCount} pages</span>}
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatRelativeTime(document.uploadDate)}
        </span>
      </div>
    </Link>
  );
}

function DocumentListItem({
  document,
  projectId,
}: {
  document: ReturnType<typeof getDocumentsByProjectId>[0];
  projectId: string;
}) {
  const statusIcons = {
    processed: <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />,
    processing: <Loader2 className="h-4 w-4 text-[#f59e0b] animate-spin" />,
    error: <AlertCircle className="h-4 w-4 text-[#ef4444]" />,
  };

  return (
    <Link
      href={`/app/projects/${projectId}/documents/${document.id}`}
      className="flex items-center gap-4 px-4 py-3 hover:bg-[#ebe6d6] transition-colors"
    >
      <FileText className="h-5 w-5 text-[#6a6a6a] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#0a0a0a] truncate">
          {document.name}
        </p>
      </div>
      <div className="hidden sm:flex items-center gap-4 text-sm text-[#9a9a9a]">
        <span className="capitalize">
          {document.sourceType.replace("-", " ")}
        </span>
        <span>{document.size}</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {formatRelativeTime(document.uploadDate)}
        </span>
      </div>
      <div className="flex-shrink-0">{statusIcons[document.status]}</div>
    </Link>
  );
}

export default function DocumentsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const project = getProjectById(projectId);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  if (!project) {
    return (
      <div className="p-4 lg:p-8">
        <h1 className="text-2xl font-semibold text-[#0a0a0a]">
          Project not found
        </h1>
        <Link href="/app" className="text-[#6a6a6a] hover:text-[#0a0a0a]">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const documents = getDocumentsByProjectId(project.id);
  const filteredDocuments = documents.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Breadcrumbs projectId={project.id} section="documents" />
        <div className="flex items-center justify-between">
          <h1 className="text-[40px] font-medium tracking-tight text-[#0a0a0a]">
            Documents
          </h1>
          <button className="inline-flex items-center gap-2 px-5 py-3 bg-[#0a0a0a] text-white rounded-xl text-sm font-semibold hover:bg-[#1f1f1f] transition-colors">
            <Plus className="h-4 w-4" />
            Upload
          </button>
        </div>
      </div>

      {/* Search and View Toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9a9a9a]" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-12 pr-4 bg-[#fffaf0] border border-[#e5e5e5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]"
          />
        </div>
        <div className="flex items-center bg-[#f5f0e0] rounded-xl p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-2 rounded-lg transition-colors",
              viewMode === "grid"
                ? "bg-[#fffaf0] text-[#0a0a0a]"
                : "text-[#6a6a6a] hover:text-[#0a0a0a]",
            )}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-2 rounded-lg transition-colors",
              viewMode === "list"
                ? "bg-[#fffaf0] text-[#0a0a0a]"
                : "text-[#6a6a6a] hover:text-[#0a0a0a]",
            )}
            aria-label="List view"
          >
            <List className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Documents */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              projectId={project.id}
            />
          ))}
        </div>
      ) : (
        <div className="bg-[#f5f0e0] rounded-2xl divide-y divide-[#e5e5e5]">
          {filteredDocuments.map((document) => (
            <DocumentListItem
              key={document.id}
              document={document}
              projectId={project.id}
            />
          ))}
        </div>
      )}

      {filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-[#e5e5e5] mx-auto mb-4" />
          <p className="text-[#6a6a6a]">No documents found</p>
        </div>
      )}
    </div>
  );
}
