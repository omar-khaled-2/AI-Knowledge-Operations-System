import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface ActionButtonProps
  extends Omit<React.ComponentProps<typeof Button>, "variant"> {
  variant?: "primary" | "secondary"
  icon?: React.ReactNode
}

export function ActionButton({
  variant = "primary",
  icon,
  children,
  className,
  ...props
}: ActionButtonProps) {
  return (
    <Button
      variant={variant === "primary" ? "default" : "outline"}
      className={cn(
        "inline-flex items-center gap-2 px-5 py-3 h-auto rounded-xl text-sm font-semibold",
        variant === "primary" &&
          "bg-[var(--ink)] text-white hover:bg-[#1f1f1f] border-transparent",
        variant === "secondary" &&
          "bg-background border-[var(--hairline)] text-[var(--ink)] hover:bg-[var(--surface-card)]",
        className
      )}
      {...props}
    >
      {icon && <span data-icon="inline-start">{icon}</span>}
      {children}
    </Button>
  )
}
