"use server";

import { Insight } from "@/lib/mock-data";
import { fetchWithAuth } from "@/lib/server-fetch";

export interface PaginationOptions {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
}

export interface PaginatedInsightsResponse {
  data: Insight[];
  total: number;
}

function buildQueryString(
  projectId: string,
  options?: PaginationOptions
): string {
  const params = new URLSearchParams();
  params.set("projectId", projectId);
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.status) params.set("status", options.status);
  if (options?.type) params.set("type", options.type);
  return params.toString();
}

export async function getInsights(
  projectId: string,
  options?: PaginationOptions
): Promise<PaginatedInsightsResponse> {
  try {
    const query = buildQueryString(projectId, options);
    return await fetchWithAuth<PaginatedInsightsResponse>(`/insights?${query}`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch insights";
    console.error("[getInsights] Failed:", message, "| Project ID:", projectId);
    throw new Error(message);
  }
}

export async function dismissInsight(id: string): Promise<Insight> {
  try {
    return await fetchWithAuth<Insight>(`/insights/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "dismissed" }),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to dismiss insight";
    console.error("[dismissInsight] Failed:", message, "| ID:", id);
    throw new Error(message);
  }
}
