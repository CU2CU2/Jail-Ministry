# Architecture

**Analysis Date:** 2026-03-20

## Pattern Overview

**Overall:** Next.js 15 App Router — monolithic full-stack application with co-located API routes and React Server Components.

**Key Characteristics:**
- Single Next.js app serves both frontend and backend (API routes)
- No separate service layer; business logic lives directly in API route handlers
- Role-based access enforced at two layers: middleware (page routes) and API handlers (data routes)
- Prisma ORM is the only data access abstraction; all queries are inline in route handlers
- No client-side state management library; component-level fetch + React state

## Layers

**Middleware (Auth + RBAC Gate):**
- Purpose: Intercepts all non-API page requests; enforces authentication and role-based page access
- Location: `middleware.ts`
- Contains: Auth check, redirect logic, role guards for `/admin` and `/attendance` paths
- Depends on: `auth.ts` (NextAuth session)
- Used by: All page routes

**Auth Configuration:**
- Purpose: NextAuth.js setup — credentials provider, JWT session strategy, role/county propagation into session token
- Location: `auth.ts`
- Contains: `handlers`, `auth`, `signIn`, `signOut` exports; bcrypt password validation; status checks (PENDING, REJECTED, INACTIVE)
- Depends on: `lib/prisma.ts`, `bcryptjs`, `zod`
- Used by: `middleware.ts`, all API route handlers

**API Route Handlers:**
- Purpose: Server-side business logic — CRUD, validation, authorization checks, email side effects
- Location: `app/api/**/*.ts` (route.ts files)
- Contains: Inline Prisma queries, Zod validation, session auth checks, role enforcement
- Depends on: `auth.ts`, `lib/prisma.ts`, `lib/email.ts`, `zod`
- Used by: Client components via `fetch()`

**Page Routes (UI):**
- Purpose: Server and client components rendering the application UI
- Location: `app/(admin)/`, `app/(auth)/`, `app/(volunteer)/`
- Contains: Page shells (server components) and interactive manager/form components (client components)
- Depends on: API routes (via fetch), `components/`, `components/ui/`
- Used by: End users via browser

**Shared UI Components:**
- Purpose: Reusable primitive UI elements (shadcn/ui pattern)
- Location: `components/ui/`
- Contains: `button`, `badge`, `card`, `input`, `label`, `select`, `textarea`
- Depends on: Tailwind CSS, `lib/utils.ts`
- Used by: Page route components

**Library Utilities:**
- Purpose: Singleton Prisma client, email sending, utility functions
- Location: `lib/`
- Contains: `prisma.ts` (singleton pattern for dev HMR safety), `email.ts` (Resend SDK wrappers), `utils.ts` (Tailwind class merge)
- Depends on: `@prisma/client`, `resend`
- Used by: API route handlers, `auth.ts`

## Data Flow

**Volunteer Sign-Up for a Visit:**

1. Authenticated volunteer browses `/schedule` page
2. Page fetches `GET /api/schedule` — returns upcoming visits with mod capacity
3. Volunteer selects a mod; client POSTs to `POST /api/signups`
4. API handler validates session, checks visit status, checks mod capacity, checks for duplicate signup
5. Prisma creates or re-activates a `VisitSignup` record
6. Updated signup returned as JSON; component updates UI state

**Volunteer Approval Flow:**

1. Admin views `/admin/volunteers` page
2. Page fetches `GET /api/admin/volunteers` — returns PENDING volunteers
3. Admin approves or rejects; client PATCHes `PATCH /api/admin/volunteers/[id]`
4. API handler validates role (SUPER_ADMIN or COUNTY_COORDINATOR), enforces county scoping
5. Prisma updates user status; `sendApprovalEmail` or `sendRejectionEmail` fires async (fire-and-forget via `.catch(console.error)`)
6. Success response returned

**State Management:**
- No global client state store; each client component manages local state with `useState`/`useEffect` and direct `fetch()` calls to API routes

## Key Abstractions

**Route Groups (Next.js):**
- Purpose: Separate layout contexts for different user roles without affecting URL paths
- Examples: `app/(admin)/`, `app/(auth)/`, `app/(volunteer)/`
- Pattern: Each group has its own `layout.tsx` that can enforce its own nav/shell

**VisitMod (Domain Model):**
- Purpose: Represents a specific jail module (cell block) within a visit event; tracks volunteer capacity per mod
- Key relations: `Visit` → many `VisitMod` → many `VisitSignup`
- Pattern: Capacity enforcement happens at `VisitMod` level, not at `Visit` level

**County Scoping:**
- Purpose: County Coordinators (DOUGLAS or SARPY) can only manage volunteers and visits in their county
- Pattern: Enforced inline in each API handler by comparing `session.user.county` to the resource's `county` field
- Files: `app/api/admin/volunteers/[id]/route.ts`, `app/api/admin/visits/route.ts`

## Entry Points

**Root Layout:**
- Location: `app/layout.tsx`
- Triggers: All page renders
- Responsibilities: HTML shell, Inter font, PWA metadata

**Public Home:**
- Location: `app/page.tsx`
- Triggers: Unauthenticated and authenticated requests to `/`
- Responsibilities: Landing/redirect page

**NextAuth Handlers:**
- Location: `app/api/auth/[...nextauth]/route.ts`
- Triggers: `/api/auth/*` requests (sign-in, sign-out, session)
- Responsibilities: Delegates entirely to NextAuth `handlers`

**Middleware:**
- Location: `middleware.ts`
- Triggers: Every non-static page request
- Responsibilities: Auth gate, RBAC redirects

## Error Handling

**Strategy:** Inline try/catch in each API route handler; no centralized error middleware.

**Patterns:**
- Zod parse errors return HTTP 400 with first error message
- Auth failures return HTTP 401 or 403 with JSON `{ error: "..." }`
- Unexpected errors log via `console.error` and return HTTP 500 with generic message
- Email sending failures are fire-and-forget (`.catch(console.error)`) — do not fail the request

## Cross-Cutting Concerns

**Logging:** `console.error` only — no structured logging or observability SDK
**Validation:** Zod schemas defined inline at the top of each API route handler
**Authentication:** NextAuth.js JWT strategy; `auth()` called at the top of every protected API handler

---

*Architecture analysis: 2026-03-20*
