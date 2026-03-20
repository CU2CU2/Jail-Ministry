# Technology Stack

**Analysis Date:** 2026-03-20

## Languages

**Primary:**
- TypeScript 5.x - All application code (strict mode enabled)

**Secondary:**
- CSS (Tailwind utility classes via `app/globals.css`)

## Runtime

**Environment:**
- Node.js (LTS) - Server and build runtime

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js (latest) - Full-stack React framework; App Router with route groups `(auth)`, `(volunteer)`, `(admin)`; standalone output mode configured

**Auth:**
- NextAuth.js 5.0.0-beta.30 - Session management; credentials provider with JWT strategy; Prisma adapter

**ORM:**
- Prisma 6.x - PostgreSQL ORM; schema at `prisma/schema.prisma`; client generated to `@prisma/client`

**Build/Dev:**
- tsx 4.x - TypeScript execution for seed scripts (`prisma/seed.ts`)
- ESLint 9.x + `eslint-config-next` - Linting
- PostCSS 8.x + Autoprefixer - CSS processing

## Key Dependencies

**Critical:**
- `next-auth@5.0.0-beta.30` - Pre-release; credentials-based auth with role/status/county on JWT
- `@auth/prisma-adapter@^2.11.0` - Bridges NextAuth session storage to Prisma models
- `bcryptjs@^2.4.3` - Password hashing at login and registration
- `zod@^3.23.0` - Runtime schema validation (used in auth, API routes, forms)
- `resend@^3.3.0` - Transactional email (volunteer approval/rejection/pending notifications)

**UI:**
- `@radix-ui/react-*` (label, select, dialog, dropdown-menu, toast, slot, separator, avatar) - Accessible headless component primitives
- `lucide-react@^0.400.0` - Icon library
- `react-hook-form@^7.52.0` + `@hookform/resolvers@^3.9.0` - Form state and validation
- `class-variance-authority@^0.7.0`, `clsx@^2.1.1`, `tailwind-merge@^2.4.0` - Utility class composition (shadcn/ui pattern)

**Styling:**
- Tailwind CSS 3.4.x - Utility-first CSS; config at `tailwind.config.ts`

## Configuration

**Environment:**
- `DATABASE_URL` - PostgreSQL connection string (Prisma)
- `RESEND_API_KEY` - Resend email service API key
- `EMAIL_FROM` - Sender address (defaults to `Jail Ministry <noreply@jailministry.org>`)
- `NEXTAUTH_URL` - Canonical app URL (used in email links)
- `AUTH_SECRET` - NextAuth JWT signing secret (required by NextAuth v5)

**Build:**
- `next.config.ts` - output: "standalone"; serverActions allowedOrigins: `localhost:3000`, `jail-ministry.azurewebsites.net`
- `tsconfig.json` - strict: true; paths alias `@/*` maps to project root
- `postcss.config.mjs` - Tailwind + Autoprefixer
- `tailwind.config.ts` - Tailwind configuration

## Platform Requirements

**Development:**
- Docker + Docker Compose (`docker-compose.yml`) - Local PostgreSQL 16-alpine on port 5432
- Node.js with npm

**Production:**
- Azure App Service (`jail-ministry.azurewebsites.net`) - inferred from `next.config.ts` allowedOrigins
- PostgreSQL database (external; connection via `DATABASE_URL`)

---

*Stack analysis: 2026-03-20*
