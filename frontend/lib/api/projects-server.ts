import { cookies } from "next/headers";
import { Project } from "@/lib/mock-data";

export interface CreateProjectData {
  name: string;
  description: string;
  color: Project["color"];
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  color?: Project["color"];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// Use internal K8s service URL for server-side fetches
// In Kubernetes, this should point to the backend service (e.g., http://backend-backend)
// For local dev, falls back to localhost
const API_BASE = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
    throw new Error(`API error: ${response.status}`);
  }

  const result: ApiResponse<T> = await response.json();

  if (!result.success) {
    throw new Error(result.error || "API request failed");
  }

  return result.data;
}

/**
 * Fetch a single project with graceful error handling (server-side).
 * Returns null for 404 (not found) and 400 (invalid ID format).
 */
async function fetchProjectByIdServer(id: string): Promise<Project | null> {
  const cookieHeader = buildCookieHeader();
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }

  const response = await fetch(`${API_BASE}/projects/${id}`, {
    headers,
  });

  // 404 = not found, 400 = invalid ID format (treat as not found)
  if (response.status === 404 || response.status === 400) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const result: ApiResponse<Project> = await response.json();

  if (!result.success) {
    throw new Error(result.error || "API request failed");
  }

  return result.data;
}

export async function getProjects(): Promise<Project[]> {
  return fetchServer<Project[]>("/projects");
}

export async function getProject(id: string): Promise<Project | null> {
  return fetchProjectByIdServer(id);
}

export async function createProject(data: CreateProjectData): Promise<Project> {
  return fetchServer<Project>("/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProject(
  id: string,
  data: UpdateProjectData
): Promise<Project> {
  return fetchServer<Project>(`/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: string): Promise<void> {
  await fetchServer<void>(`/projects/${id}`, {
    method: "DELETE",
  });
}
