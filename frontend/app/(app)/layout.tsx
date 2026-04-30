import { ReactNode } from "react"
import { UserNav } from "@/components/auth/user-nav"
import Link from "next/link"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fffaf0]">
      {/* Top Navigation */}
      <header className="h-16 bg-[#fffaf0] border-b border-[#e5e5e5]">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <Link href="/app" className="text-lg font-semibold text-[#0a0a0a]">
            AI Knowledge Operations
          </Link>
          <UserNav />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
