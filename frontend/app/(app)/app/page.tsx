import Link from "next/link";
import {
  FileText,
  MessageSquare,
  Lightbulb,
  FolderOpen,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Project, getBrandColor } from "@/lib/mock-data";
import { getProjects } from "@/lib/api/projects-server";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";

// Force dynamic rendering so data is fetched at request time
export const dynamic = "force-dynamic";

function ProjectCard({ project }: { project: Project }) {
  const brandColor = getBrandColor(project.color);

  return (
    <Link
      href={`/app/projects/${project.id}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl"
    >
      <Card className="transition-transform hover:scale-[1.02] h-full">
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-semibold text-[var(--ink)]">
              {project.name}
            </h3>
            <div
              className="size-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: brandColor }}
            >
              <ArrowRight className="size-4 text-white" />
            </div>
          </div>
          <p className="text-sm line-clamp-2 text-[var(--body)]">
            {project.description}
          </p>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              {project.documentCount} docs
            </span>
            <span className="text-muted-foreground">
              {project.sessionCount} chats
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function DashboardPage() {
  let projects: Project[] = [];
  let error: string | null = null;

  try {
    projects = await getProjects();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load projects";
  }

  const totalDocuments = projects.reduce(
    (sum, p) => sum + p.documentCount,
    0,
  );
  const totalSessions = projects.reduce(
    (sum, p) => sum + p.sessionCount,
    0,
  );
  const totalInsights = projects.reduce(
    (sum, p) => sum + p.insightCount,
    0,
  );

  return (
    <div className="p-4 lg:p-8 space-y-8">
      {/* Header */}
      <PageHeader
        title="Welcome back"
        description="Here's what's happening across your projects"
      />

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-800">
          <p className="text-sm font-medium">Error loading projects</p>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FolderOpen className="size-5" />}
          label="Total Projects"
          value={projects.length}
          color="#1a3a3a"
          className="p-6"
        />
        <StatCard
          icon={<MessageSquare className="size-5" />}
          label="Active Sessions"
          value={totalSessions}
          color="#ff4d8b"
          className="p-6"
        />
        <StatCard
          icon={<FileText className="size-5" />}
          label="Documents"
          value={totalDocuments}
          color="#b8a4ed"
          className="p-6"
        />
        <StatCard
          icon={<Lightbulb className="size-5" />}
          label="Insights"
          value={totalInsights}
          color="#e8b94a"
          className="p-6"
        />
      </div>

      {/* Projects Grid */}
      <div className="space-y-4">
        <SectionHeader
          title="Recent Projects"
          href="/app"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
          <Link
            href="/app/projects/new"
            className="rounded-2xl p-6 border-2 border-dashed border-[var(--hairline)] flex flex-col items-center justify-center gap-3 min-h-[180px] hover:border-[var(--ink)]/30 transition-colors"
          >
            <Plus className="size-8 text-[var(--muted-soft)]" />
            <span className="text-sm font-medium text-muted-foreground">
              Create New Project
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
