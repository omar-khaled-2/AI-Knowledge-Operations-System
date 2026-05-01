"use server";

import { generateUploadUrl } from "@/lib/api/documents-server";

export async function createSignedUrl(data: {
  filename: string;
  mimeType: string;
  projectId: string;
  size: number;
}) {
  try {
    const result = await generateUploadUrl(data);
    return { success: true, data: result };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate upload URL";
    console.error("[createSignedUrl] Failed:", message, "| Data:", data);
    return { success: false, error: message };
  }
}
