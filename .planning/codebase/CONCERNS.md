# Codebase Concerns

**Analysis Date:** 2026-03-20

## Tech Debt

**Floating `latest` dependency pins:**
- Issue: `next`, `react`, `react-dom`, `@types/react`, `@types/react-dom`, and `eslint-config-next` all pinned to `latest` in `package.json`. This makes builds non-deterministic and can silently break between installs.
- Files: `package.json`
- Impact: Upgrading Node modules or running `npm install` fresh can introduce breaking changes without any visible diff.
- Fix approach: Pin all dependencies to exact or semver-range versions after verifying the current `package-lock.json` state.

**next-auth beta dependency:**
- Issue: `next-auth` is pinned to `5.0.0-beta.30`, which is a pre-release. The beta v5 API (Auth.js) has breaking changes from v4 and is not yet stable.
- Files: `package.json`, `auth.ts`, `app/api/auth/[...nextauth]/route.ts`
- Impact: Upstream breaking changes in future beta releases require manual migration. Some Prisma adapter behaviors are undocumented.
- Fix approach: Monitor the Auth.js v5 stable release and migrate once GA, or downgrade to next-auth v4 (stable).

**Session type augmentation uses `as any` casts:**
- Issue: `auth.ts` attaches `role`, `status`, and `county` to the JWT token and session using six separate `as any` casts rather than properly augmenting the `Session`/`JWT` types via module augmentation in `types/next-auth.d.ts`.
- Files: `auth.ts` lines 64–80, `types/next-auth.d.ts`
- Impact: TypeScript provides no type-safety for `session.user.role` anywhere in the app. Typos silently pass compilation.
- Fix approach: Extend the `Session` and `JWT` interfaces in `types/next-auth.d.ts` with `role`, `status`, and `county` fields; remove all `as any` casts.

**No database migrations — schema managed with `prisma db push`:**
- Issue: The `db:push` script in `package.json` uses `prisma db push` (schema sync) rather than `prisma migrate`. There is no `prisma/migrations/` directory.
- Files: `package.json`, `prisma/schema.prisma`
- Impact: No migration history. Schema changes in production cannot be rolled back. Destructive changes (column drops, renames) silently destroy data.
- Fix approach: Switch to `prisma migrate dev` / `prisma migrate deploy` workflow and commit migration files to source control.

**No rate limiting on public registration endpoint:**
- Issue: `POST /api/register` is fully public with no rate limiting, CAPTCHA, or throttling.
- Files: `app/api/register/route.ts`
- Impact: The endpoint can be abused to flood the database with pending accounts and spam coordinator notification emails via Resend.
- Fix approach: Add IP-based rate limiting (e.g., `@upstash/ratelimit` or Next.js middleware) and consider adding a honeypot or CAPTCHA for registration.

**Signup capacity check is not atomic:**
- Issue: In `POST /api/signups`, the code reads `signups.length` and then creates a new signup in a separate query. No transaction or database-level constraint prevents two simultaneous signups from both passing the capacity check for the last open slot.
- Files: `app/api/signups/route.ts` lines 39–78
- Impact: A mod can be overfilled under concurrent requests (race condition).
- Fix approach: Wrap the capacity check and insert in a `prisma.$transaction` with a re-check inside, or enforce the cap with a database trigger/partial unique index.

**Visit date comparison ignores time zones:**
- Issue: `new Date(visitMod.visit.date) < new Date()` in the signup route compares visit dates without any timezone consideration. The `visit.date` field is stored as a plain `DateTime` in UTC. Depending on deployment server timezone, a visit scheduled for tonight could appear as "past" during the day.
- Files: `app/api/signups/route.ts` line 34, `app/api/admin/recurring/[id]/generate/route.ts` lines 36–46
- Impact: Volunteers in non-UTC timezones may be incorrectly blocked from signing up, or allowed to sign up for past visits.
- Fix approach: Store timezone with each visit or standardize on UTC with explicit offset handling.

## Security Considerations

**API routes excluded from middleware auth:**
- Risk: The middleware `matcher` pattern explicitly excludes `/api` paths (`(?!api|...)`). All API route authorization relies entirely on in-route `auth()` checks. Any route that forgets to call `auth()` is publicly accessible.
- Files: `middleware.ts` line 45
- Current mitigation: Each admin route manually calls `auth()` and checks role.
- Recommendations: Audit all API routes for missing auth checks. Consider adding a separate middleware layer that enforces auth on all `/api/admin/*` paths, providing defense in depth.

**Email HTML not sanitized:**
- Risk: `sendRejectionEmail` interpolates `reason` directly into HTML without escaping: `` `<p><strong>Reason:</strong> ${reason}</p>` ``. The `reason` value comes from an admin-entered form field.
- Files: `lib/email.ts` line 33
- Current mitigation: Only admins/coordinators can trigger this path (role-checked in the PATCH route).
- Recommendations: Escape HTML in all email template interpolations, or use a templating library that auto-escapes. Also applies to `name` fields throughout `lib/email.ts`.

**No CSRF protection on state-mutating API routes:**
- Risk: Next.js App Router does not add CSRF protection automatically. All `POST`/`PATCH`/`DELETE` routes accept requests from any origin as long as the caller holds a valid session cookie.
- Files: All routes under `app/api/`
- Current mitigation: Same-site cookie defaults provide partial protection in modern browsers.
- Recommendations: Add `SameSite=Strict` explicitly to the NextAuth session cookie config, or use a CSRF token pattern for sensitive mutations.

**Background check expiry hardcoded to +2 years:**
- Risk: The 2-year background check expiry is calculated inline with no configuration: `setFullYear(year + 2)`.
- Files: `app/api/admin/volunteers/[id]/route.ts` lines 48–54
- Current mitigation: None.
- Recommendations: Move expiry duration to an environment variable or app config so it can be adjusted without a code deploy.

## Performance Bottlenecks

**N+1 email sends on registration:**
- Problem: For every new registration, the API fires a separate `sendPendingNotificationEmail` call per coordinator/admin in a `for` loop.
- Files: `app/api/register/route.ts` lines 82–84
- Cause: No batch email send; each coordinator gets its own API call to Resend.
- Improvement path: Use Resend's batch send API or collect all recipient addresses into a single send call with BCC.

**Recurring visit generation uses per-visit DB writes in a loop:**
- Problem: `generate/route.ts` issues one `prisma.visit.create` per week in a sequential loop, up to 26 iterations.
- Files: `app/api/admin/recurring/[id]/generate/route.ts` lines 51–87
- Cause: No bulk insert; also does a `findFirst` existence check per iteration (another N queries).
- Improvement path: Use `prisma.visit.createMany` for bulk insert and a single date-range query to find all existing visits before the loop.

## Fragile Areas

**SMS notifications schema exists but implementation is absent:**
- Files: `prisma/schema.prisma` (NotificationChannel.SMS enum, Notification model), `.env.example` (Twilio vars commented out)
- Why fragile: The `Notification` model and `NotificationChannel.SMS` enum suggest SMS was planned. The Twilio env vars are commented out in `.env.example`. No sending code exists. Any feature that tries to process `PENDING` SMS notifications will silently do nothing or error.
- Safe modification: Treat the `Notification` table as write-only until a Twilio sending implementation is added.
- Test coverage: None.

**`UserCounty.BOTH` enum value used inconsistently:**
- Files: `prisma/schema.prisma`, `app/api/register/route.ts` lines 63–67, `app/api/admin/volunteers/[id]/route.ts` lines 32–39
- Why fragile: `BOTH` is valid on `User.county` but explicitly disallowed on `Mod.county` (comment says "not BOTH"). The coordinator county-scoping query in the register route uses a conditional `undefined` for `BOTH` users which may not filter as intended in Prisma (passing `undefined` to a where clause field removes the filter entirely).
- Safe modification: Test the coordinator lookup query with a `BOTH`-county volunteer to verify correct behavior.
- Test coverage: None.

## Missing Critical Features

**No SMS notification delivery:**
- Problem: `NotificationChannel.SMS` is defined in schema and Twilio env vars are documented but no sending implementation exists.
- Blocks: Any automated reminder workflow that targets SMS.

**No automated reminder scheduling:**
- Problem: There is no cron job, background worker, or scheduled function to process `PENDING` notifications in the `Notification` table. Notifications are written to the DB but never dispatched automatically.
- Blocks: Pre-visit reminder emails/SMS to signed-up volunteers.

**No attendance marking UI for team leaders:**
- Problem: The `SignupStatus` enum includes `ATTENDED` and `NO_SHOW`, and the middleware references `/attendance` paths, but no attendance route or page exists in the source tree.
- Blocks: Post-visit attendance tracking and reporting.

## Test Coverage Gaps

**No tests at all:**
- What's not tested: The entire application — all API routes, auth logic, signup capacity enforcement, recurring visit generation, role-based access control.
- Files: All files under `app/api/`, `auth.ts`, `lib/`, `middleware.ts`
- Risk: Regressions in auth, capacity checks, or visit generation go undetected. The race condition in signup creation cannot be caught without a concurrency test.
- Priority: High — especially for `app/api/signups/route.ts` (capacity race), `middleware.ts` (auth bypass), and `app/api/register/route.ts` (abuse vector).

---

*Concerns audit: 2026-03-20*
