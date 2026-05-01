"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MessageSquare, Plus, Search, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  getProjectById,
  getSessionsByProjectId,
  formatRelativeTime,
} from "@/lib/mock-data";
import { Breadcrumbs } from "@/components/app/breadcrumbs";
import { PageHeader } from "@/components/page-header";
import { ListContainer, ListItem } from "@/components/list-container";
import { ActionButton } from "@/components/action-button";

export default function ChatSessionsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const project = getProjectById(projectId);

  if (!project) {
    return (
      <div className="p-4 lg:p-8">
        <h1 className="text-2xl font-semibold text-[var(--ink)]">
          Project not found
        </h1>
        <Link href="/app" className="text-muted-foreground hover:text-[var(--ink)]">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const sessions = getSessionsByProjectId(project.id);

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <PageHeader
        title="Conversations"
        action={
          <ActionButton variant="primary" icon={<Plus className="size-4" />}>
            <Link href={`/app/projects/${project.id}/chat/new`}>New Chat</Link>
          </ActionButton>
        }
      >
        <Breadcrumbs projectId={project.id} section="chat" />
      </PageHeader>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search conversations..."
          className="pl-12 h-11"
        />
      </div>

      {/* Sessions List */}
      <ListContainer>
        {sessions.map((session) => (
          <ListItem
            key={session.id}
            href={`/app/projects/${project.id}/chat/${session.id}`}
            className="gap-4 px-6 py-5"
          >
            <div className="size-10 rounded-xl bg-background flex items-center justify-center flex-shrink-0">
              <MessageSquare className="size-5 text-[var(--muted-soft)]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-[var(--ink)]">
                {session.name}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {session.preview}
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-[var(--muted-soft)] flex-shrink-0">
              <span>{session.messageCount} messages</span>
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {formatRelativeTime(session.lastUpdated)}
              </span>
            </div>
          </ListItem>
        ))}
      </ListContainer>
    </div>
  );
}
