"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MessageSquare, Plus, Search, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  getSessions,
  type PaginatedSessionsResponse,
} from "./actions";
import { Breadcrumbs } from "@/components/app/breadcrumbs";
import { PageHeader } from "@/components/page-header";
import { ListContainer, ListItem } from "@/components/list-container";
import { ActionButton } from "@/components/action-button";

interface ChatSessionsClientProps {
  projectId: string;
  projectName: string;
  initialSessions: PaginatedSessionsResponse["data"];
}

export function ChatSessionsClient({
  projectId,
  projectName,
  initialSessions,
}: ChatSessionsClientProps) {
  const [sessions, setSessions] = useState<PaginatedSessionsResponse["data"]>(initialSessions);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getSessions(projectId, {
        page: 1,
        limit: 50,
        sortBy: "updatedAt",
        sortOrder: "desc",
      });
      setSessions(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load sessions";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    // Only fetch if no initial sessions were provided
    if (initialSessions.length === 0) {
      loadSessions();
    }
  }, [loadSessions, initialSessions.length]);

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const filteredSessions = searchQuery
    ? sessions.filter(
        (session) =>
          session.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (session.preview?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      )
    : sessions;

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <PageHeader
        title="Conversations"
        action={
          <ActionButton variant="primary" icon={<Plus className="size-4" />}>
            <Link href={`/app/projects/${projectId}/chat/new`}>New Chat</Link>
          </ActionButton>
        }
      >
        <Breadcrumbs projectId={projectId} projectName={projectName} section="chat" />
      </PageHeader>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search conversations..."
          className="pl-12 h-11"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
          <p>{error}</p>
          <button
            onClick={loadSessions}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredSessions.length === 0 && (
        <div className="text-center py-12 space-y-4">
          <MessageSquare className="mx-auto size-12 text-muted-foreground/50" />
          <h3 className="text-lg font-medium text-[var(--ink)]">
            {searchQuery ? "No conversations match your search" : "No conversations yet"}
          </h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            {searchQuery
              ? "Try a different search term or clear your search."
              : "Start a new chat to begin exploring your project knowledge."}
          </p>
          {!searchQuery && (
            <ActionButton variant="primary" icon={<Plus className="size-4" />}>
              <Link href={`/app/projects/${projectId}/chat/new`}>Start New Chat</Link>
            </ActionButton>
          )}
        </div>
      )}

      {/* Sessions List */}
      {!isLoading && !error && filteredSessions.length > 0 && (
        <ListContainer>
          {filteredSessions.map((session) => (
            <ListItem
              key={session.id}
              href={`/app/projects/${projectId}/chat/${session.id}`}
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
                  {session.preview || "No messages yet"}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm text-[var(--muted-soft)] flex-shrink-0">
                <span>{session.messageCount} messages</span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {formatRelativeTime(session.updatedAt)}
                </span>
              </div>
            </ListItem>
          ))}
        </ListContainer>
      )}
    </div>
  );
}
