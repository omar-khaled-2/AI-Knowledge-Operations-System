import { cn, formatFileSize } from "./utils"

describe("cn()", () => {
  test("merges class names correctly", () => {
    const result = cn("class1", "class2")
    expect(result).toBe("class1 class2")
  })

  test("handles conditional classes", () => {
    const isActive = true
    const result = cn("base", isActive && "active", !isActive && "inactive")
    expect(result).toBe("base active")
  })

  test("handles undefined and null values", () => {
    const result = cn("base", undefined, null, "extra")
    expect(result).toBe("base extra")
  })

  test("handles empty strings", () => {
    const result = cn("base", "", "extra")
    expect(result).toBe("base extra")
  })

  test("handles objects with boolean values", () => {
    const result = cn("base", { active: true, disabled: false })
    expect(result).toBe("base active")
  })

  test("handles arrays of classes", () => {
    const result = cn(["class1", "class2"], "class3")
    expect(result).toBe("class1 class2 class3")
  })

  test("returns empty string when no arguments", () => {
    const result = cn()
    expect(result).toBe("")
  })

  test("deduplicates conflicting Tailwind classes", () => {
    const result = cn("px-2 py-1", "px-4")
    // tailwind-merge should resolve conflicts
    expect(result).not.toContain("px-2")
    expect(result).toContain("px-4")
    expect(result).toContain("py-1")
  })
})

describe("formatFileSize()", () => {
  test("returns '0 B' for 0 bytes", () => {
    expect(formatFileSize(0)).toBe("0 B")
  })

  test("formats bytes correctly", () => {
    expect(formatFileSize(512)).toBe("512 B")
  })

  test("formats kilobytes correctly", () => {
    expect(formatFileSize(1024)).toBe("1 KB")
    expect(formatFileSize(1536)).toBe("1.5 KB")
  })

  test("formats megabytes correctly", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1 MB")
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe("2.5 MB")
  })

  test("formats gigabytes correctly", () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe("1 GB")
    expect(formatFileSize(1.5 * 1024 * 1024 * 1024)).toBe("1.5 GB")
  })

  test("handles very large files within GB range", () => {
    expect(formatFileSize(1024 * 1024 * 1024 * 1024 - 1)).toMatch(/\d+\.?\d* GB/)
  })

  test("rounds to 1 decimal place", () => {
    const result = formatFileSize(1500)
    expect(result).toBe("1.5 KB")
  })

  test("handles edge case of exactly 1024 bytes", () => {
    expect(formatFileSize(1024)).toBe("1 KB")
  })
})
