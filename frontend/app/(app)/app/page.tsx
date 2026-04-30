"use client";

import Link from "next/link";
import {
  FileText,
  MessageSquare,
  Lightbulb,
  FolderOpen,
  Plus,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mockProjects, getBrandColor } from "@/lib/mock-data";

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-[#f5f0e0] rounded-2xl p-6 space-y-2">
      <div className="flex items-center justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: color + "20" }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      <p className="text-[32px] font-medium text-[#0a0a0a] tracking-tight">
        {value}
      </p>
      <p className="text-sm text-[#6a6a6a]">{label}</p>
    </div>
  );
}

function ProjectCard({ project }: { project: (typeof mockProjects)[0] }) {
  const brandColor = getBrandColor(project.color);
  const isDark = project.color === "teal" || project.color === "pink";

  return (
    <Link
      href={`/app/projects/${project.id}`}
      className={cn(
        "block rounded-2xl p-6 space-y-4 transition-transform hover:scale-[1.02]",
        "focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]",
        "bg-[#f5f0e0]",
      )}
    >
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold text-[#0a0a0a]">
          {project.name}
        </h3>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: brandColor }}
        >
          <ArrowRight className="h-4 w-4 text-white" />
        </div>
      </div>
      <p className="text-sm line-clamp-2 text-[#3a3a3a]">
        {project.description}
      </p>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-[#6a6a6a]">
          {project.documentCount} docs
        </span>
        <span className="text-[#6a6a6a]">
          {project.sessionCount} chats
        </span>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const totalDocuments = mockProjects.reduce(
    (sum, p) => sum + p.documentCount,
    0,
  );
  const totalSessions = mockProjects.reduce(
    (sum, p) => sum + p.sessionCount,
    0,
  );
  const totalInsights = mockProjects.reduce(
    (sum, p) => sum + p.insightCount,
    0,
  );

  return (
    <div className="p-4 lg:p-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-[40px] font-medium tracking-tight text-[#0a0a0a]">
          Welcome back
        </h1>
        <p className="text-base text-[#3a3a3a]">
          Here&apos;s what&apos;s happening across your projects
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FolderOpen className="h-5 w-5" />}
          label="Total Projects"
          value={mockProjects.length}
          color="#1a3a3a"
        />
        <StatCard
          icon={<MessageSquare className="h-5 w-5" />}
          label="Active Sessions"
          value={totalSessions}
          color="#ff4d8b"
        />
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          label="Documents"
          value={totalDocuments}
          color="#b8a4ed"
        />
        <StatCard
          icon={<Lightbulb className="h-5 w-5" />}
          label="Insights"
          value={totalInsights}
          color="#e8b94a"
        />
      </div>

      {/* Projects Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#0a0a0a]">
            Recent Projects
          </h2>
          <Link
            href="/app"
            className="text-sm text-[#6a6a6a] hover:text-[#0a0a0a] transition-colors"
          >
            View all
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
          <Link
            href="/app/projects/new"
            className="rounded-2xl p-6 border-2 border-dashed border-[#e5e5e5] flex flex-col items-center justify-center gap-3 min-h-[180px] hover:border-[#0a0a0a]/30 transition-colors"
          >
            <Plus className="h-8 w-8 text-[#9a9a9a]" />
            <span className="text-sm font-medium text-[#6a6a6a]">
              Create New Project
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
