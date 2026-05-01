import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  action,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {children}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-[40px] font-medium tracking-tight text-[var(--ink)]">
            {title}
          </h1>
          {description && (
            <p className="text-base text-[var(--body)] max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  )
}
