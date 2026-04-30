import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = ["/signin"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check for session cookie (Better Auth default cookie name)
  const sessionCookie = request.cookies.get("better-auth.session_token")
  const isAuthenticated = !!sessionCookie?.value

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path))

  // Redirect authenticated users away from public pages
  if (isAuthenticated && isPublicPath) {
    return NextResponse.redirect(new URL("/app", request.url))
  }

  // Redirect unauthenticated users to sign-in
  if (!isAuthenticated && !isPublicPath) {
    // Allow static assets and API routes
    if (
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/api/") ||
      pathname === "/favicon.ico"
    ) {
      return NextResponse.next()
    }

    return NextResponse.redirect(new URL("/signin", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*))"],
}
