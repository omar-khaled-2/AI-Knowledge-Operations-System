import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface SectionHeaderProps {
  title: string
  href?: string
  action?: React.ReactNode
  className?: string
}

export function SectionHeader({
  title,
  href,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <h2 className="text-lg font-semibold text-[var(--ink)]">{title}</h2>
      {action ? (
        <div className="flex-shrink-0">{action}</div>
      ) : href ? (
        <Link
          href={href}
          className="text-sm text-muted-foreground hover:text-[var(--ink)] transition-colors flex items-center gap-1"
        >
          View all <ArrowRight className="size-4" />
        </Link>
      ) : null}
    </div>
  )
}
