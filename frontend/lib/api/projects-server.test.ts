import { Project } from "@/lib/mock-data"

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}))

import { cookies } from "next/headers"
const mockCookies = cookies as jest.MockedFunction<typeof cookies>

describe("Projects Server API", () => {
  beforeEach(() => {
    mockFetch.mockClear()
    mockCookies.mockClear()
    jest.resetModules()
    delete process.env.API_URL
    delete process.env.NEXT_PUBLIC_API_URL
  })

  const importModule = async () => {
    const mod = await import("./projects-server")
    return mod
  }

  describe("getProject()", () => {
    test("returns project on success", async () => {
      const mockProject: Project = {
        id: "proj-1",
        name: "Test Project",
        description: "A test project",
        documentCount: 5,
        sourceCount: 2,
        sessionCount: 3,
        insightCount: 1,
        lastUpdated: "2024-01-15T10:30:00Z",
        color: "teal",
      }

      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: mockProject }),
      } as Response)

      const { getProject } = await importModule()
      const result = await getProject("proj-1")
      expect(result).toEqual(mockProject)
    })

    test("returns null for 404 response", async () => {
      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response)

      const { getProject } = await importModule()
      const result = await getProject("nonexistent")
      expect(result).toBeNull()
    })

    test("returns null for 400 response (invalid ID)", async () => {
      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      } as Response)

      const { getProject } = await importModule()
      const result = await getProject("invalid-id")
      expect(result).toBeNull()
    })

    test("throws error on non-404/400 HTTP error", async () => {
      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response)

      const { getProject } = await importModule()
      await expect(getProject("proj-1")).rejects.toThrow("API error: 500")
    })

    test("throws error on API failure response", async () => {
      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: false, error: "Database error" }),
      } as Response)

      const { getProject } = await importModule()
      await expect(getProject("proj-1")).rejects.toThrow("Database error")
    })
  })

  describe("getProjects()", () => {
    test("returns array of projects on success", async () => {
      const mockProjects: Project[] = [
        {
          id: "proj-1",
          name: "Test Project",
          description: "A test project",
          documentCount: 5,
          sourceCount: 2,
          sessionCount: 3,
          insightCount: 1,
          lastUpdated: "2024-01-15T10:30:00Z",
          color: "teal",
        },
      ]

      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: mockProjects }),
      } as Response)

      const { getProjects } = await importModule()
      const result = await getProjects()
      expect(result).toEqual(mockProjects)
    })

    test("throws error on HTTP error", async () => {
      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response)

      const { getProjects } = await importModule()
      await expect(getProjects()).rejects.toThrow("API error: 500")
    })
  })

  describe("createProject()", () => {
    test("creates project and returns it on success", async () => {
      const projectData = {
        name: "New Project",
        description: "New Description",
        color: "pink" as Project["color"],
      }

      const createdProject: Project = {
        id: "proj-new",
        ...projectData,
        documentCount: 0,
        sourceCount: 0,
        sessionCount: 0,
        insightCount: 0,
        lastUpdated: "2024-01-15T10:30:00Z",
      }

      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: createdProject }),
      } as Response)

      const { createProject } = await importModule()
      const result = await createProject(projectData)
      expect(result).toEqual(createdProject)
    })

    test("sends POST request with JSON body", async () => {
      const projectData = {
        name: "New Project",
        description: "New Description",
        color: "teal" as Project["color"],
      }

      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: { id: "1", ...projectData } }),
      } as Response)

      const { createProject } = await importModule()
      await createProject(projectData)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/projects"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(projectData),
        })
      )
    })
  })

  describe("updateProject()", () => {
    test("updates project with partial data", async () => {
      const updateData = { name: "Updated Name" }

      const updatedProject: Project = {
        id: "proj-1",
        name: "Updated Name",
        description: "Original Description",
        documentCount: 5,
        sourceCount: 2,
        sessionCount: 3,
        insightCount: 1,
        lastUpdated: "2024-01-15T12:00:00Z",
        color: "teal",
      }

      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: updatedProject }),
      } as Response)

      const { updateProject } = await importModule()
      const result = await updateProject("proj-1", updateData)
      expect(result).toEqual(updatedProject)
    })

    test("sends PATCH request", async () => {
      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: {} }),
      } as Response)

      const { updateProject } = await importModule()
      await updateProject("proj-1", { name: "Updated" })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/projects/proj-1"),
        expect.objectContaining({
          method: "PATCH",
        })
      )
    })
  })

  describe("deleteProject()", () => {
    test("sends DELETE request", async () => {
      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: undefined }),
      } as Response)

      const { deleteProject } = await importModule()
      await deleteProject("proj-1")

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/projects/proj-1"),
        expect.objectContaining({
          method: "DELETE",
        })
      )
    })

    test("resolves successfully on deletion", async () => {
      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: undefined }),
      } as Response)

      const { deleteProject } = await importModule()
      await expect(deleteProject("proj-1")).resolves.toBeUndefined()
    })
  })

  describe("Security Requirements", () => {
    test("forwards auth cookies via headers", async () => {
      mockCookies.mockReturnValue({
        getAll: () => [
          { name: "better-auth.session_token", value: "test-token" },
        ],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: null }),
      } as Response)

      const { getProject } = await importModule()
      await getProject("proj-1")

      const [, options] = mockFetch.mock.calls[0]
      expect(options).toBeDefined()
      expect(options?.headers).toBeDefined()
    })

    test("uses API_URL environment variable", async () => {
      process.env.API_URL = "http://backend-service"

      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: null }),
      } as Response)

      const { getProject } = await importModule()
      await getProject("proj-1")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://backend-service/projects/proj-1",
        expect.any(Object)
      )
    })

    test("falls back to localhost when no env vars set", async () => {
      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: null }),
      } as Response)

      const { getProject } = await importModule()
      await getProject("proj-1")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3001/projects/proj-1",
        expect.any(Object)
      )
    })

    test("handles cookies() throwing error", async () => {
      mockCookies.mockImplementation(() => {
        throw new Error("No request context")
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: null }),
      } as Response)

      const { getProject } = await importModule()
      await getProject("proj-1")

      const [, options] = mockFetch.mock.calls[0]
      expect(options).toBeDefined()
    })
  })
})
