import type { NextRequest } from "next/server"
import { middleware, config } from "./middleware"

describe("Authentication Middleware", () => {
  const createRequest = (
    pathname: string,
    hasSessionCookie: boolean = false
  ): NextRequest => {
    return {
      nextUrl: {
        pathname,
        search: "",
        href: `http://localhost:3000${pathname}`,
      },
      url: `http://localhost:3000${pathname}`,
      cookies: {
        get: (name: string) =>
          hasSessionCookie && name === "better-auth.session_token"
            ? { name: "better-auth.session_token", value: "test-token" }
            : undefined,
        getAll: () =>
          hasSessionCookie
            ? [{ name: "better-auth.session_token", value: "test-token" }]
            : [],
      },
    } as unknown as NextRequest
  }

  describe("Security - Route Protection", () => {
    test("redirects unauthenticated users from protected routes to signin", () => {
      const request = createRequest("/app", false)
      const result = middleware(request)

      expect(result.status).toBe(307) // redirect status
      expect(result.headers.get("location")).toContain("/signin")
    })

    test("allows authenticated users to access protected routes", () => {
      const request = createRequest("/app", true)
      const result = middleware(request)

      expect(result.status).toBe(200) // next() returns 200
    })

    test("redirects authenticated users away from public routes", () => {
      const request = createRequest("/signin", true)
      const result = middleware(request)

      expect(result.status).toBe(307) // redirect status
      expect(result.headers.get("location")).toContain("/app")
    })

    test("allows unauthenticated users to access public routes", () => {
      const request = createRequest("/signin", false)
      const result = middleware(request)

      expect(result.status).toBe(200) // next() returns 200
    })
  })

  describe("Security - Static Assets & API Routes", () => {
    test("allows unauthenticated access to _next/static paths", () => {
      const request = createRequest("/_next/static/chunks/main.js", false)
      const result = middleware(request)

      expect(result.status).toBe(200)
    })

    test("allows unauthenticated access to _next/image paths", () => {
      const request = createRequest("/_next/image?url=test.jpg", false)
      const result = middleware(request)

      expect(result.status).toBe(200)
    })

    test("allows unauthenticated access to API routes", () => {
      const request = createRequest("/api/auth/signin", false)
      const result = middleware(request)

      expect(result.status).toBe(200)
    })

    test("allows unauthenticated access to favicon.ico", () => {
      const request = createRequest("/favicon.ico", false)
      const result = middleware(request)

      expect(result.status).toBe(200)
    })
  })

  describe("Security - Edge Cases", () => {
    test("handles requests with empty session cookie value", () => {
      const request = {
        nextUrl: { pathname: "/app", search: "", href: "http://localhost:3000/app" },
        url: "http://localhost:3000/app",
        cookies: {
          get: () => ({ name: "better-auth.session_token", value: "" }),
          getAll: () => [{ name: "better-auth.session_token", value: "" }],
        },
      } as unknown as NextRequest

      const result = middleware(request)

      // Empty string should be treated as falsy, so user is not authenticated
      expect(result.status).toBe(307)
      expect(result.headers.get("location")).toContain("/signin")
    })

    test("handles requests with undefined session cookie", () => {
      const request = {
        nextUrl: { pathname: "/app", search: "", href: "http://localhost:3000/app" },
        url: "http://localhost:3000/app",
        cookies: {
          get: () => undefined,
          getAll: () => [],
        },
      } as unknown as NextRequest

      const result = middleware(request)

      expect(result.status).toBe(307)
      expect(result.headers.get("location")).toContain("/signin")
    })

    test("handles root path / as protected route", () => {
      const request = createRequest("/", false)
      const result = middleware(request)

      expect(result.status).toBe(307)
      expect(result.headers.get("location")).toContain("/signin")
    })

    test("handles nested protected routes", () => {
      const request = createRequest("/app/projects/123", false)
      const result = middleware(request)

      expect(result.status).toBe(307)
      expect(result.headers.get("location")).toContain("/signin")
    })

    test("handles signin with query params as public path", () => {
      const request = createRequest("/signin?redirect=/app", false)
      const result = middleware(request)

      expect(result.status).toBe(200)
    })
  })

  describe("Security - Cookie Name Validation", () => {
    test("checks for correct cookie name 'better-auth.session_token'", () => {
      const request = {
        nextUrl: { pathname: "/app", search: "", href: "http://localhost:3000/app" },
        url: "http://localhost:3000/app",
        cookies: {
          get: (name: string) => {
            if (name === "better-auth.session_token") {
              return { name: "better-auth.session_token", value: "token" }
            }
            return undefined
          },
          getAll: () => [{ name: "better-auth.session_token", value: "token" }],
        },
      } as unknown as NextRequest

      const result = middleware(request)

      expect(result.status).toBe(200) // authenticated
    })

    test("does not authenticate with wrong cookie name", () => {
      const request = {
        nextUrl: { pathname: "/app", search: "", href: "http://localhost:3000/app" },
        url: "http://localhost:3000/app",
        cookies: {
          get: (name: string) => {
            if (name === "session_token") {
              return { name: "session_token", value: "token" }
            }
            return undefined
          },
          getAll: () => [{ name: "session_token", value: "token" }],
        },
      } as unknown as NextRequest

      const result = middleware(request)

      // Wrong cookie name should not authenticate
      expect(result.status).toBe(307)
      expect(result.headers.get("location")).toContain("/signin")
    })
  })

  describe("Middleware Config", () => {
    test("has correct matcher configuration", () => {
      expect(config).toHaveProperty("matcher")
      expect(config.matcher).toContain("/((?!_next/static|_next/image|favicon.ico).*))")
    })
  })
})
