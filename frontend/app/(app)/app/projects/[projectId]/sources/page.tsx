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
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Breadcrumbs } from "@/components/app/breadcrumbs"
import { PageHeader } from "@/components/page-header"
import { ActionButton } from "@/components/action-button"

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
      icon: <CheckCircle2 className="size-4 text-green-500" />,
      label: "Connected",
      className: "text-green-500",
    },
    disconnected: {
      icon: <XCircle className="size-4 text-[var(--muted-soft)]" />,
      label: "Disconnected",
      className: "text-[var(--muted-soft)]",
    },
    syncing: {
      icon: <Loader2 className="size-4 text-amber-500 animate-spin" />,
      label: "Syncing",
      className: "text-amber-500",
    },
  }

  const status = statusConfig[source.status]

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-[var(--ink)] text-white flex items-center justify-center text-sm font-bold">
              {config.icon}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--ink)]">{source.name}</h3>
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </div>
          </div>
          <div className={cn("flex items-center gap-1.5", status.className)}>
            {status.icon}
            <span className="text-xs font-medium">{status.label}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">{source.itemCount} items indexed</span>
            <span className="text-[var(--muted-soft)] flex items-center gap-1">
              <Clock className="size-3.5" />
              Last sync: {formatRelativeTime(source.lastSync)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button>
            <RefreshCw data-icon="inline-start" className="size-3.5" />
            Sync Now
          </Button>
          <Button variant="outline">Configure</Button>
        </div>
      </CardContent>
    </Card>
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
    <Card className="border-2 border-dashed border-border hover:border-ring/30 transition-colors">
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-[var(--surface-card)] text-muted-foreground flex items-center justify-center text-sm font-bold">
            {config.icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--ink)]">{config.name}</h3>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        </div>
        <Button className="w-full">
          Connect
        </Button>
      </CardContent>
    </Card>
  )
}

export default function SourcesPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const project = getProjectById(projectId)

  if (!project) {
    return (
      <div className="p-4 lg:p-8">
        <h1 className="text-2xl font-semibold text-[var(--ink)]">Project not found</h1>
        <Link href="/app" className="text-muted-foreground hover:text-[var(--ink)]">
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
      <PageHeader
        title="Knowledge Sources"
        action={
          <ActionButton variant="primary" icon={<Plus className="size-4" />}>
            Connect Source
          </ActionButton>
        }
      >
        <Breadcrumbs projectId={project.id} section="sources" />
      </PageHeader>

      {/* Connected Sources */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Connected</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connectedSources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
            />
          ))}
        </div>
        {connectedSources.length === 0 && (
          <Card className="text-center py-8">
            <Database className="size-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No sources connected yet</p>
          </Card>
        )}
      </div>

      {/* Available Sources */}
      {availableTypes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--ink)]">Available Integrations</h2>
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
