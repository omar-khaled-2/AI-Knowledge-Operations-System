import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  color?: string
  className?: string
}

export function StatCard({
  icon,
  label,
  value,
  color,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("p-5 space-y-2", className)}>
      <div className="flex items-center justify-between">
        {color ? (
          <div
            className="size-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: color + "20", color }}
          >
            {icon}
          </div>
        ) : (
          <div className="size-10 rounded-xl bg-[var(--surface-strong)] flex items-center justify-center text-[var(--muted-soft)]">
            {icon}
          </div>
        )}
      </div>
      <p className="text-[28px] font-medium text-[var(--ink)] tracking-tight">
        {value}
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </Card>
  )
}
