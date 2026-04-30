"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import {
  FileText,
  MessageSquare,
  Database,
  Lightbulb,
  Plus,
  ArrowRight,
  Clock,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getProjectById,
  getSessionsByProjectId,
  getDocumentsByProjectId,
  getInsightsByProjectId,
  formatRelativeTime,
  getBrandColor,
} from "@/lib/mock-data"
import { Breadcrumbs } from "@/components/app/breadcrumbs"

export default function ProjectHomePage() {
  const params = useParams()
  const projectId = params.projectId as string
  const project = getProjectById(projectId)

  if (!project) {
    return (
      <div className="p-4 lg:p-8">
        <h1 className="text-2xl font-semibold text-[#0a0a0a]">Project not found</h1>
        <Link href="/app" className="text-[#6a6a6a] hover:text-[#0a0a0a]">
          ← Back to dashboard
        </Link>
      </div>
    )
  }

  const sessions = getSessionsByProjectId(project.id)
  const documents = getDocumentsByProjectId(project.id)
  const insights = getInsightsByProjectId(project.id)
  const brandColor = getBrandColor(project.color)

  return (
    <div className="p-4 lg:p-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Breadcrumbs projectId={project.id} />
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0a0a0a]">Recent Documents</h2>
            <Link
              href={`/app/projects/${project.id}/documents`}
              className="text-sm text-[#6a6a6a] hover:text-[#0a0a0a] transition-colors flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="bg-[#f5f0e0] rounded-2xl divide-y divide-[#e5e5e5]">
            {documents.slice(0, 5).map((doc) => (
              <Link
                key={doc.id}
                href={`/app/projects/${project.id}/documents/${doc.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[#ebe6d6] transition-colors"
              >
                <FileText className="h-5 w-5 text-[#6a6a6a] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0a0a0a] truncate">{doc.name}</p>
                  <p className="text-xs text-[#9a9a9a]">{doc.status} · {doc.size}</p>
                </div>
              </Link>
            ))}
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
