# Projects Module Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a full-stack Projects module with NestJS backend (MongoDB, CRUD, user-scoped) and Next.js frontend (server components for data fetching, client components for forms).

**Architecture:** Backend follows existing NestJS module pattern (schema → dto → service → controller → module). Frontend uses Next.js 14 App Router with server components for initial data fetch and client components for interactivity. Projects are user-scoped via owner field.

**Tech Stack:** NestJS, Mongoose, MongoDB, Next.js 14, React Server Components, TypeScript

---

## Backend Tasks

### Task 1: Create Project Mongoose Schema

**Files:**
- Create: `backend/src/projects/schemas/project.schema.ts`

**Schema Requirements:**
```typescript
@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: ['pink', 'teal', 'lavender', 'peach', 'ochre', 'cream'] })
  color: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  owner: Types.ObjectId;

  @Prop({ default: 0 })
  documentCount: number;

  @Prop({ default: 0 })
  sourceCount: number;

  @Prop({ default: 0 })
  sessionCount: number;

  @Prop({ default: 0 })
  insightCount: number;

  @Prop()
  lastUpdated: Date;
}
```

Export `ProjectDocument` type and `ProjectSchema`.

---

### Task 2: Create Project DTOs

**Files:**
- Create: `backend/src/projects/dto/create-project.dto.ts`
- Create: `backend/src/projects/dto/update-project.dto.ts`

**CreateProjectDto:**
```typescript
export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @IsString()
  @IsIn(['pink', 'teal', 'lavender', 'peach', 'ochre', 'cream'])
  color: string;
}
```

**UpdateProjectDto:** PartialType of CreateProjectDto (all optional).

---

### Task 3: Create ProjectsService

**Files:**
- Create: `backend/src/projects/projects.service.ts`

**Methods:**
- `findAllByOwner(ownerId: string)` - returns projects sorted by lastUpdated desc
- `findOne(id: string, ownerId: string)` - returns project or null if not owner
- `create(createProjectDto: CreateProjectDto, ownerId: string)` - creates with owner set
- `update(id: string, updateProjectDto: UpdateProjectDto, ownerId: string)` - updates if owner matches
- `remove(id: string, ownerId: string)` - deletes if owner matches

All methods must verify ownership (except create which sets it).

---

### Task 4: Create ProjectsController

**Files:**
- Create: `backend/src/projects/projects.controller.ts`

**Routes:**
- `GET /projects` → findAllByOwner (get owner from request user)
- `GET /projects/:id` → findOne
- `POST /projects` → create
- `PATCH /projects/:id` → update
- `DELETE /projects/:id` → remove

Use `@UseGuards(AuthGuard)` on controller. Extract user from request (add `@CurrentUser()` decorator or use request object).

**Response format:**
```typescript
{
  success: boolean,
  data: Project | Project[],
  error?: string
}
```

---

### Task 5: Create ProjectsModule and Register in AppModule

**Files:**
- Create: `backend/src/projects/projects.module.ts`
- Modify: `backend/src/app.module.ts`

**ProjectsModule:**
```typescript
@Module({
  imports: [MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }])],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
```

**AppModule:** Add `ProjectsModule` to imports array.

---

### Task 6: Add CurrentUser Decorator (if not exists)

**Files:**
- Check: `backend/src/auth/decorators/current-user.decorator.ts`

If it exists and works, use it. If not, create a simple decorator that extracts user from request.

---

### Task 7: Verify Backend Compiles

**Run:** `cd backend && npm run build` or `bun run build`
**Expected:** No TypeScript errors.

---

## Frontend Tasks

### Task 8: Create Projects API Client

**Files:**
- Create: `frontend/lib/api/projects.ts`

**Functions:**
```typescript
export async function getProjects(): Promise<Project[]>
export async function getProject(id: string): Promise<Project | null>
export async function createProject(data: CreateProjectData): Promise<Project>
export async function updateProject(id: string, data: UpdateProjectData): Promise<Project>
export async function deleteProject(id: string): Promise<void>
```

Each function should:
- Call `fetch()` to the backend API (use `process.env.NEXT_PUBLIC_API_URL` or relative `/api` if using proxy)
- Include credentials for auth cookies
- Handle errors appropriately
- Return typed data

**Project types** (reuse from mock-data.ts or create new):
```typescript
interface Project {
  id: string;
  name: string;
  description: string;
  color: "pink" | "teal" | "lavender" | "peach" | "ochre" | "cream";
  documentCount: number;
  sourceCount: number;
  sessionCount: number;
  insightCount: number;
  lastUpdated: string;
}
```

---

### Task 9: Convert Dashboard to Server Component

**Files:**
- Modify: `frontend/app/(app)/app/page.tsx`

**Changes:**
- Remove `"use client"` directive
- Import `getProjects` from API client
- Make the component async
- Fetch projects server-side: `const projects = await getProjects()`
- Keep StatCard and ProjectCard as client components if they have interactivity, OR keep as server components if purely presentational
- Handle empty state if no projects
- Calculate totals from real data

**Note:** `getProjects()` must work in server context (RSC). May need to use absolute URL with env var, or ensure cookies are forwarded.

---

### Task 10: Convert New Project Page to Create Real Projects

**Files:**
- Modify: `frontend/app/(app)/app/projects/new/page.tsx`

**Changes:**
- Keep as client component (form interactivity)
- Import `createProject` from API client
- In `handleSubmit`, call `createProject(formData)` instead of mock simulation
- On success, redirect to `/app/projects/${newProject.id}` (the new project detail page)
- On error, show toast with error message

---

### Task 11: Convert Project Detail Page to Server Component

**Files:**
- Modify: `frontend/app/(app)/app/projects/[projectId]/page.tsx`

**Changes:**
- Remove `"use client"` directive
- Import `getProject` from API client
- Make component async, accept `params: { projectId: string }` as prop
- Fetch project server-side: `const project = await getProject(params.projectId)`
- Handle not-found state
- Keep child components (like stat cards, lists) as server components where possible
- For interactive elements (buttons, links), they can remain as Link/button since Next.js handles navigation

**Note:** Sessions, documents, insights still use mock data since those modules aren't built yet. Add a comment indicating this.

---

### Task 12: Add API Proxy or Configure API URL

**Files:**
- Check: `frontend/next.config.js`
- Create/Modify: `frontend/lib/api/client.ts` or configure env vars

Ensure frontend can reach backend. Options:
1. Add `rewrites` in `next.config.js` to proxy `/api/*` to backend
2. Use `NEXT_PUBLIC_API_URL` environment variable
3. Create a shared API base URL helper

**Recommended:** Add to `next.config.js`:
```javascript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://localhost:3001/:path*', // or process.env.API_URL
    },
  ];
}
```

Then API calls use `/api/projects` which gets proxied.

---

### Task 13: Verify Frontend Builds

**Run:** `cd frontend && npm run build`
**Expected:** No build errors.

---

## Integration Check

### Task 14: End-to-End Verification

**Checklist:**
- [ ] Backend starts without errors (`cd backend && bun run dev`)
- [ ] Frontend starts without errors (`cd frontend && npm run dev`)
- [ ] Dashboard loads with real projects (empty initially)
- [ ] Can create a new project
- [ ] New project appears on dashboard after creation
- [ ] Can navigate to project detail page
- [ ] Project detail shows correct data

---

## File Summary

### New Backend Files
- `backend/src/projects/schemas/project.schema.ts`
- `backend/src/projects/dto/create-project.dto.ts`
- `backend/src/projects/dto/update-project.dto.ts`
- `backend/src/projects/projects.service.ts`
- `backend/src/projects/projects.controller.ts`
- `backend/src/projects/projects.module.ts`

### Modified Backend Files
- `backend/src/app.module.ts`

### New Frontend Files
- `frontend/lib/api/projects.ts`

### Modified Frontend Files
- `frontend/app/(app)/app/page.tsx`
- `frontend/app/(app)/app/projects/new/page.tsx`
- `frontend/app/(app)/app/projects/[projectId]/page.tsx`
- `frontend/next.config.js` (if adding proxy)

---

## Notes

1. **User Context:** The auth system uses better-auth with Google OAuth. The `AuthGuard` and `CurrentUser` decorator pattern should follow the existing auth module.
2. **Server Components:** When fetching data in server components, ensure the fetch includes the auth cookie. In Next.js 14, `fetch()` in RSC automatically includes cookies when making requests to the same origin.
3. **Error Handling:** Both backend and frontend should handle errors gracefully. Backend returns `{ success: false, error: string }` on errors.
4. **Type Safety:** Use the existing `Project` interface from `mock-data.ts` or create a shared type. Ensure frontend and backend types stay in sync.
5. **Counts:** For now, counts default to 0 on creation. They will be updated by other modules (documents, sessions, etc.) when those are built.
