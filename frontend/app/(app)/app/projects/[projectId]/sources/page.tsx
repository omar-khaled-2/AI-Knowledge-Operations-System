"use client"

import Link from "next/link"
import {
  Database,
  Plus,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  RefreshCw,
} from "lucide-react"
import { useParams } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  getProjectById,
  getSourcesByProjectId,
  formatRelativeTime,
} from "@/lib/mock-data"
import { Breadcrumbs } from "@/components/app/breadcrumbs"

const sourceTypeConfig: Record<
  string,
  { name: string; icon: string; description: string }
> = {
  notion: {
    name: "Notion",
    icon: "N",
    description: "Sync pages, databases, and wikis",
  },
  slack: {
    name: "Slack",
    icon: "S",
    description: "Index channels and conversations",
  },
  "google-drive": {
    name: "Google Drive",
    icon: "G",
    description: "Sync documents and spreadsheets",
  },
  confluence: {
    name: "Confluence",
    icon: "C",
    description: "Import wiki pages and spaces",
  },
  github: {
    name: "GitHub",
    icon: "GH",
    description: "Index repositories and issues",
  },
}

function SourceCard({
  source,
}: {
  source: ReturnType<typeof getSourcesByProjectId>[0]
}) {
  const config = sourceTypeConfig[source.type] || {
    name: source.type,
    icon: "?",
    description: "",
  }

  const statusConfig = {
    connected: {
      icon: <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />,
      label: "Connected",
      className: "text-[#22c55e]",
    },
    disconnected: {
      icon: <XCircle className="h-4 w-4 text-[#9a9a9a]" />,
      label: "Disconnected",
      className: "text-[#9a9a9a]",
    },
    syncing: {
      icon: <Loader2 className="h-4 w-4 text-[#f59e0b] animate-spin" />,
      label: "Syncing",
      className: "text-[#f59e0b]",
    },
  }

  const status = statusConfig[source.status]

  return (
    <div className="bg-[#f5f0e0] rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0a0a0a] text-white flex items-center justify-center text-sm font-bold">
            {config.icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#0a0a0a]">{source.name}</h3>
            <p className="text-xs text-[#6a6a6a]">{config.description}</p>
          </div>
        </div>
        <div className={cn("flex items-center gap-1.5", status.className)}>
          {status.icon}
          <span className="text-xs font-medium">{status.label}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-[#6a6a6a]">{source.itemCount} items indexed</span>
          <span className="text-[#9a9a9a] flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Last sync: {formatRelativeTime(source.lastSync)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a0a0a] text-white rounded-xl text-sm font-medium hover:bg-[#1f1f1f] transition-colors">
          <RefreshCw className="h-3.5 w-3.5" />
          Sync Now
        </button>
        <button className="px-4 py-2 border border-[#e5e5e5] rounded-xl text-sm text-[#0a0a0a] hover:bg-[#ebe6d6] transition-colors">
          Configure
        </button>
      </div>
    </div>
  )
}

function AvailableSourceCard({
  type,
}: {
  type: string
}) {
  const config = sourceTypeConfig[type] || {
    name: type,
    icon: "?",
    description: "",
  }

  return (
    <div className="bg-[#fffaf0] border-2 border-dashed border-[#e5e5e5] rounded-2xl p-5 space-y-4 hover:border-[#0a0a0a]/30 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#f5f0e0] text-[#6a6a6a] flex items-center justify-center text-sm font-bold">
          {config.icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#0a0a0a]">{config.name}</h3>
          <p className="text-xs text-[#6a6a6a]">{config.description}</p>
        </div>
      </div>
      <button className="w-full py-2.5 bg-[#0a0a0a] text-white rounded-xl text-sm font-medium hover:bg-[#1f1f1f] transition-colors">
        Connect
      </button>
    </div>
  )
}

export default function SourcesPage() {
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

  const sources = getSourcesByProjectId(project.id)
  const connectedSources = sources.filter((s) => s.status !== "disconnected")
  const availableTypes = ["notion", "slack", "google-drive", "confluence", "github"].filter(
    (type) => !sources.some((s) => s.type === type && s.status !== "disconnected")
  )

  return (
    <div className="p-4 lg:p-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Breadcrumbs projectId={project.id} section="sources" />
        <div className="flex items-center justify-between">
          <h1 className="text-[40px] font-medium tracking-tight text-[#0a0a0a]">
            Knowledge Sources
          </h1>
          <button className="inline-flex items-center gap-2 px-5 py-3 bg-[#0a0a0a] text-white rounded-xl text-sm font-semibold hover:bg-[#1f1f1f] transition-colors">
            <Plus className="h-4 w-4" />
            Connect Source
          </button>
        </div>
      </div>

      {/* Connected Sources */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-[#0a0a0a]">Connected</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connectedSources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
            />
          ))}
        </div>
        {connectedSources.length === 0 && (
          <div className="text-center py-8 bg-[#f5f0e0] rounded-2xl">
            <Database className="h-8 w-8 text-[#e5e5e5] mx-auto mb-3" />
            <p className="text-[#6a6a6a]">No sources connected yet</p>
          </div>
        )}
      </div>

      {/* Available Sources */}
      {availableTypes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[#0a0a0a]">Available Integrations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableTypes.map((type) => (
              <AvailableSourceCard
                key={type}
                type={type}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
