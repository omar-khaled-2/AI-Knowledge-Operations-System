"use client"

import { SessionProvider } from "better-auth/react"
import { authClient } from "@/lib/auth-client"
import { ReactNode } from "react"

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider authClient={authClient}>
      {children}
    </SessionProvider>
  )
}
