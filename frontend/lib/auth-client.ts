import { createAuthClient } from "better-auth/react"

/**
 * Auth client that communicates through Next.js proxy.
 * All auth requests go to /api/auth/* which is rewritten to the backend.
 * This ensures the backend remains internal - never exposed directly to the browser.
 */
export const authClient = createAuthClient({
  baseURL: "", // Use same origin - requests go through Next.js proxy
})

export const { signIn, signOut, useSession } = authClient
