import { Document } from "@/lib/mock-data";

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedDocumentsResponse {
  data: Document[];
  total: number;
}

export interface GenerateUploadUrlData {
  filename: string;
  mimeType: string;
  projectId: string;
  size: number;
}

export interface GenerateUploadUrlResponse {
  uploadUrl: string;
  objectKey: string;
  document: Document;
}

/**
 * Client-side ONLY fetch wrapper.
 * All requests go through Next.js proxy at /api/*.
 * This ensures the backend is never exposed to the browser.
 *
 * For server components, use @/lib/api/documents-server instead.
 */
async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch a single document with 404 handling.
 */
async function fetchDocumentById(id: string): Promise<Document | null> {
  const response = await fetch(`/api/documents/${id}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

function buildQueryString(
  projectId: string,
  options?: PaginationOptions
): string {
  const params = new URLSearchParams();
  params.set("projectId", projectId);
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.sortBy) params.set("sortBy", options.sortBy);
  if (options?.sortOrder) params.set("sortOrder", options.sortOrder);
  return params.toString();
}

export async function getDocuments(
  projectId: string,
  options?: PaginationOptions
): Promise<PaginatedDocumentsResponse> {
  const query = buildQueryString(projectId, options);
  return fetchApi<PaginatedDocumentsResponse>(`/documents?${query}`);
}

export async function getDocument(id: string): Promise<Document | null> {
  return fetchDocumentById(id);
}

export async function generateUploadUrl(
  data: GenerateUploadUrlData
): Promise<GenerateUploadUrlResponse> {
  return fetchApi<GenerateUploadUrlResponse>("/documents/upload-url", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteDocument(id: string): Promise<void> {
  await fetchApi<void>(`/documents/${id}`, {
    method: "DELETE",
  });
}
