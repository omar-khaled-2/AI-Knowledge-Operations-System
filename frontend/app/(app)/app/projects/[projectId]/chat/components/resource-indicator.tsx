"use client";

import { Paperclip } from "lucide-react";

interface ResourceIndicatorProps {
  count: number;
  isExpanded: boolean;
  onClick: () => void;
}

export function ResourceIndicator({
  count,
  isExpanded,
  onClick,
}: ResourceIndicatorProps) {
  if (count === 0) return null;

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${
        isExpanded
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
      aria-expanded={isExpanded}
      aria-label={`${count} referenced resources, click to ${
        isExpanded ? "collapse" : "expand"
      }`}
    >
      <Paperclip className="size-3" />
      <span>{count}</span>
    </button>
  );
}
