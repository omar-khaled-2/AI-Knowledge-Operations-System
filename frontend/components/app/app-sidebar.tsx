"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  ChevronDown,
  ChevronRight,
  FileText,
  Home,
  Lightbulb,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Database,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getBrandColor } from "@/lib/mock-data";
import { getProjects } from "@/lib/api/projects";
import type { Project } from "@/lib/mock-data";
import { UserNav } from "@/components/auth/user-nav";

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  isCollapsed?: boolean;
}

function SidebarItem({
  href,
  icon,
  label,
  isActive,
  isCollapsed,
}: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors min-h-[44px]",
        "focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]",
        isActive
          ? "bg-[#f5f0e0] text-[#0a0a0a] font-medium"
          : "text-[#6a6a6a] hover:bg-[#f5f0e0]/50 hover:text-[#3a3a3a]",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
        {icon}
      </span>
      {!isCollapsed && <span className="text-sm truncate">{label}</span>}
    </Link>
  );
}

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
  isCollapsed?: boolean;
  defaultOpen?: boolean;
}

function SidebarSection({
  title,
  children,
  isCollapsed,
  defaultOpen = true,
}: SidebarSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (isCollapsed) {
    return <div className="space-y-1">{children}</div>;
  }

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 w-full text-xs font-semibold text-[#9a9a9a] uppercase tracking-wider hover:text-[#6a6a6a] transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {title}
      </button>
      {isOpen && <div className="space-y-0.5">{children}</div>}
    </div>
  );
}

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
}

export function AppSidebar({ isOpen, onClose, onToggle }: AppSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real projects from API
  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await getProjects();
        setProjects(data);
      } catch (error) {
        console.error("Failed to load projects:", error);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  // Extract project ID from path if we're in a project context
  const projectMatch = pathname.match(/\/app\/projects\/([^\/]+)/);
  const currentProjectId = projectMatch?.[1];
  const currentProject = currentProjectId
    ? projects.find((p) => p.id === currentProjectId) || null
    : null;

  const isProjectActive = (projectId: string) =>
    pathname === `/app/projects/${projectId}`;
  const isProjectSection = (section: string) =>
    pathname.startsWith(`/app/projects/${currentProjectId}/${section}`);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile hamburger */}
      <button
        onClick={onToggle}
        className={cn(
          "fixed top-4 left-4 z-50 lg:hidden p-2 rounded-xl bg-[#faf5e8] border border-[#e5e5e5]",
          "focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]",
        )}
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 h-screen bg-[#faf5e8] border-r border-[#e5e5e5] z-40",
          "flex flex-col transition-all duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "w-[72px]" : "w-[240px]",
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 h-16 border-b border-[#e5e5e5]">
          <div className="flex-shrink-0 w-8 h-8 bg-[#0a0a0a] rounded-xl flex items-center justify-center">
            <Brain className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <span className="font-semibold text-[#0a0a0a] text-sm truncate">
              Knowledge Ops
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {/* Main Nav */}
          <SidebarSection title="Navigation" isCollapsed={isCollapsed}>
            <SidebarItem
              href="/app"
              icon={<Home className="h-5 w-5" />}
              label="Dashboard"
              isActive={pathname === "/app" || pathname === "/app/"}
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              href="/app"
              icon={<Search className="h-5 w-5" />}
              label="Search"
              isCollapsed={isCollapsed}
            />
          </SidebarSection>

          {/* Projects */}
          <SidebarSection title="Projects" isCollapsed={isCollapsed}>
            {loading ? (
              !isCollapsed && (
                <div className="px-3 py-2 text-sm text-[#9a9a9a]">
                  Loading...
                </div>
              )
            ) : projects.length === 0 ? (
              !isCollapsed && (
                <div className="px-3 py-2 text-sm text-[#9a9a9a]">
                  No projects yet
                </div>
              )
            ) : (
              projects.map((project) => (
                <SidebarItem
                  key={project.id}
                  href={`/app/projects/${project.id}`}
                  icon={
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{
                        backgroundColor: getBrandColor(project.color),
                      }}
                    />
                  }
                  label={project.name}
                  isActive={isProjectActive(project.id)}
                  isCollapsed={isCollapsed}
                />
              ))
            )}
            {!isCollapsed && (
              <Link
                href="/app/projects/new"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#6a6a6a] hover:text-[#3a3a3a] hover:bg-[#f5f0e0]/50 transition-colors w-full min-h-[44px]"
              >
                <Plus className="h-5 w-5" />
                <span className="text-sm">New Project</span>
              </Link>
            )}
          </SidebarSection>

          {/* Current Project Navigation */}
          {currentProject && !isCollapsed && (
            <SidebarSection
              title={currentProject.name}
              isCollapsed={isCollapsed}
            >
              <SidebarItem
                href={`/app/projects/${currentProject.id}/chat`}
                icon={<MessageSquare className="h-5 w-5" />}
                label="Chat"
                isActive={isProjectSection("chat")}
                isCollapsed={isCollapsed}
              />
              <SidebarItem
                href={`/app/projects/${currentProject.id}/documents`}
                icon={<FileText className="h-5 w-5" />}
                label="Documents"
                isActive={isProjectSection("documents")}
                isCollapsed={isCollapsed}
              />
              <SidebarItem
                href={`/app/projects/${currentProject.id}/sources`}
                icon={<Database className="h-5 w-5" />}
                label="Sources"
                isActive={isProjectSection("sources")}
                isCollapsed={isCollapsed}
              />
              <SidebarItem
                href={`/app/projects/${currentProject.id}/insights`}
                icon={<Lightbulb className="h-5 w-5" />}
                label="Insights"
                isActive={isProjectSection("insights")}
                isCollapsed={isCollapsed}
              />
            </SidebarSection>
          )}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-[#e5e5e5] p-3 space-y-2">
          <SidebarItem
            href="/app/settings"
            icon={<Settings className="h-5 w-5" />}
            label="Settings"
            isActive={pathname === "/app/settings"}
            isCollapsed={isCollapsed}
          />
          {!isCollapsed && (
            <div className="px-3 pt-2">
              <UserNav />
            </div>
          )}
        </div>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex items-center justify-center py-2 border-t border-[#e5e5e5] text-[#9a9a9a] hover:text-[#6a6a6a] transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </aside>
    </>
  );
}
