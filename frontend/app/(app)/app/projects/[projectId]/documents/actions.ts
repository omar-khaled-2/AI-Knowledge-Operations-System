"use server";

import { cookies } from "next/headers";
import { Document } from "@/lib/mock-data";
import { fetchWithAuth } from "@/lib/server-fetch";

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
  try {
    const query = buildQueryString(projectId, options);
    return await fetchWithAuth<PaginatedDocumentsResponse>(`/documents?${query}`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch documents";
    console.error("[getDocuments] Failed:", message, "| Project ID:", projectId);
    throw new Error(message);
  }
}

export async function getDocument(id: string): Promise<Document | null> {
  try {
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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch document";
    console.error("[getDocument] Failed:", message, "| ID:", id);
    throw new Error(message);
  }
}

export async function getDocumentDownloadUrl(
  id: string
): Promise<{ downloadUrl: string; mimeType: string; name: string }> {
  try {
    return await fetchWithAuth<{ downloadUrl: string; mimeType: string; name: string }>(
      `/documents/${id}/download-url`
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get document download URL";
    console.error("[getDocumentDownloadUrl] Failed:", message, "| ID:", id);
    throw new Error(message);
  }
}

export async function createSignedUrl(
  data: GenerateUploadUrlData
): Promise<GenerateUploadUrlResponse> {
  try {
    return await fetchWithAuth<GenerateUploadUrlResponse>("/documents/upload-url", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate upload URL";
    console.error("[createSignedUrl] Failed:", message, "| Data:", data);
    throw new Error(message);
  }
}

export async function createDocument(data: CreateDocumentData): Promise<Document> {
  try {
    return await fetchWithAuth<Document>("/documents", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create document";
    console.error("[createDocument] Failed:", message, "| Data:", data);
    throw new Error(message);
  }
}

export async function deleteDocument(id: string): Promise<void> {
  try {
    await fetchWithAuth<void>(`/documents/${id}`, {
      method: "DELETE",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete document";
    console.error("[deleteDocument] Failed:", message, "| ID:", id);
    throw new Error(message);
  }
}
