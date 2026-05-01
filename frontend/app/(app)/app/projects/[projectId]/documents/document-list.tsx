"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  LayoutGrid,
  List,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { Document, formatRelativeTime } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDocuments, type PaginationMeta } from "@/lib/api/documents";

const sourceTypeLabels: Record<string, string> = {
  upload: "Uploaded",
  notion: "Notion",
  slack: "Slack",
  "google-drive": "Google Drive",
  confluence: "Confluence",
  github: "GitHub",
};

function getDisplaySize(doc: Document): string {
  if (typeof doc.size === "number") {
    return formatFileSize(doc.size);
  }
  return doc.size;
}

function SourceTypeIcon({ sourceType }: { sourceType: string }) {
  const icons: Record<string, React.ReactNode> = {
    upload: <FileText />,
    notion: <span className="text-xs font-bold">N</span>,
    slack: <span className="text-xs font-bold">S</span>,
    "google-drive": <span className="text-xs font-bold">G</span>,
    confluence: <span className="text-xs font-bold">C</span>,
    github: <span className="text-xs font-bold">GH</span>,
  };

  const icon = icons[sourceType] ?? <FileText />;
  const label = sourceTypeLabels[sourceType] ?? sourceType;

  return (
    <TooltipProvider delay={0}>
      <Tooltip>
        <TooltipTrigger
          render={<div className="flex items-center justify-center">{icon}</div>}
        />
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function DocumentCard({
  document,
  projectId,
}: {
  document: Document;
  projectId: string;
}) {
  const statusConfig = {
    processed: {
      icon: <CheckCircle2 className="text-emerald-500" />,
      badge: <Badge variant="default">Processed</Badge>,
    },
    processing: {
      icon: <Loader2 className="animate-spin text-amber-500" />,
      badge: <Badge variant="secondary">Processing</Badge>,
    },
    error: {
      icon: <AlertCircle className="text-destructive" />,
      badge: <Badge variant="destructive">Error</Badge>,
    },
  };

  const status = statusConfig[document.status];

  return (
    <Link
      href={`/app/projects/${projectId}/documents/${document.id}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
    >
      <Card className="transition-all hover:shadow-md hover:scale-[1.02] h-full">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted border border-border text-muted-foreground">
              <SourceTypeIcon sourceType={document.sourceType} />
            </div>
            <div className="flex-shrink-0">{status.icon}</div>
          </div>
          <h3 className="text-sm font-semibold text-foreground line-clamp-2">
            {document.name}
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground/70">
            <span>{getDisplaySize(document)}</span>
            {document.pageCount && <span>{document.pageCount} pages</span>}
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {formatRelativeTime(document.createdAt)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function DocumentListItem({
  document,
  projectId,
}: {
  document: Document;
  projectId: string;
}) {
  const statusIcons = {
    processed: <CheckCircle2 className="text-emerald-500" />,
    processing: <Loader2 className="animate-spin text-amber-500" />,
    error: <AlertCircle className="text-destructive" />,
  };

  return (
    <>
      <Link
        href={`/app/projects/${projectId}/documents/${document.id}`}
        className="flex items-center gap-4 px-4 py-3 hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="flex-shrink-0 text-muted-foreground">
          <SourceTypeIcon sourceType={document.sourceType} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {document.name}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground/70">
          <span className="capitalize">
            {document.sourceType.replace("-", " ")}
          </span>
          <span>{getDisplaySize(document)}</span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {formatRelativeTime(document.createdAt)}
          </span>
        </div>
        <div className="flex-shrink-0">{statusIcons[document.status]}</div>
      </Link>
    </>
  );
}

function getPageNumbers(
  currentPage: number,
  totalPages: number
): (number | "ellipsis")[] {
  const pages: (number | "ellipsis")[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  pages.push(1);

  if (currentPage > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (currentPage < totalPages - 2) {
    pages.push("ellipsis");
  }

  pages.push(totalPages);

  return pages;
}

interface DocumentListProps {
  projectId: string;
}

export function DocumentList({ projectId }: DocumentListProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(
    async (page: number, limit: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getDocuments(projectId, {
          page,
          limit,
          sortBy: "createdAt",
          sortOrder: "desc",
        });
        setDocuments(result.documents);
        setPagination(result.pagination);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load documents";
        setError(message);
        console.error("Failed to fetch documents:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    fetchDocuments(currentPage, itemsPerPage);
  }, [fetchDocuments, currentPage, itemsPerPage]);

  // Search is client-side only on the current page
  const filteredDocuments = documents.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value: string | null) => {
    if (value) {
      setItemsPerPage(Number(value));
      setCurrentPage(1);
    }
  };

  const totalPages = pagination?.totalPages ?? 0;
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(
    startIndex + itemsPerPage - 1,
    pagination?.total ?? 0
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <AlertCircle className="size-12 text-destructive" />
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => fetchDocuments(currentPage, itemsPerPage)}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Search and View Toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <ToggleGroup
          value={viewMode ? [viewMode] : undefined}
          onValueChange={(value) => {
            const selected = value?.[0];
            if (selected) setViewMode(selected as "grid" | "list");
          }}
          variant="outline"
          spacing={0}
        >
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <LayoutGrid />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <List />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Documents */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-foreground">All Documents</h2>
          <span className="text-sm text-muted-foreground">
            Showing{" "}
            {filteredDocuments.length > 0 ? startIndex : 0}-
            {Math.min(endIndex, startIndex + filteredDocuments.length - 1)} of{" "}
            {pagination?.total ?? 0}
          </span>
        </div>

        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                projectId={projectId}
              />
            ))}
          </div>
        ) : (
          <Card className="p-0 overflow-hidden">
            {filteredDocuments.map((document, index) => (
              <div key={document.id}>
                <DocumentListItem
                  document={document}
                  projectId={projectId}
                />
                {index < filteredDocuments.length - 1 && <Separator />}
              </div>
            ))}
          </Card>
        )}

        {filteredDocuments.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-12">
            <FileText className="size-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No documents found</p>
          </div>
        )}

        {/* Pagination and Items Per Page */}
        {pagination && pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Items per page:</span>
              <Select
                value={String(itemsPerPage)}
                onValueChange={handleItemsPerPageChange}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12</SelectItem>
                  <SelectItem value="24">24</SelectItem>
                  <SelectItem value="48">48</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        setCurrentPage((p) => Math.max(1, p - 1))
                      }
                      className={cn(
                        currentPage === 1 && "pointer-events-none opacity-50"
                      )}
                    />
                  </PaginationItem>

                  {getPageNumbers(currentPage, totalPages).map((page, index) =>
                    page === "ellipsis" ? (
                      <PaginationItem key={`ellipsis-${index}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={page}>
                        <PaginationLink
                          isActive={currentPage === page}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      className={cn(
                        currentPage === totalPages &&
                          "pointer-events-none opacity-50"
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
