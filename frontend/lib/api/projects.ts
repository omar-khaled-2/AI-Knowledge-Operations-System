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

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

/**
 * Client-side ONLY fetch wrapper.
 * All requests go through Next.js proxy at /api/*.
 * This ensures the backend is never exposed to the browser.
 * 
 * For server components, use @/lib/api/projects-server instead.
 */
async function fetchApi<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
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

  const result: ApiResponse<T> = await response.json();

  if (!result.success) {
    throw new Error(result.error ?? "API request failed");
  }

  return result.data;
}

/**
 * Fetch a single project with 404 handling.
 */
async function fetchProjectById(id: string): Promise<Project | null> {
  const response = await fetch(`/api/projects/${id}`, {
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

  const result: ApiResponse<Project> = await response.json();

  if (!result.success) {
    throw new Error(result.error ?? "API request failed");
  }

  return result.data;
}

export async function getProjects(): Promise<Project[]> {
  return fetchApi<Project[]>("/projects");
}

export async function getProject(id: string): Promise<Project | null> {
  return fetchProjectById(id);
}

export async function createProject(data: CreateProjectData): Promise<Project> {
  return fetchApi<Project>("/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProject(
  id: string,
  data: UpdateProjectData
): Promise<Project> {
  return fetchApi<Project>(`/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: string): Promise<void> {
  await fetchApi<void>(`/projects/${id}`, {
    method: "DELETE",
  });
}
