# External Integrations

**Analysis Date:** 2026-03-20

## APIs & External Services

**Email:**
- Resend - Transactional email delivery (volunteer approval, rejection, pending-approval coordinator alerts)
  - SDK/Client: `resend` npm package; singleton initialized in `lib/email.ts`
  - Auth: `RESEND_API_KEY` env var
  - Sender: `EMAIL_FROM` env var (default: `Jail Ministry <noreply@jailministry.org>`)
  - Triggered emails:
    - `sendApprovalEmail` - sent to volunteer on approval
    - `sendRejectionEmail` - sent to volunteer on rejection
    - `sendPendingNotificationEmail` - sent to coordinator when new volunteer registers

## Data Storage

**Databases:**
- PostgreSQL - Primary data store for all application data
  - Connection: `DATABASE_URL` env var
  - Client: Prisma 6.x ORM (`lib/prisma.ts`); singleton pattern with `globalThis` guard for Next.js hot-reload safety
  - Schema: `prisma/schema.prisma`
  - Local dev: Docker Compose (`docker-compose.yml`) runs `postgres:16-alpine` on port 5432

**File Storage:**
- None detected

**Caching:**
- None detected

## Authentication & Identity

**Auth Provider:**
- NextAuth.js v5 (beta) - Custom credentials-only authentication
  - Implementation: Email + bcrypt-hashed password via `Credentials` provider; no OAuth providers configured
  - Session strategy: JWT (stateless; no database session lookups after login)
  - Adapter: `@auth/prisma-adapter` — stores `Account`, `Session`, `VerificationToken` in PostgreSQL
  - Config: `auth.ts` (root); handlers exposed via `app/api/auth/[...nextauth]/route.ts`
  - Custom JWT claims: `id`, `role`, `status`, `county` added to token and session
  - Role-based access enforced in `middleware.ts`:
    - `SUPER_ADMIN`, `COUNTY_COORDINATOR` — access to `/admin/*`
    - `SUPER_ADMIN`, `COUNTY_COORDINATOR`, `TEAM_LEADER` — access to `/visits/*/attendance`
    - All other authenticated users — access to `/dashboard`, `/schedule`, `/my-visits`
  - Login gate: PENDING/REJECTED/INACTIVE users blocked at login with typed errors

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- Prisma client logs `error` + `warn` in development; `error` only in production (configured in `lib/prisma.ts`)
- No application-level structured logging detected

## CI/CD & Deployment

**Hosting:**
- Azure App Service — inferred from `next.config.ts` (`jail-ministry.azurewebsites.net` in `serverActions.allowedOrigins`)
- Next.js standalone output (`output: "standalone"` in `next.config.ts`) — suitable for containerized or App Service deployment

**CI Pipeline:**
- None detected in repository

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string
- `RESEND_API_KEY` - Resend transactional email
- `EMAIL_FROM` - Sender address for outbound email (optional; has default)
- `NEXTAUTH_URL` - Canonical base URL (used in email links)
- `AUTH_SECRET` - NextAuth v5 JWT signing secret

**Secrets location:**
- Environment variables only; no secrets management layer (Key Vault, etc.) detected

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None — Resend emails are fire-and-forget HTTP calls, not webhooks

---

*Integration audit: 2026-03-20*
