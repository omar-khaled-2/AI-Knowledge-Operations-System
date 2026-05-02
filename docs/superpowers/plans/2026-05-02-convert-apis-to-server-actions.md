# Convert All Frontend APIs to Next.js Server Actions

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate all API communication into proper Next.js Server Actions, eliminating the intermediate `lib/api/*-server.ts` layer.

**Architecture:** Create a shared `fetchWithAuth` helper in `lib/server-fetch.ts`, move all domain-specific fetch logic directly into existing server action files (`actions.ts`), update all imports in server components, and delete obsolete files.

**Tech Stack:** Next.js 14+, TypeScript, React Server Components, Server Actions

---

## File Structure Changes

- **Create:** `frontend/lib/server-fetch.ts` — Generic authenticated fetch helper
- **Modify:** `frontend/app/(app)/app/projects/actions.ts` — Inline all project API logic with `"use server"`
- **Modify:** `frontend/app/(app)/app/projects/[projectId]/documents/actions.ts` — Inline all document API logic with `"use server"`
- **Modify:** `frontend/app/(app)/app/page.tsx` — Update import from `projects-server` to `projects/actions`
- **Modify:** `frontend/app/(app)/app/projects/[projectId]/page.tsx` — Update imports from `*-server` to `actions`
- **Modify:** `frontend/app/(app)/app/projects/[projectId]/documents/page.tsx` — Update import from `projects-server` to `projects/actions`
- **Delete:** `frontend/lib/api/projects-server.ts`
- **Delete:** `frontend/lib/api/documents-server.ts`
- **Delete:** `frontend/lib/api/projects-server.test.ts`
- **Delete:** `frontend/lib/api/documents-server.test.ts`
- **Delete (if empty):** `frontend/lib/api/` directory

---

### Task 1: Create Shared `fetchWithAuth` Helper

**Files:**
- Create: `frontend/lib/server-fetch.ts`

- [ ] **Step 1: Write the `fetchWithAuth` helper**

```typescript
import { cookies } from "next/headers";

const API_BASE =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

function buildCookieHeader(): string {
  try {
    const cookieStore = cookies();
    const cookiePairs: string[] = [];
    cookieStore.getAll().forEach((cookie) => {
      cookiePairs.push(`${cookie.name}=${cookie.value}`);
    });
    return cookiePairs.join("; ");
  } catch {
    return "";
  }
}

export async function fetchWithAuth<T>(
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
```

- [ ] **Step 2: Commit**

```bash
cd /home/omar/Developments/AI-Knowledge-Operations-System/frontend
git add lib/server-fetch.ts
git commit -m "feat: add shared fetchWithAuth server helper"
```

---

### Task 2: Migrate Project Server Actions

**Files:**
- Modify: `frontend/app/(app)/app/projects/actions.ts`

- [ ] **Step 1: Replace thin wrappers with inline implementation**

```typescript
"use server";

import { fetchWithAuth } from "@/lib/server-fetch";
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

export async function getProjects(): Promise<Project[]> {
  try {
    return await fetchWithAuth<Project[]>("/projects");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch projects";
    console.error("[getProjects] Failed:", message);
    throw new Error(message);
  }
}

export async function getProject(id: string): Promise<Project | null> {
  try {
    const cookieHeader = (() => {
      try {
        const { cookies } = require("next/headers");
        const cookieStore = cookies();
        const cookiePairs: string[] = [];
        cookieStore.getAll().forEach((cookie: { name: string; value: string }) => {
          cookiePairs.push(`${cookie.name}=${cookie.value}`);
        });
        return cookiePairs.join("; ");
      } catch {
        return "";
      }
    })();

    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    if (cookieHeader) {
      headers.set("Cookie", cookieHeader);
    }

    const API_BASE =
      process.env.API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:3001";

    const response = await fetch(`${API_BASE}/projects/${id}`, { headers });

    if (response.status === 404 || response.status === 400) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch project";
    console.error("[getProject] Failed:", message, "| ID:", id);
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
    const message = error instanceof Error ? error.message : "Failed to create project";
    console.error("[createProject] Failed:", message, "| Data:", data);
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
    const message = error instanceof Error ? error.message : "Failed to update project";
    console.error("[updateProject] Failed:", message, "| ID:", id, "| Data:", data);
    throw new Error(message);
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    await fetchWithAuth<void>(`/projects/${id}`, {
      method: "DELETE",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete project";
    console.error("[deleteProject] Failed:", message, "| ID:", id);
    throw new Error(message);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(app)/app/projects/actions.ts
git commit -m "refactor: inline project API logic into server actions"
```

---

### Task 3: Migrate Document Server Actions

**Files:**
- Modify: `frontend/app/(app)/app/projects/[projectId]/documents/actions.ts`

- [ ] **Step 1: Replace thin wrappers with inline implementation**

```typescript
"use server";

import { fetchWithAuth } from "@/lib/server-fetch";
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
    const message = error instanceof Error ? error.message : "Failed to fetch documents";
    console.error("[getDocuments] Failed:", message, "| Project ID:", projectId);
    throw new Error(message);
  }
}

export async function getDocument(id: string): Promise<Document | null> {
  try {
    const cookieHeader = (() => {
      try {
        const { cookies } = require("next/headers");
        const cookieStore = cookies();
        const cookiePairs: string[] = [];
        cookieStore.getAll().forEach((cookie: { name: string; value: string }) => {
          cookiePairs.push(`${cookie.name}=${cookie.value}`);
        });
        return cookiePairs.join("; ");
      } catch {
        return "";
      }
    })();

    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    if (cookieHeader) {
      headers.set("Cookie", cookieHeader);
    }

    const API_BASE =
      process.env.API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:3001";

    const response = await fetch(`${API_BASE}/documents/${id}`, { headers });

    if (response.status === 404 || response.status === 400) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch document";
    console.error("[getDocument] Failed:", message, "| ID:", id);
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
    const message = error instanceof Error ? error.message : "Failed to generate upload URL";
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
    const message = error instanceof Error ? error.message : "Failed to create document";
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
    const message = error instanceof Error ? error.message : "Failed to delete document";
    console.error("[deleteDocument] Failed:", message, "| ID:", id);
    throw new Error(message);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(app)/app/projects/[projectId]/documents/actions.ts
git commit -m "refactor: inline document API logic into server actions"
```

---

### Task 4: Update Server Component Imports

**Files:**
- Modify: `frontend/app/(app)/app/page.tsx`
- Modify: `frontend/app/(app)/app/projects/[projectId]/page.tsx`
- Modify: `frontend/app/(app)/app/projects/[projectId]/documents/page.tsx`

- [ ] **Step 1: Update `page.tsx` import**

```typescript
// Change line 11 from:
import { getProjects } from "@/lib/api/projects-server";
// To:
import { getProjects } from "@/app/(app)/app/projects/actions";
```

- [ ] **Step 2: Update `[projectId]/page.tsx` imports**

```typescript
// Change lines 19-20 from:
import { getProject } from "@/lib/api/projects-server"
import { getDocuments } from "@/lib/api/documents-server"
// To:
import { getProject } from "@/app/(app)/app/projects/actions"
import { getDocuments } from "@/app/(app)/app/projects/[projectId]/documents/actions"
```

- [ ] **Step 3: Update `[projectId]/documents/page.tsx` import**

```typescript
// Change line 3 from:
import { getProject } from "@/lib/api/projects-server"
// To:
import { getProject } from "@/app/(app)/app/projects/actions"
```

- [ ] **Step 4: Commit**

```bash
git add app/(app)/app/page.tsx app/(app)/app/projects/[projectId]/page.tsx app/(app)/app/projects/[projectId]/documents/page.tsx
git commit -m "refactor: update server components to import from server actions"
```

---

### Task 5: Delete Obsolete Files

**Files:**
- Delete: `frontend/lib/api/projects-server.ts`
- Delete: `frontend/lib/api/documents-server.ts`
- Delete: `frontend/lib/api/projects-server.test.ts`
- Delete: `frontend/lib/api/documents-server.test.ts`
- Delete (if empty): `frontend/lib/api/`

- [ ] **Step 1: Delete the files**

```bash
cd /home/omar/Developments/AI-Knowledge-Operations-System/frontend
rm lib/api/projects-server.ts
rm lib/api/documents-server.ts
rm lib/api/projects-server.test.ts
rm lib/api/documents-server.test.ts
rmdir lib/api/ 2>/dev/null || true
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove obsolete lib/api/*-server.ts files and tests"
```

---

### Task 6: Verify No Remaining Imports

- [ ] **Step 1: Search for remaining imports**

```bash
cd /home/omar/Developments/AI-Knowledge-Operations-System/frontend
grep -r "@/lib/api/projects-server" --include="*.ts" --include="*.tsx" . || echo "No remaining projects-server imports"
grep -r "@/lib/api/documents-server" --include="*.ts" --include="*.tsx" . || echo "No remaining documents-server imports"
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd /home/omar/Developments/AI-Knowledge-Operations-System/frontend
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Run tests**

```bash
cd /home/omar/Developments/AI-Knowledge-Operations-System/frontend
npm test
```

Expected: Tests pass (the old tests are deleted, so this should run whatever tests remain).

- [ ] **Step 4: Commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve any TypeScript or test issues after migration"
```

---

## Spec Coverage Checklist

- [x] Create shared `fetchWithAuth` helper → Task 1
- [x] Move project API logic into `app/(app)/app/projects/actions.ts` → Task 2
- [x] Move document API logic into `app/(app)/app/projects/[projectId]/documents/actions.ts` → Task 3
- [x] Update server component imports → Task 4
- [x] Delete obsolete `lib/api/*-server.ts` and tests → Task 5
- [x] Verify no remaining imports → Task 6
- [x] TypeScript compilation check → Task 6
- [x] Test execution → Task 6
