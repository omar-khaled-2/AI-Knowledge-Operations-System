import {
  getDocuments,
  getDocument,
  generateUploadUrl,
  deleteDocument,
} from "./documents"
import { Document } from "@/lib/mock-data"

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe("Documents API Client", () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe("Security Requirements", () => {
    test("all requests include credentials: 'include' for auth", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: { documents: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } },
          }),
      } as Response)

      await getDocuments("proj-1")

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/documents"),
        expect.objectContaining({
          credentials: "include",
        })
      )
    })

    test("requests include Content-Type: application/json header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: { documents: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } },
          }),
      } as Response)

      await getDocuments("proj-1")

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/documents"),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      )
    })

    test("POST requests stringify body as JSON", async () => {
      const uploadData = {
        filename: "test.pdf",
        mimeType: "application/pdf",
        projectId: "proj-1",
        size: 1024,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              uploadUrl: "https://s3.amazonaws.com/test",
              objectKey: "test-key",
              document: {} as Document,
            },
          }),
      } as Response)

      await generateUploadUrl(uploadData)

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/documents/upload-url",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(uploadData),
        })
      )
    })
  })

  describe("getDocuments()", () => {
    test("returns paginated documents on success", async () => {
      const mockResponse = {
        documents: [
          {
            id: "doc-1",
            projectId: "proj-1",
            name: "Test Document",
            sourceType: "upload",
            createdAt: "2024-01-15T10:30:00Z",
            size: 1024,
            status: "processed",
          },
        ] as Document[],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: mockResponse }),
      } as Response)

      const result = await getDocuments("proj-1")
      expect(result).toEqual(mockResponse)
    })

    test("builds query string with projectId", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: { documents: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } },
          }),
      } as Response)

      await getDocuments("proj-1")

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/documents?projectId=proj-1",
        expect.any(Object)
      )
    })

    test("builds query string with pagination options", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: { documents: [], pagination: { total: 0, page: 2, limit: 20, totalPages: 0 } },
          }),
      } as Response)

      await getDocuments("proj-1", { page: 2, limit: 20, sortBy: "name", sortOrder: "asc" })

      const callUrl = mockFetch.mock.calls[0][0] as string
      expect(callUrl).toContain("projectId=proj-1")
      expect(callUrl).toContain("page=2")
      expect(callUrl).toContain("limit=20")
      expect(callUrl).toContain("sortBy=name")
      expect(callUrl).toContain("sortOrder=asc")
    })

    test("omits undefined pagination options", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: { documents: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } },
          }),
      } as Response)

      await getDocuments("proj-1", {})

      const callUrl = mockFetch.mock.calls[0][0] as string
      expect(callUrl).toBe("/api/documents?projectId=proj-1")
    })

    test("throws error on HTTP error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response)

      await expect(getDocuments("proj-1")).rejects.toThrow("API error: 500")
    })

    test("throws error on API failure response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: false,
            error: "Project not found",
          }),
      } as Response)

      await expect(getDocuments("invalid-proj")).rejects.toThrow(
        "Project not found"
      )
    })
  })

  describe("getDocument()", () => {
    test("returns document on success", async () => {
      const mockDocument: Document = {
        id: "doc-1",
        projectId: "proj-1",
        name: "Test Document",
        sourceType: "upload",
        createdAt: "2024-01-15T10:30:00Z",
        size: 1024,
        status: "processed",
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: mockDocument }),
      } as Response)

      const result = await getDocument("doc-1")
      expect(result).toEqual(mockDocument)
    })

    test("returns null for 404 response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response)

      const result = await getDocument("nonexistent")
      expect(result).toBeNull()
    })

    test("throws error on non-404 HTTP error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response)

      await expect(getDocument("doc-1")).rejects.toThrow("API error: 500")
    })
  })

  describe("generateUploadUrl()", () => {
    test("returns upload URL and document on success", async () => {
      const uploadData = {
        filename: "test.pdf",
        mimeType: "application/pdf",
        projectId: "proj-1",
        size: 1024,
      }

      const mockResponse = {
        uploadUrl: "https://s3.amazonaws.com/bucket/test",
        objectKey: "uploads/test.pdf",
        document: {
          id: "doc-new",
          projectId: "proj-1",
          name: "test.pdf",
          sourceType: "upload",
          createdAt: "2024-01-15T10:30:00Z",
          size: 1024,
          status: "processing",
        } as Document,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: mockResponse }),
      } as Response)

      const result = await generateUploadUrl(uploadData)
      expect(result).toEqual(mockResponse)
    })

    test("throws error on file type rejection", async () => {
      const uploadData = {
        filename: "test.exe",
        mimeType: "application/x-msdownload",
        projectId: "proj-1",
        size: 1024,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: false,
            error: "File type not allowed",
          }),
      } as Response)

      await expect(generateUploadUrl(uploadData)).rejects.toThrow(
        "File type not allowed"
      )
    })
  })

  describe("deleteDocument()", () => {
    test("sends DELETE request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: undefined }),
      } as Response)

      await deleteDocument("doc-1")

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/documents/doc-1",
        expect.objectContaining({
          method: "DELETE",
        })
      )
    })

    test("resolves successfully on deletion", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: undefined }),
      } as Response)

      await expect(deleteDocument("doc-1")).resolves.toBeUndefined()
    })

    test("throws error on unauthorized deletion", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      } as Response)

      await expect(deleteDocument("doc-1")).rejects.toThrow("API error: 403")
    })
  })
})
