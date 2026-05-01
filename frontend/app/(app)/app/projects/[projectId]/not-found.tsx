import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function ProjectNotFound() {
  return (
    <div className="p-4 lg:p-8 flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold text-[#0a0a0a]">Project not found</h1>
      <p className="text-base text-[#3a3a3a]">
        The project you are looking for does not exist or you do not have access to it.
      </p>
      <Link
        href="/app"
        className="inline-flex items-center gap-2 text-sm text-[#6a6a6a] hover:text-[#0a0a0a] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
    </div>
  )
}
