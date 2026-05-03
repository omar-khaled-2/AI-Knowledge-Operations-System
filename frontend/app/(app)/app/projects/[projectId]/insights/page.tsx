"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Lightbulb,
  X,
  FileText,
  Target,
  TrendingUp,
  Link2,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Insight, formatRelativeTime } from "@/lib/mock-data";
import { Breadcrumbs } from "@/components/app/breadcrumbs";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getInsights, dismissInsight } from "./actions";
import { useWebSocket } from "@/providers/websocket-provider";
import type { InsightGeneratedPayload } from "@/types/websocket";

const typeConfig: Record<
  string,
  { icon: React.ReactNode; label: string; color: string }
> = {
  "action-item": {
    icon: <Target className="size-4" />,
    label: "Action Item",
    color: "#ff4d8b",
  },
  trend: {
    icon: <TrendingUp className="size-4" />,
    label: "Trend",
    color: "#1a3a3a",
  },
  connection: {
    icon: <Link2 className="size-4" />,
    label: "Connection",
    color: "#b8a4ed",
  },
  anomaly: {
    icon: <AlertTriangle className="size-4" />,
    label: "Anomaly",
    color: "#e8b94a",
  },
};

function InsightCard({
  insight,
  onDismiss,
}: {
  insight: Insight;
  onDismiss: (id: string) => void;
}) {
  const config = typeConfig[insight.type] || {
    icon: <Lightbulb className="size-4" />,
    label: insight.type,
    color: "#6a6a6a",
  };

  return (
    <div className="bg-[var(--surface-card)] rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="size-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: config.color + "20", color: config.color }}
          >
            {config.icon}
          </div>
          <div>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: config.color + "15",
                color: config.color,
              }}
            >
              {config.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--muted-soft)]">
            {Math.round(insight.confidence * 100)}% confidence
          </span>
        </div>
      </div>

      <h3 className="text-base font-semibold text-[var(--ink)]">{insight.title}</h3>
      <p className="text-sm text-[var(--body)]">{insight.description}</p>

      {/* Related Documents */}
      {insight.relatedDocuments.length > 0 && (
        <div className="flex items-center gap-2">
          <FileText className="size-3.5 text-[var(--muted-soft)]" />
          <span className="text-xs text-muted-foreground">
            {insight.relatedDocuments.length} related document
            {insight.relatedDocuments.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-[var(--muted-soft)]">
          {formatRelativeTime(insight.createdAt)}
        </span>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm text-[var(--ink)] bg-background border border-[var(--hairline)] rounded-lg hover:bg-[var(--surface-strong)] transition-colors">
            View Details
          </button>
          <button 
            className="p-1.5 text-[var(--muted-soft)] hover:text-red-500 transition-colors"
            aria-label="Dismiss insight"
            onClick={() => onDismiss(insight.id)}
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [insights, setInsights] = useState<Insight[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const { lastMessage } = useWebSocket();

  const fetchInsights = useCallback(
    async (filter?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getInsights(projectId, {
          type: filter && filter !== "all" ? filter : undefined,
          page: 1,
          limit: 100,
        });
        setInsights(response.data);
        setTotalCount(response.total);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load insights";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    fetchInsights(activeFilter);
  }, [fetchInsights, activeFilter]);

  // Listen for WebSocket insight.generated events
  useEffect(() => {
    if (!lastMessage || lastMessage.event !== "insight.generated") {
      return;
    }

    const payload = lastMessage.payload as InsightGeneratedPayload;
    if (payload.projectId !== projectId) return;

    // Refetch insights when new ones are generated
    fetchInsights(activeFilter);
  }, [lastMessage, projectId, activeFilter, fetchInsights]);

  const handleDismiss = async (id: string) => {
    try {
      await dismissInsight(id);
      setInsights((prev) => prev.filter((i) => i.id !== id));
      setTotalCount((prev) => prev - 1);
    } catch (err) {
      // Dismiss failed, keep the insight visible
    }
  };

  const filteredInsights = insights;

  const filters = [
    { value: "all", label: "All" },
    { value: "action-item", label: "Action Items" },
    { value: "trend", label: "Trends" },
    { value: "connection", label: "Connections" },
    { value: "anomaly", label: "Anomalies" },
  ];

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8 space-y-6">
        <PageHeader title="Insights">
          <Breadcrumbs projectId={projectId} section="insights" />
        </PageHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:p-8 space-y-6">
        <PageHeader title="Insights">
          <Breadcrumbs projectId={projectId} section="insights" />
        </PageHeader>
        <div className="flex flex-col items-center gap-4 py-12">
          <AlertCircle className="size-12 text-destructive" />
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => fetchInsights(activeFilter)}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <PageHeader title="Insights">
        <Breadcrumbs projectId={projectId} section="insights" />
      </PageHeader>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
              activeFilter === filter.value
                ? "bg-[var(--surface-card)] text-[var(--ink)]"
                : "text-muted-foreground hover:text-[var(--body)]"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{totalCount} insights</span>
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredInsights.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onDismiss={handleDismiss}
          />
        ))}
      </div>

      {filteredInsights.length === 0 && (
        <div className="text-center py-12">
          <Lightbulb className="size-12 text-[var(--hairline)] mx-auto mb-4" />
          <p className="text-muted-foreground">No insights found for this filter</p>
          <p className="text-sm text-muted-foreground/70 mt-2">
            Upload documents to generate AI-powered insights
          </p>
        </div>
      )}
    </div>
  );
}
