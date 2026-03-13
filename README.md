# Jail Ministry Volunteer Portal

A Progressive Web App (PWA) for managing volunteers at the Douglas and Sarpy County jail ministries.

## Tech Stack

- **Next.js** (App Router) + TypeScript
- **Prisma** + PostgreSQL
- **Auth.js (NextAuth v5)** — credentials-based authentication
- **Tailwind CSS** + shadcn/ui components
- **Resend** — transactional email

## Getting Started

### 1. Prerequisites

- Node.js 18+
- Docker (for local PostgreSQL) or a remote PostgreSQL instance

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values. At minimum set:
- `DATABASE_URL` — PostgreSQL connection string
- `AUTH_SECRET` — generate with `openssl rand -base64 32`

### 4. Start the database (Docker)

```bash
docker-compose up -d
```

### 5. Run migrations and seed

```bash
npm run db:push      # Push schema to the database
npm run db:seed      # Seed initial churches and admin users
```

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Default Seed Accounts

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@jailministry.org | Admin1234! |
| Douglas Coordinator | douglas@jailministry.org | Coord1234! |
| Sarpy Coordinator | sarpy@jailministry.org | Coord1234! |

> **Change these passwords immediately in production.**

## Project Structure

```
app/
  (auth)/          login, register pages
  (volunteer)/     dashboard, schedule, my-visits
  (admin)/         volunteer management, visits, communications
  api/             REST API routes
components/
  ui/              shadcn/ui base components
  nav.tsx          sidebar + mobile navigation
lib/
  prisma.ts        Prisma client singleton
  auth.ts          NextAuth config (root level)
  email.ts         Resend email helpers
  utils.ts         Shared utilities
prisma/
  schema.prisma    Database schema
  seed.ts          Seed data
middleware.ts      Route-level auth + role enforcement
```

## Development Phases

- [x] **Phase 1** — Auth, registration & approval workflow, dashboards
- [ ] **Phase 2** — Visit scheduling (recurring + one-off), sign-ups
- [ ] **Phase 3** — Attendance tracking
- [ ] **Phase 4** — Email/SMS communications broadcast
- [ ] **Phase 5** — Reports, PWA polish, background check reminders
