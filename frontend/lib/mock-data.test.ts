import {
  mockActivity,
  getProjectById,
  getSessionsByProjectId,
  getSessionById,
  getMessagesBySessionId,
  getDocumentsByProjectId,
  getDocumentById,
  getSourcesByProjectId,
  getInsightsByProjectId,
  getActivityByProjectId,
  formatRelativeTime,
  getBrandColor,
  getSourceIcon,
} from "./mock-data"

describe("Mock Data Helpers", () => {
  describe("getProjectById()", () => {
    test("returns project when found", () => {
      const result = getProjectById("proj-1")
      expect(result).toBeDefined()
      expect(result?.id).toBe("proj-1")
      expect(result?.name).toBe("Product Strategy 2024")
    })

    test("returns undefined when project not found", () => {
      const result = getProjectById("nonexistent")
      expect(result).toBeUndefined()
    })

    test("handles empty string ID", () => {
      const result = getProjectById("")
      expect(result).toBeUndefined()
    })
  })

  describe("getSessionsByProjectId()", () => {
    test("returns sessions for existing project", () => {
      const result = getSessionsByProjectId("proj-1")
      expect(result.length).toBeGreaterThan(0)
      expect(result.every((s) => s.projectId === "proj-1")).toBe(true)
    })

    test("returns empty array for non-existent project", () => {
      const result = getSessionsByProjectId("nonexistent")
      expect(result).toEqual([])
    })

    test("returns all matching sessions", () => {
      const result = getSessionsByProjectId("proj-3")
      expect(result.length).toBe(3) // sess-6, sess-7, sess-8
    })
  })

  describe("getSessionById()", () => {
    test("returns session when found", () => {
      const result = getSessionById("sess-1")
      expect(result).toBeDefined()
      expect(result?.name).toBe("Q4 Strategy Review")
    })

    test("returns undefined when session not found", () => {
      const result = getSessionById("nonexistent")
      expect(result).toBeUndefined()
    })
  })

  describe("getMessagesBySessionId()", () => {
    test("returns messages for existing session", () => {
      const result = getMessagesBySessionId("sess-1")
      expect(result.length).toBeGreaterThan(0)
      expect(result.every((m) => m.sessionId === "sess-1")).toBe(true)
    })

    test("returns empty array for non-existent session", () => {
      const result = getMessagesBySessionId("nonexistent")
      expect(result).toEqual([])
    })

    test("returns messages with source citations", () => {
      const result = getMessagesBySessionId("sess-1")
      const messageWithSources = result.find((m) => m.sources && m.sources.length > 0)
      expect(messageWithSources).toBeDefined()
      expect(messageWithSources?.sources?.[0]).toHaveProperty("documentName")
    })
  })

  describe("getDocumentsByProjectId()", () => {
    test("returns documents for existing project", () => {
      const result = getDocumentsByProjectId("proj-1")
      expect(result.length).toBeGreaterThan(0)
      expect(result.every((d) => d.projectId === "proj-1")).toBe(true)
    })

    test("returns empty array for non-existent project", () => {
      const result = getDocumentsByProjectId("nonexistent")
      expect(result).toEqual([])
    })
  })

  describe("getDocumentById()", () => {
    test("returns document when found", () => {
      const result = getDocumentById("doc-1")
      expect(result).toBeDefined()
      expect(result?.name).toBe("Q4 Strategy Document")
    })

    test("returns undefined when document not found", () => {
      const result = getDocumentById("nonexistent")
      expect(result).toBeUndefined()
    })
  })

  describe("getSourcesByProjectId()", () => {
    test("returns knowledge sources for existing project", () => {
      const result = getSourcesByProjectId("proj-1")
      expect(result.length).toBeGreaterThan(0)
      expect(result.every((s) => s.projectId === "proj-1")).toBe(true)
    })

    test("returns empty array for non-existent project", () => {
      const result = getSourcesByProjectId("nonexistent")
      expect(result).toEqual([])
    })

    test("includes source status information", () => {
      const result = getSourcesByProjectId("proj-4")
      expect(result.some((s) => s.status === "disconnected")).toBe(true)
    })
  })

  describe("getInsightsByProjectId()", () => {
    test("returns insights for existing project", () => {
      const result = getInsightsByProjectId("proj-1")
      expect(result.length).toBeGreaterThan(0)
      expect(result.every((i) => i.projectId === "proj-1")).toBe(true)
    })

    test("returns empty array for non-existent project", () => {
      const result = getInsightsByProjectId("nonexistent")
      expect(result).toEqual([])
    })

    test("insights include confidence scores", () => {
      const result = getInsightsByProjectId("proj-1")
      expect(result[0]).toHaveProperty("confidence")
      expect(typeof result[0].confidence).toBe("number")
      expect(result[0].confidence).toBeGreaterThanOrEqual(0)
      expect(result[0].confidence).toBeLessThanOrEqual(1)
    })
  })

  describe("getActivityByProjectId()", () => {
    test("returns activity for specific project", () => {
      const result = getActivityByProjectId("proj-1")
      expect(result.length).toBeGreaterThan(0)
      // Should include project-specific activities and global activities (no projectId)
      expect(result.some((a) => a.projectId === "proj-1")).toBe(true)
    })

    test("returns all activity when no projectId provided", () => {
      const result = getActivityByProjectId()
      expect(result.length).toBe(mockActivity.length)
    })

    test("includes global activities when projectId provided", () => {
      const result = getActivityByProjectId("proj-1")
      // Should include activity with no projectId (global)
      expect(result.some((a) => !a.projectId)).toBe(true)
    })

    test("returns empty array when no activity exists", () => {
      const result = getActivityByProjectId("nonexistent")
      // Should still include global activities
      expect(result.some((a) => !a.projectId)).toBe(true)
    })
  })

  describe("formatRelativeTime()", () => {
    test("returns 'just now' for recent timestamps", () => {
      const now = new Date().toISOString()
      expect(formatRelativeTime(now)).toBe("just now")
    })

    test("returns minutes ago for recent past", () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString()
      expect(formatRelativeTime(fiveMinutesAgo)).toBe("5m ago")
    })

    test("returns hours ago for past hours", () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString()
      expect(formatRelativeTime(twoHoursAgo)).toBe("2h ago")
    })

    test("returns days ago for past days", () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString()
      expect(formatRelativeTime(threeDaysAgo)).toBe("3d ago")
    })

    test("returns formatted date for older timestamps", () => {
      const oldDate = "2023-01-01T00:00:00Z"
      const result = formatRelativeTime(oldDate)
      expect(result).not.toBe("just now")
      expect(result).not.toContain("m ago")
      expect(result).not.toContain("h ago")
      expect(result).not.toContain("d ago")
      // Should be in format like "Jan 1"
      expect(result).toMatch(/[A-Za-z]+ \d+/)
    })

    test("handles edge case of exactly 1 minute ago", () => {
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()
      expect(formatRelativeTime(oneMinuteAgo)).toBe("1m ago")
    })

    test("handles edge case of exactly 1 hour ago", () => {
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString()
      expect(formatRelativeTime(oneHourAgo)).toBe("1h ago")
    })

    test("handles edge case of exactly 1 day ago", () => {
      const oneDayAgo = new Date(Date.now() - 86400000).toISOString()
      expect(formatRelativeTime(oneDayAgo)).toBe("1d ago")
    })
  })

  describe("getBrandColor()", () => {
    test("returns correct color for known colors", () => {
      expect(getBrandColor("pink")).toBe("#ff4d8b")
      expect(getBrandColor("teal")).toBe("#1a3a3a")
      expect(getBrandColor("lavender")).toBe("#b8a4ed")
      expect(getBrandColor("peach")).toBe("#ffb084")
      expect(getBrandColor("ochre")).toBe("#e8b94a")
      expect(getBrandColor("cream")).toBe("#f5f0e0")
    })

    test("returns default color for unknown colors", () => {
      expect(getBrandColor("unknown")).toBe("#f5f0e0")
      expect(getBrandColor("")).toBe("#f5f0e0")
    })

    test("is case-sensitive", () => {
      expect(getBrandColor("Pink")).toBe("#f5f0e0")
      expect(getBrandColor("TEAL")).toBe("#f5f0e0")
    })
  })

  describe("getSourceIcon()", () => {
    test("returns correct icon for known source types", () => {
      expect(getSourceIcon("notion")).toBe("N")
      expect(getSourceIcon("slack")).toBe("S")
      expect(getSourceIcon("google-drive")).toBe("G")
      expect(getSourceIcon("confluence")).toBe("C")
      expect(getSourceIcon("github")).toBe("GH")
      expect(getSourceIcon("upload")).toBe("U")
    })

    test("returns '?' for unknown source types", () => {
      expect(getSourceIcon("unknown")).toBe("?")
      expect(getSourceIcon("")).toBe("?")
    })

    test("is case-sensitive", () => {
      expect(getSourceIcon("Notion")).toBe("?")
      expect(getSourceIcon("SLACK")).toBe("?")
    })
  })
})
