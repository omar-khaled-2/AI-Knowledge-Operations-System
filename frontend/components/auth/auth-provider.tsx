"use client"

import { ReactNode } from "react"

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Better Auth v1.6+ doesn't require a SessionProvider wrapper.
  // Hooks like useSession work without any provider.
  return <>{children}</>
}
