"use client"

import { useState, useRef, useEffect } from "react"
import { authClient, useSession } from "@/lib/auth-client"
import { Settings, LogOut, ChevronDown } from "lucide-react"
import Link from "next/link"

export function UserNav() {
  const { data: session, isPending } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Close on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [])

  const handleSignOut = async () => {
    await authClient.signOut()
    window.location.href = "/signin"
  }

  if (isPending) {
    return (
      <div className="h-8 w-8 rounded-full bg-[#f5f0e0] animate-pulse" />
    )
  }

  if (!session?.user) {
    return null
  }

  const user = session.user
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U"

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#0a0a0a] focus:ring-offset-2 rounded-full"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <div className="h-8 w-8 rounded-full bg-[#0a0a0a] text-white flex items-center justify-center text-xs font-semibold">
          {initials}
        </div>
        <span className="text-sm font-medium text-[#0a0a0a] hidden sm:inline">
          {user.name}
        </span>
        <ChevronDown className="h-4 w-4 text-[#6a6a6a] hidden sm:inline" />
      </button>

      {isOpen && (
        <div
          className="
            absolute left-0 bottom-full mb-2 w-56
            bg-[#fffaf0] border border-[#e5e5e5]
            rounded-2xl
            shadow-sm
            py-2
            z-50
          "
          role="menu"
        >
          <div className="px-4 py-3 border-b border-[#f0f0f0]">
            <p className="text-sm font-semibold text-[#0a0a0a]">{user.name}</p>
            <p className="text-xs text-[#6a6a6a] truncate">{user.email}</p>
          </div>

          <Link
            href="/app/settings"
            className="
              flex items-center gap-2 px-4 py-2.5
              text-sm text-[#0a0a0a]
              hover:bg-[#faf5e8]
              transition-colors
            "
            role="menuitem"
            onClick={() => setIsOpen(false)}
          >
            <Settings className="h-4 w-4 text-[#6a6a6a]" />
            Settings
          </Link>

          <button
            onClick={handleSignOut}
            className="
              flex items-center gap-2 px-4 py-2.5 w-full
              text-sm text-[#0a0a0a]
              hover:bg-[#faf5e8]
              transition-colors
            "
            role="menuitem"
          >
            <LogOut className="h-4 w-4 text-[#6a6a6a]" />
            Logout
          </button>
        </div>
      )}
    </div>
  )
}
