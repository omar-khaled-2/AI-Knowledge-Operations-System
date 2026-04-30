"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { getProjectById } from "@/lib/mock-data"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  projectId?: string
  section?: string
  itemName?: string
}

export function Breadcrumbs({ projectId, section, itemName }: BreadcrumbsProps) {
  const items: BreadcrumbItem[] = [{ label: "Projects", href: "/app" }]

  if (projectId) {
    const project = getProjectById(projectId)
    if (project) {
      items.push({ label: project.name, href: `/app/projects/${projectId}` })
    }
  }

  if (section) {
    const sectionLabels: Record<string, string> = {
      chat: "Chat",
      documents: "Documents",
      sources: "Sources",
      insights: "Insights",
    }
    items.push({
      label: sectionLabels[section] || section,
      href: projectId ? `/app/projects/${projectId}/${section}` : undefined,
    })
  }

  if (itemName) {
    items.push({ label: itemName })
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {items.map((item, index) => (
        <div key={item.label} className="flex items-center gap-1">
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-[#9a9a9a] flex-shrink-0" />
          )}
          {item.href ? (
            <Link
              href={item.href}
              className="text-[#6a6a6a] hover:text-[#0a0a0a] transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-[#0a0a0a] font-medium truncate max-w-[200px]">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}
