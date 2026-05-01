import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from "./projects"
import { Project } from "@/lib/mock-data"

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe("Projects API Client", () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe("Security Requirements", () => {
    test("all requests include credentials: 'include' for auth", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      } as Response)

      await getProjects()

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects",
        expect.objectContaining({
          credentials: "include",
        })
      )
    })

    test("requests include Content-Type: application/json header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      } as Response)

      await getProjects()

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      )
    })

    test("POST requests stringify body as JSON", async () => {
      const projectData = {
        name: "Test Project",
        description: "Test Description",
        color: "teal" as Project["color"],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: "1", ...projectData }),
      } as Response)

      await createProject(projectData)

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(projectData),
        })
      )
    })
  })

  describe("getProjects()", () => {
    test("returns array of projects on success", async () => {
      const mockProjects: Project[] = [
        {
          id: "proj-1",
          name: "Test Project",
          description: "A test project",
          documentCount: 0,
          sourceCount: 0,
          sessionCount: 0,
          insightCount: 0,
          lastUpdated: "2024-01-15T10:30:00Z",
          color: "teal",
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockProjects),
      } as Response)

      const result = await getProjects()
      expect(result).toEqual(mockProjects)
    })

    test("throws error on HTTP error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response)

      await expect(getProjects()).rejects.toThrow("API error: 500")
    })
  })

  describe("getProject()", () => {
    test("returns project on success", async () => {
      const mockProject: Project = {
        id: "proj-1",
        name: "Test Project",
        description: "A test project",
        documentCount: 0,
        sourceCount: 0,
        sessionCount: 0,
        insightCount: 0,
        lastUpdated: "2024-01-15T10:30:00Z",
        color: "teal",
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockProject),
      } as Response)

      const result = await getProject("proj-1")
      expect(result).toEqual(mockProject)
    })

    test("returns null for 404 response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response)

      const result = await getProject("nonexistent")
      expect(result).toBeNull()
    })

    test("throws error on non-404 HTTP error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response)

      await expect(getProject("proj-1")).rejects.toThrow("API error: 500")
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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(createdProject),
      } as Response)

      const result = await createProject(projectData)
      expect(result).toEqual(createdProject)
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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(updatedProject),
      } as Response)

      const result = await updateProject("proj-1", updateData)
      expect(result).toEqual(updatedProject)
    })

    test("sends PATCH request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ id: "proj-1", name: "Updated" }),
      } as Response)

      await updateProject("proj-1", { name: "Updated" })

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects/proj-1",
        expect.objectContaining({
          method: "PATCH",
        })
      )
    })
  })

  describe("deleteProject()", () => {
    test("sends DELETE request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: "proj-1" }),
      } as Response)

      await deleteProject("proj-1")

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects/proj-1",
        expect.objectContaining({
          method: "DELETE",
        })
      )
    })

    test("resolves successfully on deletion", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: "proj-1" }),
      } as Response)

      await expect(deleteProject("proj-1")).resolves.toBeUndefined()
    })
  })
})
