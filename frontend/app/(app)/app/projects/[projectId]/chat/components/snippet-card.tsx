"use client";

import { FileText } from "lucide-react";

interface SnippetCardProps {
  documentId: string;
  title: string;
  snippet: string;
  score: number;
}

export function SnippetCard({ title, snippet }: SnippetCardProps) {
  // Truncate snippet to ~150 characters
  const truncatedSnippet =
    snippet.length > 150 ? snippet.slice(0, 150) + "..." : snippet;

  return (
    <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
      <div className="flex items-start gap-2">
        <FileText className="size-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground truncate">
            {title}
          </h4>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
            {truncatedSnippet}
          </p>
        </div>
      </div>
    </div>
  );
}
