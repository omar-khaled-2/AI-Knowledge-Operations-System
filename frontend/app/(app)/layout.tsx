"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/app/app-sidebar"
import { cn } from "@/lib/utils"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#fffaf0] flex">
      {/* Sidebar */}
      <AppSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  )
}
