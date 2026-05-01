"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MessageSquare, Plus, Search, Clock } from "lucide-react";
import {
  getProjectById,
  getSessionsByProjectId,
  formatRelativeTime,
} from "@/lib/mock-data";
import { Breadcrumbs } from "@/components/app/breadcrumbs";

export default function ChatSessionsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const project = getProjectById(projectId);

  if (!project) {
    return (
      <div className="p-4 lg:p-8">
        <h1 className="text-2xl font-semibold text-[#0a0a0a]">
          Project not found
        </h1>
        <Link href="/app" className="text-[#6a6a6a] hover:text-[#0a0a0a]">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const sessions = getSessionsByProjectId(project.id);

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Breadcrumbs projectId={project.id} section="chat" />
        <div className="flex items-center justify-between">
          <h1 className="text-[40px] font-medium tracking-tight text-[#0a0a0a]">
            Conversations
          </h1>
          <Link
            href={`/app/projects/${project.id}/chat/new`}
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#0a0a0a] text-white rounded-xl text-sm font-semibold hover:bg-[#1f1f1f] transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9a9a9a]" />
        <input
          type="text"
          placeholder="Search conversations..."
          className="w-full h-11 pl-12 pr-4 bg-[#fffaf0] border border-[#e5e5e5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]"
        />
      </div>

      {/* Sessions List */}
      <div className="bg-[#f5f0e0] rounded-2xl divide-y divide-[#e5e5e5]">
        {sessions.map((session) => (
          <Link
            key={session.id}
            href={`/app/projects/${project.id}/chat/${session.id}`}
            className="flex items-center gap-4 px-6 py-5 hover:bg-[#ebe6d6] transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#fffaf0] flex items-center justify-center flex-shrink-0">
              <MessageSquare className="h-5 w-5 text-[#6a6a6a]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-[#0a0a0a] group-hover:text-[#0a0a0a]">
                {session.name}
              </h3>
              <p className="text-sm text-[#6a6a6a] truncate">
                {session.preview}
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-[#9a9a9a] flex-shrink-0">
              <span>{session.messageCount} messages</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatRelativeTime(session.lastUpdated)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
