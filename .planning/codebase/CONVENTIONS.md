# Coding Conventions

**Analysis Date:** 2026-03-20

## Naming Patterns

**Files:**
- React page components: `page.tsx` (Next.js App Router convention)
- Feature components co-located with pages: kebab-case, e.g., `visits-admin.tsx`, `create-visit-form.tsx`
- API routes: `route.ts` (Next.js App Router convention)
- Utility modules: kebab-case, e.g., `lib/utils.ts`, `lib/email.ts`, `lib/prisma.ts`
- UI primitives: kebab-case under `components/ui/`, e.g., `button.tsx`, `card.tsx`

**Functions:**
- Named exports using PascalCase for React components: `export function VisitsAdmin(...)`
- camelCase for regular functions and handlers: `formatDate`, `formatTime`, `handleCancel`
- Event handlers prefixed with `handle`: `handleCancel`

**Variables:**
- camelCase for local variables and state: `cancelling`, `totalSlots`, `filledSlots`
- SCREAMING_SNAKE_CASE for module-level constants: `ADMIN_ROLES`, `STATUS_TABS`, `COUNTY_LABELS`, `ROLE_LABELS`, `STATUS_LABELS`

**Types:**
- PascalCase for local type aliases: `VisitWithMods`
- `interface Props` for component prop interfaces (named `Props`, not `ComponentNameProps`)
- Prisma-generated types imported directly from `@prisma/client`

## Code Style

**Formatting:**
- No Prettier config detected — relies on ESLint + Next.js defaults
- Double quotes for JSX attribute strings; double quotes for TypeScript string literals
- Trailing commas in multi-line objects and arrays
- 2-space indentation

**Linting:**
- ESLint 9 with `eslint-config-next`
- Config file: not present at root — uses Next.js built-in ESLint integration via `next lint`

**TypeScript:**
- `strict: true` in `tsconfig.json`
- `noEmit: true` (type-checking only, Next.js handles compilation)
- Target: ES2017

## Import Organization

**Order (observed pattern):**
1. React and Next.js framework imports (`next/server`, `next/navigation`, `react`)
2. Type imports from external packages (`@prisma/client`)
3. Internal UI components (`@/components/ui/...`)
4. Internal lib utilities (`@/lib/utils`, `@/lib/prisma`, `@/auth`)
5. Icon libraries (`lucide-react`)

**Path Aliases:**
- `@/*` maps to project root — used for all internal imports
- Example: `import { auth } from "@/auth"`, `import { prisma } from "@/lib/prisma"`

## Error Handling

**API Route Pattern:**
- Auth check at top of every handler; return `{ error: "Unauthorized" }` with status 401 immediately
- Role-based access checked against a constant array: `ADMIN_ROLES.includes(session.user.role)`
- Wrap mutation operations in `try/catch`
- Catch `z.ZodError` specifically and return `{ error: err.errors[0].message }` with status 400
- Generic catch returns `{ error: "Something went wrong." }` with status 500
- Log unhandled errors with `console.error(err)`

```typescript
// Standard API route error handling pattern
try {
  const data = visitSchema.parse(body);
  // ... mutation
  return NextResponse.json(result, { status: 201 });
} catch (err) {
  if (err instanceof z.ZodError) {
    return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
  }
  console.error(err);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}
```

**Client-Side Pattern:**
- No toast notifications — mutations use `router.refresh()` after completion
- Optimistic UI via local state (e.g., `cancelling` state to disable buttons during in-flight requests)
- No global error boundary for component-level fetch failures

## Validation

**Schema Library:** Zod (`zod` ^3.23.0)

**Pattern:** Schema defined at module level (not inside handler), named `[entity]Schema`:
```typescript
const visitSchema = z.object({
  title: z.string().min(1),
  county: z.enum(["DOUGLAS", "SARPY"]),
  date: z.string(),
  // ...
});
```

**Forms:** `react-hook-form` with `@hookform/resolvers` for Zod integration on client forms

## Logging

**Framework:** `console.error` only

**Pattern:**
- `console.error(err)` in API route catch blocks for unexpected errors
- No structured logging, no log levels beyond error

## Comments

**When to Comment:**
- Inline comments on non-obvious fields: `// ISO date string`, `// Array of mod IDs to include in this visit`
- Section comments in JSX for grouping: `{/* Tabs + Create button */}`, `{/* Visit list */}`, `{/* Mod breakdown */}`
- No JSDoc/TSDoc on functions

## Function Design

**Size:** Handlers are moderate-length, all logic inline (no service layer extraction)

**Parameters:** Component props via destructured `interface Props`; API handlers use Next.js `(req: Request)` signature

**Return Values:** API routes always return `NextResponse.json(...)` with explicit status codes on non-200 responses

## Module Design

**Exports:**
- Named exports throughout — no default exports on feature components
- Exception: Next.js page files use default exports (`export default function Page()`)

**Barrel Files:** Not used — all imports reference specific file paths

## Auth Pattern

Auth guard is repeated inline at the top of every protected API handler:
```typescript
const session = await auth();
if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

## Shared Constants

Label maps and enum constants live in `lib/utils.ts`:
- `COUNTY_LABELS` — display names for county enum values
- `ROLE_LABELS` — display names for role enum values
- `STATUS_LABELS` — display names for approval status values

---

*Convention analysis: 2026-03-20*
