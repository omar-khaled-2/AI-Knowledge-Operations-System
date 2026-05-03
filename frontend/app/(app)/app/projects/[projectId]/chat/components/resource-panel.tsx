"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getMessages } from "../actions";
import { SnippetCard } from "./snippet-card";

interface MessageSource {
  documentId: string;
  title: string;
  snippet: string;
  score: number;
}

interface ResourcePanelProps {
  sessionId: string;
  projectId: string;
}

export function ResourcePanel({ sessionId }: ResourcePanelProps) {
  const [sources, setSources] = useState<MessageSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSources() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all messages for this session
        const result = await getMessages(sessionId, { page: 1, limit: 100 });

        if (cancelled) return;

        // Extract unique sources from all messages
        const uniqueSources = new Map<string, MessageSource>();

        result.messages.forEach((message) => {
          if (message.sources) {
            message.sources.forEach((source) => {
              // Deduplicate by documentId, keep highest score
              const existing = uniqueSources.get(source.documentId);
              if (!existing || source.score > existing.score) {
                uniqueSources.set(source.documentId, source);
              }
            });
          }
        });

        // Sort by score descending and take top 5
        const sortedSources = Array.from(uniqueSources.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

        setSources(sortedSources);
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load resources";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadSources();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="py-4 flex items-center justify-center">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading resources...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-2 px-3 bg-destructive/10 rounded-lg">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="py-2 px-3">
        <p className="text-sm text-muted-foreground">No resources referenced</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 py-2">
      {sources.map((source) => (
        <SnippetCard
          key={source.documentId}
          documentId={source.documentId}
          title={source.title}
          snippet={source.snippet}
          score={source.score}
        />
      ))}
    </div>
  );
}
