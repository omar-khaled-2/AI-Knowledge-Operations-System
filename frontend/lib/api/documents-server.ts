import { cookies } from "next/headers";
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
}

export interface CreateDocumentData {
  name: string;
  projectId: string;
  size: number;
  mimeType: string;
  sourceType: string;
  objectKey: string;
}

// Use internal K8s service URL for server-side fetches
// In Kubernetes, this should point to the backend service (e.g., http://backend-backend)
// For local dev, falls back to localhost
const API_BASE =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

/**
 * Build Cookie header string from Next.js cookies store.
 */
function buildCookieHeader(): string {
  try {
    const cookieStore = cookies();
    // Iterate over all cookies and build the Cookie header
    const cookiePairs: string[] = [];
    cookieStore.getAll().forEach((cookie) => {
      cookiePairs.push(`${cookie.name}=${cookie.value}`);
    });
    return cookiePairs.join("; ");
  } catch {
    // If cookies() fails (e.g., outside request context), return empty
    return "";
  }
}

/**
 * Server-side fetch wrapper that forwards auth cookies.
 * ONLY use this in Server Components.
 */
async function fetchServer<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const cookieHeader = buildCookieHeader();
  const headers = new Headers(options?.headers);
  headers.set("Content-Type", "application/json");
  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    let message = `API error: ${response.status}`;
    try {
      const parsed = JSON.parse(body);
      if (parsed.message) message = parsed.message;
      else if (parsed.error) message = parsed.error;
      else if (parsed.statusCode) message = `${message} — ${body}`;
    } catch {
      if (body) message = `${message} — ${body}`;
    }
    throw new Error(message);
  }

  return response.json();
}

/**
 * Fetch a single document with graceful error handling (server-side).
 * Returns null for 404 (not found) and 400 (invalid ID format).
 */
async function fetchDocumentByIdServer(id: string): Promise<Document | null> {
  const cookieHeader = buildCookieHeader();
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }

  const response = await fetch(`${API_BASE}/documents/${id}`, {
    headers,
  });

  // 404 = not found, 400 = invalid ID format (treat as not found)
  if (response.status === 404 || response.status === 400) {
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
  return fetchServer<PaginatedDocumentsResponse>(`/documents?${query}`);
}

export async function getDocument(id: string): Promise<Document | null> {
  return fetchDocumentByIdServer(id);
}

export async function generateUploadUrl(
  data: GenerateUploadUrlData
): Promise<GenerateUploadUrlResponse> {
  return fetchServer<GenerateUploadUrlResponse>("/documents/upload-url", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function createDocument(
  data: CreateDocumentData
): Promise<Document> {
  return fetchServer<Document>("/documents", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteDocument(id: string): Promise<void> {
  await fetchServer<void>(`/documents/${id}`, {
    method: "DELETE",
  });
}
