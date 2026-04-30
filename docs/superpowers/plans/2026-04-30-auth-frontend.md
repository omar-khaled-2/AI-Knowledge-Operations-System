# Frontend Auth Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the frontend auth route group with login and OAuth callback pages, styled per the Clay design system, using only Google authentication.

**Architecture:** Next.js 14 App Router route group `(auth)` containing a shared layout (no nav, cream canvas background) and two pages: `/login` (centered card with Google CTA) and `/auth/callback` (loading/error state handler). Reusable components extracted for card container, Google button, and spinner.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind CSS v4, TypeScript, Lucide React icons

---

## File Structure

```
frontend/
├── app/
│   ├── (auth)/                    # Route group — no URL segment
│   │   ├── layout.tsx             # Auth layout: full height, cream bg, no nav
│   │   ├── login/
│   │   │   └── page.tsx           # Sign-in page: card + Google button
│   │   └── auth/
│   │       └── callback/
│   │           └── page.tsx       # OAuth callback: loading + error states
│   ├── layout.tsx                 # Root layout (existing — no changes)
│   └── page.tsx                   # Home page (existing — no changes)
├── components/
│   ├── auth/
│   │   ├── auth-card.tsx          # Cream card container with Clay styling
│   │   └── google-sign-in-button.tsx  # Google OAuth CTA button
│   └── ui/
│       └── loading-spinner.tsx    # CSS-only animated spinner
```

---

## Design Tokens Reference (from `globals.css`)

| Token | Tailwind Class | Value |
|---|---|---|
| Canvas bg | `bg-background` | `#fffaf0` |
| Card bg | `bg-card` | `#f5f0e0` |
| Primary btn | `bg-primary` | `#0a0a0a` |
| Primary text | `text-primary-foreground` | `#ffffff` |
| Muted text | `text-muted-foreground` | `#6a6a6a` |
| Error | `text-destructive` | `#ef4444` |
| Ink text | `text-foreground` | `#0a0a0a` |
| Card radius | `rounded-xl` | `24px` |
| Button radius | `rounded-md` | `12px` |
| Font sans | `font-sans` | Inter |

---

## Task 1: Auth Route Group Layout

**Files:**
- Create: `frontend/app/(auth)/layout.tsx`

**Purpose:** Shared layout for all auth pages. Full viewport height, cream canvas background, centered content. No top navigation.

- [ ] **Step 1: Create the auth layout file**

Create `frontend/app/(auth)/layout.tsx`:

```tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Verify the file is created**

Run: `ls frontend/app/\(auth\)/layout.tsx`
Expected: File exists

---

## Task 2: Reusable Auth Components

### Task 2a: Loading Spinner

**Files:**
- Create: `frontend/components/ui/loading-spinner.tsx`

**Purpose:** CSS-only animated spinner for callback loading state. No external libraries.

- [ ] **Step 1: Create the spinner component**

Create `frontend/components/ui/loading-spinner.tsx`:

```tsx
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export function LoadingSpinner({ className, size = "md" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  }

  return (
    <div
      className={cn(
        "inline-block rounded-full border-solid border-current border-t-transparent animate-spin",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  )
}
```

- [ ] **Step 2: Verify file creation**

Run: `ls frontend/components/ui/loading-spinner.tsx`
Expected: File exists

---

### Task 2b: Auth Card Container

**Files:**
- Create: `frontend/components/auth/auth-card.tsx`

**Purpose:** Styled card container used by both login and callback pages. Cream background, generous border radius, consistent padding.

- [ ] **Step 1: Create the auth card component**

Create `frontend/components/auth/auth-card.tsx`:

```tsx
import { cn } from "@/lib/utils"

interface AuthCardProps {
  children: React.ReactNode
  className?: string
}

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        "w-full max-w-[400px] bg-card rounded-xl p-8",
        className
      )}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Verify file creation**

Run: `ls frontend/components/auth/auth-card.tsx`
Expected: File exists

---

### Task 2c: Google Sign-In Button

**Files:**
- Create: `frontend/components/auth/google-sign-in-button.tsx`

**Purpose:** Primary CTA for Google OAuth. Full-width button with Google "G" icon, follows Clay button-primary styling.

- [ ] **Step 1: Create the Google sign-in button component**

Create `frontend/components/auth/google-sign-in-button.tsx`:

```tsx
"use client"

import { cn } from "@/lib/utils"

interface GoogleSignInButtonProps {
  className?: string
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

export function GoogleSignInButton({ className }: GoogleSignInButtonProps) {
  const handleSignIn = () => {
    // Redirect to backend OAuth endpoint
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/google`
  }

  return (
    <button
      type="button"
      onClick={handleSignIn}
      className={cn(
        "w-full h-11 px-5 py-3 bg-primary text-primary-foreground rounded-md",
        "text-sm font-semibold leading-none",
        "flex items-center justify-center gap-3",
        "transition-colors duration-200 hover:bg-[#1f1f1f]",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
        className
      )}
      aria-label="Sign in with Google"
    >
      <GoogleIcon />
      <span>Continue with Google</span>
    </button>
  )
}
```

- [ ] **Step 2: Verify file creation**

Run: `ls frontend/components/auth/google-sign-in-button.tsx`
Expected: File exists

---

## Task 3: Login Page

**Files:**
- Create: `frontend/app/(auth)/login/page.tsx`

**Purpose:** Sign-in entry point. Centered card with app branding, subtitle, and Google sign-in button.

- [ ] **Step 1: Create the login page**

Create `frontend/app/(auth)/login/page.tsx`:

```tsx
import { Metadata } from "next"
import { AuthCard } from "@/components/auth/auth-card"
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"

export const metadata: Metadata = {
  title: "Sign In",
}

export default function LoginPage() {
  return (
    <AuthCard>
      <div className="text-center space-y-6">
        {/* App branding */}
        <div className="space-y-2">
          <h1 className="text-[32px] font-medium tracking-tight text-foreground leading-tight">
            AI Knowledge Operations
          </h1>
          <p className="text-base font-normal text-muted-foreground">
            Sign in to continue
          </p>
        </div>

        {/* Google sign-in button */}
        <GoogleSignInButton />
      </div>
    </AuthCard>
  )
}
```

- [ ] **Step 2: Verify file creation**

Run: `ls frontend/app/\(auth\)/login/page.tsx`
Expected: File exists

---

## Task 4: OAuth Callback Page

**Files:**
- Create: `frontend/app/(auth)/auth/callback/page.tsx`

**Purpose:** Handle OAuth redirect from Google. Reads `?code=` query param, exchanges with backend, redirects on success or shows error state.

- [ ] **Step 1: Create the callback page**

Create `frontend/app/(auth)/auth/callback/page.tsx`:

```tsx
"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { AuthCard } from "@/components/auth/auth-card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

type CallbackState = "loading" | "error"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<CallbackState>("loading")
  const [errorMessage, setErrorMessage] = useState("Something went wrong. Please try again.")

  useEffect(() => {
    const code = searchParams.get("code")

    if (!code) {
      setState("error")
      setErrorMessage("No authorization code found. Please try signing in again.")
      return
    }

    const exchangeCode = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
        const response = await fetch(`${apiUrl}/api/auth/callback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
          credentials: "include",
        })

        if (!response.ok) {
          throw new Error(`Backend returned ${response.status}`)
        }

        const data = await response.json()

        if (data.success) {
          // Successful auth — redirect to home
          router.push("/")
        } else {
          throw new Error(data.error || "Authentication failed")
        }
      } catch (err) {
        setState("error")
        setErrorMessage(
          err instanceof Error ? err.message : "Something went wrong. Please try again."
        )
      }
    }

    exchangeCode()
  }, [searchParams, router])

  return (
    <AuthCard>
      <div className="text-center space-y-6" role="status" aria-live="polite">
        {state === "loading" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <LoadingSpinner size="md" className="text-muted-foreground" />
            <p className="text-base font-normal text-muted-foreground">
              Completing sign in...
            </p>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center gap-4 py-4" role="alert">
            <AlertCircle className="w-12 h-12 text-destructive" aria-hidden="true" />
            <p className="text-base font-normal text-foreground">
              {errorMessage}
            </p>
            <a
              href="/login"
              className="h-11 px-5 py-3 bg-primary text-primary-foreground rounded-md text-sm font-semibold leading-none inline-flex items-center justify-center transition-colors duration-200 hover:bg-[#1f1f1f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Back to Sign In
            </a>
          </div>
        )}
      </div>
    </AuthCard>
  )
}
```

- [ ] **Step 2: Verify file creation**

Run: `ls frontend/app/\(auth\)/auth/callback/page.tsx`
Expected: File exists

---

## Task 5: Environment Configuration

**Files:**
- Modify: `frontend/.env.local` (create if doesn't exist)

**Purpose:** Define the public API URL for the frontend to communicate with the backend.

- [ ] **Step 1: Create/update environment file**

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

- [ ] **Step 2: Verify file**

Run: `cat frontend/.env.local`
Expected: Contains `NEXT_PUBLIC_API_URL=http://localhost:3001`

---

## Task 6: Build and Verify

**Files:**
- No new files — verify everything compiles

- [ ] **Step 1: Run the Next.js build**

Run: `cd frontend && npm run build`
Expected: Build completes with no errors

- [ ] **Step 2: Check for TypeScript errors**

Run: `cd frontend && npx tsc --noEmit`
Expected: No TypeScript errors

---

## Task 7: Commit

- [ ] **Step 1: Stage all new files**

```bash
git add frontend/app/\(auth\)/
git add frontend/components/auth/
git add frontend/components/ui/loading-spinner.tsx
git add frontend/.env.local
git add docs/superpowers/specs/2026-04-30-auth-frontend-design.md
git add docs/superpowers/plans/2026-04-30-auth-frontend.md
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: add auth route group with Google OAuth login and callback pages

- Add (auth) route group with shared layout
- Create login page with Google sign-in CTA
- Create OAuth callback page with loading and error states
- Add reusable auth components: AuthCard, GoogleSignInButton, LoadingSpinner
- Style all pages per Clay design system (cream canvas, dark navy CTAs)
- Add NEXT_PUBLIC_API_URL env config"
```

---

## Spec Coverage Check

| Spec Requirement | Implementing Task |
|---|---|
| `/login` page with centered card | Task 3 |
| Single Google sign-in button | Task 2c, Task 3 |
| `/auth/callback` page | Task 4 |
| Loading state on callback | Task 4 (loading spinner) |
| Error state on callback | Task 4 (error display + retry button) |
| Cream canvas background | Task 1 (layout), Task 2b (card bg) |
| Dark navy CTA button | Task 2c (bg-primary) |
| No top navigation on auth pages | Task 1 (no nav in layout) |
| Responsive design | Task 2b (max-w-[400px], px-4), Task 1 (px-4) |
| Accessibility (ARIA, focus states) | Task 2c (aria-label, focus-ring), Task 4 (role, aria-live) |
| POST code to backend `/api/auth/callback` | Task 4 (exchangeCode fetch) |
| Redirect to `/` on success | Task 4 (router.push("/")) |

---

## Placeholder Scan

- [x] No "TBD", "TODO", or "implement later"
- [x] No vague "add error handling" without code
- [x] No "similar to Task N" references
- [x] All code blocks are complete and runnable
- [x] All file paths are exact
- [x] All commands include expected output

---

## Type Consistency Check

| Name | Defined In | Used In | Status |
|---|---|---|---|
| `AuthCardProps` | Task 2b | Task 3, Task 4 | ✅ Consistent |
| `GoogleSignInButtonProps` | Task 2c | Task 3 | ✅ Consistent |
| `LoadingSpinnerProps` | Task 2a | Task 4 | ✅ Consistent |
| `CallbackState` | Task 4 | Task 4 | ✅ Consistent |

---

*Plan written: 2026-04-30*
*Based on spec: docs/superpowers/specs/2026-04-30-auth-frontend-design.md*
