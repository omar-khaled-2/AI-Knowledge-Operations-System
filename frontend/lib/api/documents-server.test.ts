import { Document } from "@/lib/mock-data"

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}))

import { cookies } from "next/headers"
const mockCookies = cookies as jest.MockedFunction<typeof cookies>

describe("Documents Server API", () => {
  beforeEach(() => {
    mockFetch.mockClear()
    mockCookies.mockClear()
    jest.resetModules()
    delete process.env.API_URL
    delete process.env.NEXT_PUBLIC_API_URL
  })

  const importModule = async () => {
    const module = await import("./documents-server")
    return module
  }

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

      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: mockDocument }),
      } as Response)

      const { getDocument } = await importModule()
      const result = await getDocument("doc-1")
      expect(result).toEqual(mockDocument)
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

      const { getDocument } = await importModule()
      const result = await getDocument("nonexistent")
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

      const { getDocument } = await importModule()
      const result = await getDocument("invalid-id")
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

      const { getDocument } = await importModule()
      await expect(getDocument("doc-1")).rejects.toThrow("API error: 500")
    })

    test("throws error on API failure response", async () => {
      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: false, error: "Document not found" }),
      } as Response)

      const { getDocument } = await importModule()
      await expect(getDocument("doc-1")).rejects.toThrow("Document not found")
    })

    test("throws generic error when API returns success: false with no error message", async () => {
      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: false }),
      } as Response)

      const { getDocument } = await importModule()
      await expect(getDocument("doc-1")).rejects.toThrow("API request failed")
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

      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: mockResponse }),
      } as Response)

      const { getDocuments } = await importModule()
      const result = await getDocuments("proj-1")
      expect(result).toEqual(mockResponse)
    })

    test("builds query string with projectId", async () => {
      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          data: { documents: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } },
        }),
      } as Response)

      const { getDocuments } = await importModule()
      await getDocuments("proj-1")

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("projectId=proj-1"),
        expect.any(Object)
      )
    })

    test("builds query string with pagination options", async () => {
      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          data: { documents: [], pagination: { total: 0, page: 2, limit: 20, totalPages: 0 } },
        }),
      } as Response)

      const { getDocuments } = await importModule()
      await getDocuments("proj-1", { page: 2, limit: 20, sortBy: "name", sortOrder: "asc" })

      const callUrl = mockFetch.mock.calls[0][0] as string
      expect(callUrl).toContain("projectId=proj-1")
      expect(callUrl).toContain("page=2")
      expect(callUrl).toContain("limit=20")
      expect(callUrl).toContain("sortBy=name")
      expect(callUrl).toContain("sortOrder=asc")
    })

    test("throws error on HTTP error", async () => {
      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: () => Promise.resolve("Internal Server Error"),
      } as Response)

      const { getDocuments } = await importModule()
      await expect(getDocuments("proj-1")).rejects.toThrow("API error: 500")
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

      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: mockResponse }),
      } as Response)

      const { generateUploadUrl } = await importModule()
      const result = await generateUploadUrl(uploadData)
      expect(result).toEqual(mockResponse)
    })

    test("sends POST request with JSON body", async () => {
      const uploadData = {
        filename: "test.pdf",
        mimeType: "application/pdf",
        projectId: "proj-1",
        size: 1024,
      }

      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: {} }),
      } as Response)

      const { generateUploadUrl } = await importModule()
      await generateUploadUrl(uploadData)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/documents/upload-url"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(uploadData),
        })
      )
    })

    test("throws error on API failure response", async () => {
      const uploadData = {
        filename: "test.exe",
        mimeType: "application/x-msdownload",
        projectId: "proj-1",
        size: 1024,
      }

      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: false, error: "File type not allowed" }),
      } as Response)

      const { generateUploadUrl } = await importModule()
      await expect(generateUploadUrl(uploadData)).rejects.toThrow("File type not allowed")
    })
  })

  describe("deleteDocument()", () => {
    test("sends DELETE request", async () => {
      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: undefined }),
      } as Response)

      const { deleteDocument } = await importModule()
      await deleteDocument("doc-1")

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/documents/doc-1"),
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

      const { deleteDocument } = await importModule()
      await expect(deleteDocument("doc-1")).resolves.toBeUndefined()
    })

    test("throws error on unauthorized deletion", async () => {
      mockCookies.mockReturnValue({
        getAll: () => [],
      } as any)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: () => Promise.resolve("Forbidden"),
      } as Response)

      const { deleteDocument } = await importModule()
      await expect(deleteDocument("doc-1")).rejects.toThrow("API error: 403")
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

      const { getDocument } = await importModule()
      await getDocument("doc-1")

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

      const { getDocument } = await importModule()
      await getDocument("doc-1")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://backend-service/documents/doc-1",
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

      const { getDocument } = await importModule()
      await getDocument("doc-1")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3001/documents/doc-1",
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

      const { getDocument } = await importModule()
      await getDocument("doc-1")

      const [, options] = mockFetch.mock.calls[0]
      expect(options).toBeDefined()
    })
  })
})
