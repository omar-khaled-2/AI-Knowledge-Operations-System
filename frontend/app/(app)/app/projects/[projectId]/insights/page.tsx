"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Lightbulb,
  X,
  FileText,
  Target,
  TrendingUp,
  Link2,
  AlertTriangle,
} from "lucide-react"
import { useParams } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  getProjectById,
  getInsightsByProjectId,
  formatRelativeTime,
} from "@/lib/mock-data"
import { Breadcrumbs } from "@/components/app/breadcrumbs"

const typeConfig: Record<
  string,
  { icon: React.ReactNode; label: string; color: string }
> = {
  "action-item": {
    icon: <Target className="h-4 w-4" />,
    label: "Action Item",
    color: "#ff4d8b",
  },
  trend: {
    icon: <TrendingUp className="h-4 w-4" />,
    label: "Trend",
    color: "#1a3a3a",
  },
  connection: {
    icon: <Link2 className="h-4 w-4" />,
    label: "Connection",
    color: "#b8a4ed",
  },
  anomaly: {
    icon: <AlertTriangle className="h-4 w-4" />,
    label: "Anomaly",
    color: "#e8b94a",
  },
}

function InsightCard({
  insight,
}: {
  insight: ReturnType<typeof getInsightsByProjectId>[0]
}) {
  const config = typeConfig[insight.type] || {
    icon: <Lightbulb className="h-4 w-4" />,
    label: insight.type,
    color: "#6a6a6a",
  }

  return (
    <div className="bg-[#f5f0e0] rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: config.color + "20", color: config.color }}
          >
            {config.icon}
          </div>
          <div>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: config.color + "15",
                color: config.color,
              }}
            >
              {config.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#9a9a9a]">
            {Math.round(insight.confidence * 100)}% confidence
          </span>
        </div>
      </div>

      <h3 className="text-base font-semibold text-[#0a0a0a]">{insight.title}</h3>
      <p className="text-sm text-[#3a3a3a]">{insight.description}</p>

      {/* Related Documents */}
      {insight.relatedDocuments.length > 0 && (
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-[#9a9a9a]" />
          <span className="text-xs text-[#6a6a6a]">
            {insight.relatedDocuments.length} related document
            {insight.relatedDocuments.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-[#9a9a9a]">
          {formatRelativeTime(insight.timestamp)}
        </span>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm text-[#0a0a0a] bg-[#fffaf0] border border-[#e5e5e5] rounded-lg hover:bg-[#ebe6d6] transition-colors">
            View Details
          </button>
          <button className="p-1.5 text-[#9a9a9a] hover:text-[#ef4444] transition-colors"
            aria-label="Dismiss insight"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function InsightsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const project = getProjectById(projectId)
  const [activeFilter, setActiveFilter] = useState<string>("all")

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

  const insights = getInsightsByProjectId(project.id)
  const filteredInsights =
    activeFilter === "all"
      ? insights
      : insights.filter((i) => i.type === activeFilter)

  const filters = [
    { value: "all", label: "All" },
    { value: "action-item", label: "Action Items" },
    { value: "trend", label: "Trends" },
    { value: "connection", label: "Connections" },
    { value: "anomaly", label: "Anomalies" },
  ]

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Breadcrumbs projectId={project.id} section="insights" />
        <div className="flex items-center justify-between">
          <h1 className="text-[40px] font-medium tracking-tight text-[#0a0a0a]">
            Insights
          </h1>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
              activeFilter === filter.value
                ? "bg-[#f5f0e0] text-[#0a0a0a]"
                : "text-[#6a6a6a] hover:text-[#3a3a3a]"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredInsights.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
          />
        ))}
      </div>

      {filteredInsights.length === 0 && (
        <div className="text-center py-12">
          <Lightbulb className="h-12 w-12 text-[#e5e5e5] mx-auto mb-4" />
          <p className="text-[#6a6a6a]">No insights found for this filter</p>
        </div>
      )}
    </div>
  )
}
