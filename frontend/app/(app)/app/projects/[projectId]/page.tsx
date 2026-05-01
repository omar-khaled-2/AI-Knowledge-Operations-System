import Link from "next/link"
import { notFound } from "next/navigation"
import {
  FileText,
  MessageSquare,
  Database,
  Lightbulb,
  ArrowRight,
  Settings,
  Clock,
} from "lucide-react"
import { formatFileSize } from "@/lib/utils"
import {
  getSessionsByProjectId,
  getInsightsByProjectId,
  formatRelativeTime,
  getBrandColor,
  type Document,
} from "@/lib/mock-data"
import { getProject } from "@/lib/api/projects-server"
import { getDocuments } from "@/lib/api/documents-server"
import { Breadcrumbs } from "@/components/app/breadcrumbs"

export default async function ProjectHomePage({
  params,
}: {
  params: { projectId: string }
}) {
  const project = await getProject(params.projectId)

  if (!project) {
    notFound()
  }

  // TODO: Replace with real data when sessions module is built
  const sessions = getSessionsByProjectId(project.id)
  // Fetch recent documents from API (server-side pagination)
  let recentDocuments: Document[] = []
  try {
    const result = await getDocuments(params.projectId, {
      page: 1,
      limit: 5,
      sortBy: "createdAt",
      sortOrder: "desc",
    })
    recentDocuments = result.documents
  } catch (error) {
    console.error("Failed to fetch documents:", error)
  }
  // TODO: Replace with real data when insights module is built
  const insights = getInsightsByProjectId(project.id)
  const brandColor = getBrandColor(project.color)

  function getDisplaySize(doc: Document): string {
    if (typeof doc.size === "number") {
      return formatFileSize(doc.size)
    }
    return doc.size
  }

  return (
    <div className="p-4 lg:p-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Breadcrumbs projectId={project.id} projectName={project.name} />
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-[40px] font-medium tracking-tight text-[#0a0a0a]">
              {project.name}
            </h1>
            <p className="text-base text-[#3a3a3a] max-w-2xl">{project.description}</p>
          </div>
          <Link
            href={`/app/projects/${project.id}/settings`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#e5e5e5] text-sm font-medium text-[#0a0a0a] hover:bg-[#f5f0e0] transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <FileText className="h-5 w-5" />, label: "Documents", value: project.documentCount, color: brandColor },
          { icon: <Database className="h-5 w-5" />, label: "Sources", value: project.sourceCount, color: brandColor },
          { icon: <MessageSquare className="h-5 w-5" />, label: "Sessions", value: project.sessionCount, color: brandColor },
          { icon: <Lightbulb className="h-5 w-5" />, label: "Insights", value: project.insightCount, color: brandColor },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#f5f0e0] rounded-2xl p-5 space-y-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: stat.color + "20", color: stat.color }}
            >
              {stat.icon}
            </div>
            <p className="text-[28px] font-medium text-[#0a0a0a] tracking-tight">{stat.value}</p>
            <p className="text-sm text-[#6a6a6a]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/app/projects/${project.id}/chat`}
          className="inline-flex items-center gap-2 px-5 py-3 bg-[#0a0a0a] text-white rounded-xl text-sm font-semibold hover:bg-[#1f1f1f] transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
          New Chat
        </Link>
        <button className="inline-flex items-center gap-2 px-5 py-3 bg-[#fffaf0] border border-[#e5e5e5] text-[#0a0a0a] rounded-xl text-sm font-semibold hover:bg-[#f5f0e0] transition-colors">
          <FileText className="h-4 w-4" />
          Upload Document
        </button>
        <Link
          href={`/app/projects/${project.id}/sources`}
          className="inline-flex items-center gap-2 px-5 py-3 bg-[#fffaf0] border border-[#e5e5e5] text-[#0a0a0a] rounded-xl text-sm font-semibold hover:bg-[#f5f0e0] transition-colors"
        >
          <Database className="h-4 w-4" />
          Connect Source
        </Link>
      </div>

      {/* Recent Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Documents */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Recent Documents</h2>
            <Link
              href={`/app/projects/${project.id}/documents`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              View all <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="flex flex-col rounded-xl bg-card ring-1 ring-foreground/10 divide-y divide-border">
            {recentDocuments.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No documents yet. Upload your first document.
              </div>
            ) : (
              recentDocuments.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/app/projects/${project.id}/documents/${doc.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors"
                >
                  <FileText className="size-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground/70">
                      {doc.status} · {getDisplaySize(doc)}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground/70 flex items-center gap-1 flex-shrink-0">
                    <Clock className="size-3" />
                    {formatRelativeTime(doc.createdAt)}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0a0a0a]">Recent Conversations</h2>
            <Link
              href={`/app/projects/${project.id}/chat`}
              className="text-sm text-[#6a6a6a] hover:text-[#0a0a0a] transition-colors flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="bg-[#f5f0e0] rounded-2xl divide-y divide-[#e5e5e5]">
            {sessions.slice(0, 5).map((session) => (
              <Link
                key={session.id}
                href={`/app/projects/${project.id}/chat/${session.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[#ebe6d6] transition-colors"
              >
                <MessageSquare className="h-5 w-5 text-[#6a6a6a] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0a0a0a] truncate">{session.name}</p>
                  <p className="text-xs text-[#9a9a9a] truncate">{session.preview}</p>
                </div>
                <span className="text-xs text-[#9a9a9a] flex-shrink-0">
                  {formatRelativeTime(session.lastUpdated)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Active Insights */}
      {insights.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0a0a0a]">Active Insights</h2>
            <Link
              href={`/app/projects/${project.id}/insights`}
              className="text-sm text-[#6a6a6a] hover:text-[#0a0a0a] transition-colors flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.slice(0, 3).map((insight) => (
              <div
                key={insight.id}
                className="bg-[#f5f0e0] rounded-2xl p-5 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#e8b94a]20 flex items-center justify-center">
                    <Lightbulb className="h-4 w-4 text-[#e8b94a]" />
                  </div>
                  <span className="text-xs font-medium text-[#6a6a6a] uppercase">
                    {insight.type.replace("-", " ")}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-[#0a0a0a]">{insight.title}</h3>
                <p className="text-sm text-[#3a3a3a] line-clamp-2">{insight.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#9a9a9a]">
                    {Math.round(insight.confidence * 100)}% confidence
                  </span>
                  <span className="text-xs text-[#9a9a9a]">
                    {formatRelativeTime(insight.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
