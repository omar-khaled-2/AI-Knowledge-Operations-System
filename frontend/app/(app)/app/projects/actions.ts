"use server";

import { cookies } from "next/headers";
import { Project } from "@/lib/mock-data";
import { fetchWithAuth } from "@/lib/server-fetch";

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

export async function getProjects(): Promise<Project[]> {
  try {
    return await fetchWithAuth<Project[]>("/projects");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch projects";
    throw new Error(message);
  }
}

export async function getProject(id: string): Promise<Project | null> {
  try {
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

    return response.json();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch project";
    throw new Error(message);
  }
}

export async function createProject(data: CreateProjectData): Promise<Project> {
  try {
    return await fetchWithAuth<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create project";
    throw new Error(message);
  }
}

export async function updateProject(
  id: string,
  data: UpdateProjectData
): Promise<Project> {
  try {
    return await fetchWithAuth<Project>(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update project";
    throw new Error(message);
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    await fetchWithAuth<void>(`/projects/${id}`, {
      method: "DELETE",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete project";
    throw new Error(message);
  }
}
