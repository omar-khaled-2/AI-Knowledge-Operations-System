"use server";

import {
  getProjects as getProjectsServer,
  getProject as getProjectServer,
  createProject as createProjectServer,
  updateProject as updateProjectServer,
  deleteProject as deleteProjectServer,
  type CreateProjectData,
  type UpdateProjectData,
} from "@/lib/api/projects-server";


export async function getProjects() {
  try {
    return await getProjectsServer();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch projects";
    console.error("[getProjects] Failed:", message);
    throw new Error(message);
  }
}

export async function getProject(id: string) {
  try {
    return await getProjectServer(id);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch project";
    console.error("[getProject] Failed:", message, "| ID:", id);
    throw new Error(message);
  }
}

export async function createProject(data: CreateProjectData) {
  try {
    return await createProjectServer(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create project";
    console.error("[createProject] Failed:", message, "| Data:", data);
    throw new Error(message);
  }
}

export async function updateProject(id: string, data: UpdateProjectData) {
  try {
    return await updateProjectServer(id, data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update project";
    console.error("[updateProject] Failed:", message, "| ID:", id, "| Data:", data);
    throw new Error(message);
  }
}

export async function deleteProject(id: string) {
  try {
    await deleteProjectServer(id);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete project";
    console.error("[deleteProject] Failed:", message, "| ID:", id);
    throw new Error(message);
  }
}
