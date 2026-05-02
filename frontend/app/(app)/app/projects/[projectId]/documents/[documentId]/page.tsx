"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
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
} from "lucide-react"
import {
  getProjectById,
  getDocumentById,
  formatRelativeTime,
  type Document,
} from "@/lib/mock-data"
import { formatFileSize } from "@/lib/utils"
import { Breadcrumbs } from "@/components/app/breadcrumbs"

function getDisplaySize(doc: Document): string {
  if (typeof doc.size === "number") {
    return formatFileSize(doc.size);
  }
  return doc.size;
}

export default function DocumentViewerPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const documentId = params.documentId as string
  const project = getProjectById(projectId)
  const document = getDocumentById(documentId)

  if (!project || !document) {
    return (
      <div className="p-4 lg:p-8">
        <h1 className="text-2xl font-semibold text-[#0a0a0a]">Document not found</h1>
        <Link
          href={`/app/projects/${projectId}/documents`}
          className="text-[#6a6a6a] hover:text-[#0a0a0a]"
        >
          ← Back to documents
        </Link>
      </div>
    )
  }

  const statusConfig = {
    processed: {
      icon: <CheckCircle2 className="h-5 w-5 text-[#22c55e]" />,
      label: "Processed",
    },
    processing: {
      icon: <Loader2 className="h-5 w-5 text-[#f59e0b] animate-spin" />,
      label: "Processing",
    },
    error: {
      icon: <AlertCircle className="h-5 w-5 text-[#ef4444]" />,
      label: "Error",
    },
    embedded: {
      icon: <Database className="h-5 w-5 text-[#3b82f6]" />,
      label: "Embedded",
    },
  }

  const status = statusConfig[document.status]

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Breadcrumbs
          projectId={project.id}
          section="documents"
          itemName={document.name}
        />
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/app/projects/${project.id}/documents`}
              className="p-2 hover:bg-[#f5f0e0] rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-[#0a0a0a]">{document.name}</h1>
              <div className="flex items-center gap-3 text-sm text-[#6a6a6a] mt-1">
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
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#fffaf0] border border-[#e5e5e5] text-[#0a0a0a] rounded-xl text-sm font-medium hover:bg-[#f5f0e0] transition-colors">
              <RefreshCw className="h-4 w-4" />
              Re-process
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#fffaf0] border border-[#e5e5e5] text-[#ef4444] rounded-xl text-sm font-medium hover:bg-[#ef4444]/5 transition-colors">
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Content Viewer */}
        <div className="lg:col-span-2">
          <div className="bg-[#f5f0e0] rounded-2xl p-6 lg:p-8">
            <div className="flex items-center justify-center h-96 border-2 border-dashed border-[#e5e5e5] rounded-xl">
              <div className="text-center space-y-3">
                <FileText className="h-12 w-12 text-[#e5e5e5] mx-auto" />
                <p className="text-[#6a6a6a]">Document viewer placeholder</p>
                <p className="text-sm text-[#9a9a9a]">Content will be rendered here</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Metadata */}
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-[#f5f0e0] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#0a0a0a]">Status</h3>
            <div className="flex items-center gap-2">
              {status.icon}
              <span className="text-sm text-[#0a0a0a]">{status.label}</span>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-[#f5f0e0] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#0a0a0a]">Metadata</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-[#9a9a9a]">Source Type</p>
                <p className="text-sm text-[#0a0a0a] capitalize">
                  {document.sourceType.replace("-", " ")}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9a9a9a]">File Size</p>
                <p className="text-sm text-[#0a0a0a]">{getDisplaySize(document)}</p>
              </div>
              {document.pageCount && (
                <div>
                  <p className="text-xs text-[#9a9a9a]">Pages</p>
                  <p className="text-sm text-[#0a0a0a]">{document.pageCount}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-[#9a9a9a]">Uploaded</p>
                <p className="text-sm text-[#0a0a0a] flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatRelativeTime(document.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Extracted Insights */}
          <div className="bg-[#f5f0e0] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#0a0a0a]">Extracted Insights</h3>
            <p className="text-sm text-[#6a6a6a]">
              AI has identified key topics and entities from this document.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Strategy", "Q4 Planning", "Revenue", "Team Growth"].map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-[#fffaf0] border border-[#e5e5e5] rounded-full text-xs text-[#3a3a3a]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
