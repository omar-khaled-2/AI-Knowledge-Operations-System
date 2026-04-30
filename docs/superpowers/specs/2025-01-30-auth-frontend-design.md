# Frontend Auth Pages Design Spec

## Overview

Add minimal Google OAuth authentication pages to the Next.js frontend, following the Clay design system defined in `frontend/DESIGN.md`. Backend handles the full OAuth flow; frontend only provides the entry point and callback handler.

---

## Pages

### 1. `/login` — Sign In Page

**Purpose:** Entry point for authentication. Single CTA redirects to NestJS backend OAuth endpoint.

**Layout:**
- Full viewport height, flex-centered content
- Background: `{colors.canvas}` (#fffaf0)
- No top navigation — this is a standalone auth page

**Card:**
- Background: `{colors.surface-card}` (#f5f0e0)
- Border radius: `{rounded.xl}` (24px)
- Padding: `{spacing.xl}` (32px)
- Max width: 400px
- Centered horizontally

**Content (top to bottom):**
1. **App name/logo** — `{typography.display-sm}` (32px, weight 500, letter-spacing -0.5px)
2. **Subtitle** — "Sign in to continue" — `{typography.body-md}` (16px, weight 400)
3. **Google Sign-In Button** — full width within card
   - Background: `{colors.primary}` (#0a0a0a)
   - Text: `{colors.on-primary}` (white)
   - Typography: `{typography.button}` (14px, weight 600)
   - Border radius: `{rounded.md}` (12px)
   - Height: 44px
   - Padding: 12px × 20px
   - Icon: Google "G" icon (left-aligned inside button, 20px)
   - Label: "Continue with Google"
   - Hover: background transitions to `{colors.primary-active}` (#1f1f1f)
   - Click: redirects to backend OAuth endpoint (`/api/auth/google`)

**Responsive:**
- Mobile (< 768px): card has 16px horizontal margin, comfortable padding preserved
- Tablet/Desktop: card remains 400px max-width, centered

---

### 2. `/auth/callback` — OAuth Callback Handler

**Purpose:** Handle the redirect back from Google OAuth. Exchange authorization code for session, then redirect to app home.

**Layout:**
- Full viewport height, flex-centered content
- Background: `{colors.canvas}` (#fffaf0)

**States:**

#### Loading State (default)
- Subtle animated spinner (CSS-based, no external lib)
- Text: "Completing sign in..." — `{typography.body-md}`
- Text color: `{colors.muted}` (#6a6a6a)

#### Success State
- Not user-visible — immediate programmatic redirect to `/`

#### Error State
- Error icon (Lucide `AlertCircle`, 48px, `{colors.error}` #ef4444)
- Message: "Something went wrong. Please try again." — `{typography.body-md}`
- CTA button: "Back to Sign In" — `{component.button-primary}`
  - Links to `/login`

**Behavior:**
1. On mount, read `?code=` query parameter from URL
2. POST `{ code }` to backend endpoint: `POST /api/auth/callback`
3. On success (200): backend sets httpOnly JWT cookie; redirect to `/`
4. On error (4xx/5xx): display error state

---

## Route Structure

```
frontend/app/
├── (auth)/                    # Route group — omitted from URL
│   ├── login/
│   │   └── page.tsx           # Sign-in page component
│   └── auth/
│       └── callback/
│           └── page.tsx       # OAuth callback handler
│   └── layout.tsx             # Auth group layout (no nav, cream bg)
├── layout.tsx                 # Root layout (existing)
└── page.tsx                   # Home page (existing)
```

**Why a route group?**
- Keeps auth pages under `(auth)/` for clean organization
- Allows a shared auth layout (no top nav, full-height cream background)
- Does NOT add `(auth)` to the URL — routes remain `/login` and `/auth/callback`

---

## Data Flow

```
User clicks "Continue with Google"
        ↓
Frontend redirects to: GET /api/auth/google (NestJS backend)
        ↓
Backend redirects to Google OAuth consent screen
        ↓
Google redirects back to: /auth/callback?code=xxx
        ↓
Callback page POSTs code to: POST /api/auth/callback
        ↓
Backend exchanges code for tokens, creates/updates user, sets JWT cookie
        ↓
Backend responds 200 + user object
        ↓
Callback page redirects to: /
```

---

## Components Needed

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `GoogleSignInButton` | `components/auth/google-sign-in-button.tsx` | Reusable Google sign-in CTA with icon |
| `AuthCard` | `components/auth/auth-card.tsx` | Styled container for auth pages |
| `LoadingSpinner` | `components/ui/loading-spinner.tsx` | CSS-only animated spinner |

### Reused Design System Tokens

All styling uses Tailwind classes mapped from `DESIGN.md` tokens. No inline colors.

| Token | Tailwind Equivalent |
|---|---|
| `{colors.canvas}` | `bg-[#fffaf0]` |
| `{colors.surface-card}` | `bg-[#f5f0e0]` |
| `{colors.primary}` | `bg-[#0a0a0a]` |
| `{colors.primary-active}` | `hover:bg-[#1f1f1f]` |
| `{colors.on-primary}` | `text-white` |
| `{colors.muted}` | `text-[#6a6a6a]` |
| `{colors.error}` | `text-[#ef4444]` |
| `{rounded.xl}` | `rounded-3xl` (24px) |
| `{rounded.md}` | `rounded-xl` (12px) |
| `{spacing.xl}` | `p-8` (32px) |
| `{typography.display-sm}` | `text-[32px] font-medium tracking-tight` |
| `{typography.body-md}` | `text-base font-normal` |
| `{typography.button}` | `text-sm font-semibold` |

---

## Error Handling

| Error | Behavior |
|---|---|
| Missing `?code=` in callback | Show error state immediately |
| Backend returns 4xx | Show error state with generic message |
| Backend returns 5xx / network failure | Show error state with "Please try again" |
| User cancels Google OAuth | Google redirects without code; show error state |

All errors are non-blocking — user can always click "Back to Sign In" to retry.

---

## Backend Contract (Required)

The frontend expects these backend endpoints to exist:

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/api/auth/google` | GET | — | 302 redirect to Google OAuth |
| `/api/auth/callback` | POST | `{ "code": string }` | `{ "success": true, "user": { "id", "email", "name" } }` |

Backend must set an `httpOnly` JWT cookie on successful callback.

---

## Dependencies

**No new dependencies needed.** The project already has:
- `lucide-react` — for Google icon and error icon
- `tailwindcss` — for all styling
- `next` — for App Router, navigation, and query params

---

## Accessibility

- Google button is a real `<button>` element (not `<div>`)
- Button has `type="button"` and clear `aria-label="Sign in with Google"`
- Loading state announces via `aria-live="polite"`
- Error state uses `role="alert"`
- Focus visible styles use Tailwind `focus:ring-2`
- Minimum touch target: 44px height on all buttons

---

## Out of Scope

- Backend OAuth implementation ( NestJS Google OAuth strategy, JWT issuance )
- User profile/settings page
- Password-based authentication
- Session management beyond the callback redirect
- Email verification
- Password reset flow
- Multi-factor authentication
- Remember me / persistent sessions
- Logout page (handled by API call + cookie clear)

---

## Acceptance Criteria

- [ ] `/login` renders a centered card with Google sign-in button
- [ ] Button redirects to backend OAuth endpoint
- [ ] `/auth/callback` handles `?code=` and POSTs to backend
- [ ] On success, user is redirected to `/`
- [ ] On error, user sees error message + retry button
- [ ] All styling follows Clay design tokens
- [ ] Auth pages have no top navigation
- [ ] Responsive on mobile, tablet, and desktop
- [ ] Accessible (keyboard navigation, ARIA labels, focus states)

---

*Spec written: 2026-04-30*
*Design system: Clay (frontend/DESIGN.md)*
*Auth provider: Google OAuth only*
*Backend: NestJS (backend-handled OAuth)*
