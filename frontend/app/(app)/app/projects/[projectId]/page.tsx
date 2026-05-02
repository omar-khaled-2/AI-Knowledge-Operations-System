import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FileText,
  MessageSquare,
  Database,
  Lightbulb,
  Settings,
  Clock,
} from "lucide-react";
import { formatFileSize } from "@/lib/utils";
import {
  getSessionsByProjectId,
  getInsightsByProjectId,
  formatRelativeTime,
  getBrandColor,
  type Document,
} from "@/lib/mock-data";
import { getProject } from "@/app/(app)/app/projects/actions";
import { getDocuments } from "@/app/(app)/app/projects/[projectId]/documents/actions";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/app/breadcrumbs";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import { ActionButton } from "@/components/action-button";
import { ListContainer, ListItem } from "@/components/list-container";

export default async function ProjectHomePage({
  params,
}: {
  params: { projectId: string };
}) {
  const project = await getProject(params.projectId);

  if (!project) {
    notFound();
  }

  // TODO: Replace with real data when sessions module is built
  const sessions = getSessionsByProjectId(project.id);
  // Fetch recent documents from API (server-side pagination)
  let recentDocuments: Document[] = [];
  try {
    const result = await getDocuments(params.projectId, {
      page: 1,
      limit: 5,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    recentDocuments = result.data;
  } catch (error) {
    console.error("Failed to fetch documents:", error);
  }
  // TODO: Replace with real data when insights module is built
  const insights = getInsightsByProjectId(project.id);
  const brandColor = getBrandColor(project.color);

  function getDisplaySize(doc: Document): string {
    if (typeof doc.size === "number") {
      return formatFileSize(doc.size);
    }
    return doc.size;
  }

  return (
    <div className="p-4 lg:p-8 space-y-8">
      {/* Header */}
      <PageHeader
        title={project.name}
        description={project.description}
        action={
          <Link
            href={`/app/projects/${project.id}/settings`}
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <Settings data-icon="inline-start" className="size-4" />
            Settings
          </Link>
        }
      >
        <Breadcrumbs projectId={project.id} projectName={project.name} />
      </PageHeader>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText className="size-5" />}
          label="Documents"
          value={project.documentCount}
          color={brandColor}
          className="p-5"
        />
        <StatCard
          icon={<Database className="size-5" />}
          label="Sources"
          value={project.sourceCount}
          color={brandColor}
          className="p-5"
        />
        <StatCard
          icon={<MessageSquare className="size-5" />}
          label="Sessions"
          value={project.sessionCount}
          color={brandColor}
          className="p-5"
        />
        <StatCard
          icon={<Lightbulb className="size-5" />}
          label="Insights"
          value={project.insightCount}
          color={brandColor}
          className="p-5"
        />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <ActionButton
          variant="primary"
          icon={<MessageSquare className="size-4" />}
        >
          <Link href={`/app/projects/${project.id}/chat`}>New Chat</Link>
        </ActionButton>
        <ActionButton
          variant="secondary"
          icon={<FileText className="size-4" />}
        >
          Upload Document
        </ActionButton>
        <ActionButton
          variant="secondary"
          icon={<Database className="size-4" />}
        >
          <Link href={`/app/projects/${project.id}/sources`}>
            Connect Source
          </Link>
        </ActionButton>
      </div>

      {/* Recent Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Documents */}
        <div className="flex flex-col gap-4">
          <SectionHeader
            title="Recent Documents"
            href={`/app/projects/${project.id}/documents`}
          />
          <Card className="p-0 overflow-hidden">
            <div className="divide-y divide-border">
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
                      <p className="text-sm font-medium text-foreground truncate">
                        {doc.name}
                      </p>
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
          </Card>
        </div>

        {/* Recent Sessions */}
        <div className="flex flex-col gap-4">
          <SectionHeader
            title="Recent Conversations"
            href={`/app/projects/${project.id}/chat`}
          />
          <ListContainer>
            {sessions.slice(0, 5).map((session) => (
              <ListItem
                key={session.id}
                href={`/app/projects/${project.id}/chat/${session.id}`}
                className="gap-3"
              >
                <MessageSquare className="size-5 text-[var(--muted-soft)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--ink)] truncate">
                    {session.name}
                  </p>
                  <p className="text-xs text-[var(--muted-soft)] truncate">
                    {session.preview}
                  </p>
                </div>
                <span className="text-xs text-[var(--muted-soft)] flex-shrink-0">
                  {formatRelativeTime(session.updatedAt)}
                </span>
              </ListItem>
            ))}
          </ListContainer>
        </div>
      </div>

      {/* Active Insights */}
      {insights.length > 0 && (
        <div className="space-y-4">
          <SectionHeader
            title="Active Insights"
            href={`/app/projects/${project.id}/insights`}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.slice(0, 3).map((insight) => (
              <Card key={insight.id} className="p-0">
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-[#e8b94a]/20 flex items-center justify-center">
                      <Lightbulb className="size-4 text-[#e8b94a]" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase">
                      {insight.type.replace("-", " ")}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--ink)]">
                    {insight.title}
                  </h3>
                  <p className="text-sm text-[var(--body)] line-clamp-2">
                    {insight.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--muted-soft)]">
                      {Math.round(insight.confidence * 100)}% confidence
                    </span>
                    <span className="text-xs text-[var(--muted-soft)]">
                      {formatRelativeTime(insight.timestamp)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
