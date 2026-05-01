"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { createProject } from "@/lib/api/projects"

const brandColors = [
  { id: "teal", label: "Teal", value: "#1a3a3a", textLight: true },
  { id: "pink", label: "Pink", value: "#ff4d8b", textLight: true },
  { id: "lavender", label: "Lavender", value: "#b8a4ed", textLight: false },
  { id: "peach", label: "Peach", value: "#ffb084", textLight: false },
  { id: "ochre", label: "Ochre", value: "#e8b94a", textLight: false },
  { id: "cream", label: "Cream", value: "#f5f0e0", textLight: false },
] as const

export default function NewProjectPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "teal" as typeof brandColors[number]["id"],
  })

  const selectedColor = brandColors.find((c) => c.id === formData.color)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error("Please enter a project name")
      return
    }

    setIsSubmitting(true)

    try {
      const newProject = await createProject({
        name: formData.name.trim(),
        description: formData.description.trim(),
        color: formData.color,
      })

      toast.success("Project created successfully!")
      router.push(`/app/projects/${newProject.id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create project"
      toast.error(message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fffaf0]">
      <div className="max-w-2xl mx-auto px-4 lg:px-8 py-8 lg:py-12">
        {/* Header */}
        <div className="space-y-6 mb-10">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 text-sm text-[#6a6a6a] hover:text-[#0a0a0a] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1a3a3a] flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-[40px] font-medium tracking-tight text-[#0a0a0a]">
                Create New Project
              </h1>
            </div>
            <p className="text-base text-[#3a3a3a]">
              Set up a new knowledge workspace for your team
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Project Name */}
          <div className="space-y-3">
            <label
              htmlFor="name"
              className="block text-sm font-semibold text-[#0a0a0a]"
            >
              Project Name
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g., Product Strategy 2024"
              className={cn(
                "w-full px-4 py-3 bg-[#fffaf0] text-[#0a0a0a] text-base rounded-xl",
                "border border-[#e5e5e5] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]",
                "placeholder:text-[#9a9a9a]",
                "transition-colors outline-none",
                "min-h-[44px]"
              )}
              autoFocus
            />
          </div>

          {/* Project Description */}
          <div className="space-y-3">
            <label
              htmlFor="description"
              className="block text-sm font-semibold text-[#0a0a0a]"
            >
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="What is this project about?"
              rows={4}
              className={cn(
                "w-full px-4 py-3 bg-[#fffaf0] text-[#0a0a0a] text-base rounded-xl",
                "border border-[#e5e5e5] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]",
                "placeholder:text-[#9a9a9a]",
                "transition-colors outline-none resize-none"
              )}
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-[#0a0a0a]">
              Project Color
            </label>
            <div className="flex flex-wrap gap-3">
              {brandColors.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, color: color.id }))
                  }
                  className={cn(
                    "group relative w-14 h-14 rounded-2xl transition-all",
                    "focus:outline-none focus:ring-2 focus:ring-[#0a0a0a] focus:ring-offset-2 focus:ring-offset-[#fffaf0]",
                    formData.color === color.id
                      ? "ring-2 ring-[#0a0a0a] ring-offset-2 ring-offset-[#fffaf0] scale-110"
                      : "hover:scale-105"
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                  aria-label={`Select ${color.label} color`}
                  aria-pressed={formData.color === color.id}
                >
                  {formData.color === color.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check
                        className={cn(
                          "h-6 w-6",
                          color.textLight ? "text-white" : "text-[#0a0a0a]"
                        )}
                        strokeWidth={3}
                      />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className="text-sm text-[#6a6a6a]">
              Selected: <span className="font-medium text-[#0a0a0a]">{selectedColor?.label}</span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "inline-flex items-center justify-center gap-2",
                "px-6 py-3 bg-[#0a0a0a] text-white rounded-xl",
                "text-sm font-semibold",
                "hover:bg-[#1f1f1f] transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-[#0a0a0a] focus:ring-offset-2 focus:ring-offset-[#fffaf0]",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "min-h-[44px] min-w-[140px]"
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Create Project
                </>
              )}
            </button>

            <Link
              href="/app"
              className={cn(
                "inline-flex items-center justify-center",
                "px-6 py-3 bg-[#fffaf0] border border-[#e5e5e5] text-[#0a0a0a] rounded-xl",
                "text-sm font-semibold",
                "hover:bg-[#f5f0e0] transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-[#0a0a0a] focus:ring-offset-2 focus:ring-offset-[#fffaf0]",
                "min-h-[44px]"
              )}
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
