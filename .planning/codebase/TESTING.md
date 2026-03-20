# Testing Patterns

**Analysis Date:** 2026-03-20

## Test Framework

**Runner:** None — no test framework is installed or configured.

**Assertion Library:** None

**Run Commands:** No test script exists in `package.json`.

## Test File Organization

**Location:** No test files exist in the project source tree.

**Naming:** Not applicable.

**Structure:** Not applicable.

## Current State

This codebase has **zero automated tests**. There are no:
- Unit tests for utility functions (`lib/utils.ts`, `lib/email.ts`)
- Integration tests for API routes (`app/api/**/*.ts`)
- Component tests for UI components (`components/`, page components)
- End-to-end tests

The only scripts in `package.json` are:
```bash
next dev       # Development server
next build     # Production build
next start     # Production server
next lint      # ESLint
prisma db push
prisma migrate dev
prisma studio
tsx prisma/seed.ts
```

## Recommended Setup

When adding tests, the standard Next.js 15 / TypeScript stack uses:

**Unit/Integration:**
- Jest + `@testing-library/react` + `jest-environment-jsdom`
- Or Vitest (faster, native ESM)
- Config file: `jest.config.ts` or `vitest.config.ts`

**E2E:**
- Playwright (official Next.js recommendation)

## High-Value Test Targets

Given the current codebase, the highest-value areas to test first:

**`lib/utils.ts` — Pure functions, no dependencies:**
- `formatDate(date)` — date formatting edge cases
- `formatTime(time)` — time string parsing and 12h conversion
- `cn(...inputs)` — Tailwind class merging

**API route auth guards:**
- Unauthenticated requests return 401
- Wrong-role requests return 401/403
- County coordinator cannot create visits outside their county

**Zod schemas (validate boundary behavior):**
- `visitSchema` rejects missing required fields
- `visitSchema` enforces `modIds` minimum length

## Mocking

**Framework:** Not applicable (no tests exist)

**Expected pattern when tests are added:**
```typescript
// Mock Prisma client
jest.mock("@/lib/prisma", () => ({
  prisma: {
    visit: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock next-auth
jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));
```

## Coverage

**Requirements:** None enforced.

**Coverage command:** Not configured.

---

*Testing analysis: 2026-03-20*
