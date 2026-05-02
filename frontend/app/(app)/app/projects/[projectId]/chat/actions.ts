"use server";

import { cookies } from "next/headers";
import { Session } from "@/lib/mock-data";
import { fetchWithAuth } from "@/lib/server-fetch";

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedSessionsResponse {
  data: Session[];
  total: number;
}

export interface CreateSessionData {
  name: string;
  projectId: string;
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

export async function getSessions(
  projectId: string,
  options?: PaginationOptions
): Promise<PaginatedSessionsResponse> {
  try {
    const query = buildQueryString(projectId, options);
    return await fetchWithAuth<PaginatedSessionsResponse>(`/sessions?${query}`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch sessions";
    console.error("[getSessions] Failed:", message, "| Project ID:", projectId);
    throw new Error(message);
  }
}

export async function getSession(id: string): Promise<Session | null> {
  try {
    const cookieHeader = buildCookieHeader();
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    if (cookieHeader) {
      headers.set("Cookie", cookieHeader);
    }

    const response = await fetch(`${API_BASE}/sessions/${id}`, {
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
      error instanceof Error ? error.message : "Failed to fetch session";
    console.error("[getSession] Failed:", message, "| ID:", id);
    throw new Error(message);
  }
}

export async function createSession(data: CreateSessionData): Promise<Session> {
  try {
    return await fetchWithAuth<Session>("/sessions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create session";
    console.error("[createSession] Failed:", message, "| Data:", data);
    throw new Error(message);
  }
}

export async function deleteSession(id: string): Promise<void> {
  try {
    await fetchWithAuth<void>(`/sessions/${id}`, {
      method: "DELETE",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete session";
    console.error("[deleteSession] Failed:", message, "| ID:", id);
    throw new Error(message);
  }
}

export interface Message {
  id: string;
  sessionId: string;
  userId: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: Array<{
    documentId: string;
    title: string;
    snippet: string;
    score: number;
  }>;
  createdAt: string;
}

export interface PaginatedMessagesResponse {
  messages: Message[];
  total: number;
}

export async function getMessages(
  sessionId: string,
  options?: { page?: number; limit?: number }
): Promise<PaginatedMessagesResponse> {
  try {
    const params = new URLSearchParams();
    if (options?.page) params.set("page", String(options.page));
    if (options?.limit) params.set("limit", String(options.limit));
    const query = params.toString();
    const path = `/api/v1/chat/sessions/${sessionId}/messages${query ? `?${query}` : ""}`;
    return await fetchWithAuth<PaginatedMessagesResponse>(path);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch messages";
    console.error("[getMessages] Failed:", message, "| Session ID:", sessionId);
    throw new Error(message);
  }
}

export async function createMessage(
  sessionId: string,
  data: {
    role: "user" | "assistant" | "system";
    content: string;
    sources?: Array<{
      documentId: string;
      title: string;
      snippet: string;
      score: number;
    }>;
  }
): Promise<Message> {
  try {
    const path = `/api/v1/chat/sessions/${sessionId}/messages`;
    return await fetchWithAuth<Message>(path, {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create message";
    console.error("[createMessage] Failed:", message, "| Session ID:", sessionId);
    throw new Error(message);
  }
}
