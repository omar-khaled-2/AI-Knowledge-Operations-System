import Link from "next/link"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

interface ListContainerProps {
  children: React.ReactNode
  className?: string
}

export function ListContainer({ children, className }: ListContainerProps) {
  return (
    <Card className={cn("p-0 overflow-hidden divide-y divide-border", className)}>
      {children}
    </Card>
  )
}

interface ListItemProps {
  children: React.ReactNode
  href?: string
  className?: string
}

export function ListItem({ children, href, className }: ListItemProps) {
  const classes = cn(
    "flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-strong)] transition-colors",
    className
  )

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  return <div className={classes}>{children}</div>
}
