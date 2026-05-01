"use server";

import {
  getDocuments as getDocumentsServer,
  getDocument as getDocumentServer,
  generateUploadUrl as generateUploadUrlServer,
  createDocument as createDocumentServer,
  deleteDocument as deleteDocumentServer,
  type PaginationOptions,
} from "@/lib/api/documents-server";

export async function getDocuments(projectId: string, options?: PaginationOptions) {
  try {
    return await getDocumentsServer(projectId, options);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch documents";
    console.error("[getDocuments] Failed:", message, "| Project ID:", projectId);
    throw new Error(message);
  }
}

export async function getDocument(id: string) {
  try {
    return await getDocumentServer(id);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch document";
    console.error("[getDocument] Failed:", message, "| ID:", id);
    throw new Error(message);
  }
}

export async function createSignedUrl(data: {
  filename: string;
  mimeType: string;
  projectId: string;
  size: number;
}) {
  try {
    return await generateUploadUrlServer(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate upload URL";
    console.error("[createSignedUrl] Failed:", message, "| Data:", data);
    throw new Error(message);
  }
}

export async function createDocument(data: {
  name: string;
  projectId: string;
  size: number;
  mimeType: string;
  sourceType: string;
  objectKey: string;
}) {
  try {
    return await createDocumentServer(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create document";
    console.error("[createDocument] Failed:", message, "| Data:", data);
    throw new Error(message);
  }
}

export async function deleteDocument(id: string) {
  try {
    await deleteDocumentServer(id);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete document";
    console.error("[deleteDocument] Failed:", message, "| ID:", id);
    throw new Error(message);
  }
}
