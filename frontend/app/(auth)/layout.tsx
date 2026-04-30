import { ReactNode } from "react"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fffaf0] flex items-center justify-center px-4">
      {children}
    </div>
  )
}
