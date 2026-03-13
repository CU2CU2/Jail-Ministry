# Jail Ministry Volunteer Management App — Project Plan

## Overview

A Progressive Web App (PWA) to manage volunteers for jail ministry operations at **Douglas County** and **Sarpy County** jails. The app supports self-registration with an admin approval workflow, shift scheduling, attendance tracking, and volunteer communications.

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Framework | **Next.js 14** (App Router) | Full-stack React, API routes, PWA-ready, great DX |
| Language | **TypeScript** | Type safety across frontend and backend |
| Database | **PostgreSQL** | Relational, reliable for scheduling/attendance data |
| ORM | **Prisma** | Type-safe DB queries, easy migrations |
| Auth | **NextAuth.js (Auth.js v5)** | Role-based auth, credentials + magic link |
| UI | **Tailwind CSS + shadcn/ui** | Fast, consistent, mobile-first components |
| PWA | **next-pwa** | Service worker, offline support, installable on phone |
| Email | **Resend** | Modern email API with React-based templates |
| SMS | **Twilio** | SMS reminders (optional, can be enabled later) |
| Deployment | **Vercel** (or self-hosted) | First-class Next.js support |

---

## User Roles

| Role | Scope | Key Permissions |
|---|---|---|
| **Super Admin** | All counties | Full access: manage users, counties, visits, reports, settings |
| **County Coordinator** | One county | Manage volunteers & visits for their county; approve/reject volunteers |
| **Team Leader** | Assigned visits | View their visit roster, take attendance, message their team |
| **Volunteer** | Self | Register, view schedule, sign up for / cancel visits |

---

## Data Model

### Core Entities

```
User
  id, name, email, phone
  role: SUPER_ADMIN | COUNTY_COORDINATOR | TEAM_LEADER | VOLUNTEER
  status: PENDING | APPROVED | REJECTED | INACTIVE
  backgroundCheckDate, backgroundCheckExpiry
  county: DOUGLAS | SARPY | BOTH
  notes (admin notes)
  createdAt, updatedAt

County
  id, name (Douglas | Sarpy)
  address, phone

RecurringSchedule
  id, countyId
  dayOfWeek (0–6), time, location
  volunteerCap, description
  isActive

Visit
  id, countyId
  title, date, startTime, endTime
  location, notes
  volunteerCap
  teamLeaderId (User)
  recurringScheduleId (nullable — links to parent schedule)
  status: SCHEDULED | COMPLETED | CANCELLED

VisitSignup
  id, visitId, userId
  status: SIGNED_UP | ATTENDED | NO_SHOW | CANCELLED
  signedUpAt

Notification
  id, userId
  channel: EMAIL | SMS
  type: REMINDER | ANNOUNCEMENT | APPROVAL | SCHEDULE_CHANGE
  subject, body
  sentAt, status: PENDING | SENT | FAILED
```

---

## Application Pages & Features

### Public / Unauthenticated
- `/` — Landing / about page with "Register as a Volunteer" CTA
- `/register` — Volunteer self-registration form
- `/login` — Email + password login (or magic link)

### Volunteer Dashboard
- `/dashboard` — Upcoming visits I'm signed up for, announcements
- `/schedule` — Browse upcoming visits (filtered by county), sign up / cancel
- `/my-visits` — History of past visits and attendance record
- `/profile` — Edit contact info, view approval status

### Team Leader (all volunteer pages +)
- `/visits/[id]/attendance` — Take attendance for their assigned visit

### County Coordinator (above +)
- `/admin/volunteers` — View, search, approve/reject volunteers for their county
- `/admin/visits` — Create, edit, cancel visits and recurring schedules
- `/admin/attendance` — Review attendance records
- `/admin/communications` — Send email/SMS to volunteers (filtered by county, visit, role)

### Super Admin (all above +)
- `/admin/counties` — Manage county records
- `/admin/users` — Full user management across all counties, assign roles
- `/admin/reports` — Volunteer activity reports, attendance summaries
- `/admin/settings` — App-wide settings (notification templates, background check reminders)

---

## Key Workflows

### 1. Volunteer Registration & Approval
```
Volunteer fills out /register form
  → Account created with status: PENDING
  → Email sent to County Coordinator: "New volunteer pending approval"
  → Coordinator reviews profile in /admin/volunteers
  → Coordinator approves (sets status: APPROVED + backgroundCheckDate)
     OR rejects with a reason
  → Volunteer receives email notification of decision
  → If approved, volunteer can now log in and sign up for visits
```

### 2. Scheduling Visits
```
Super Admin or County Coordinator creates a RecurringSchedule
  (e.g., "Every Thursday 6pm, Douglas County Jail")
  → System auto-generates Visit records for next N weeks
  → Visits appear on /schedule for approved volunteers to sign up

Or: Create a one-off Visit manually
  → Set date, time, location, volunteer cap, optional team leader
```

### 3. Volunteer Sign-Up
```
Volunteer browses /schedule
  → Filters by county / date
  → Clicks "Sign Up" on a visit (if not at capacity)
  → VisitSignup record created with status: SIGNED_UP
  → Confirmation email sent to volunteer
  → Reminder email/SMS sent 24 hours before the visit
```

### 4. Attendance Tracking
```
Team Leader opens /visits/[id]/attendance on visit day
  → Sees list of signed-up volunteers
  → Marks each as ATTENDED or NO_SHOW
  → Can add walk-in volunteers (marks ATTENDED without prior signup)
  → Submits attendance — coordinator is notified of summary
```

### 5. Communications
```
Coordinator opens /admin/communications
  → Selects audience: all volunteers | by county | by visit | by role
  → Composes subject + message
  → Chooses channel: email | SMS | both
  → Preview + send
  → Notification records created and sent via Resend/Twilio
```

---

## Project Folder Structure

```
jail-ministry/
├── app/                        # Next.js App Router
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (volunteer)/
│   │   ├── dashboard/
│   │   ├── schedule/
│   │   ├── my-visits/
│   │   └── profile/
│   ├── (admin)/
│   │   ├── volunteers/
│   │   ├── visits/
│   │   ├── attendance/
│   │   ├── communications/
│   │   ├── reports/
│   │   └── settings/
│   ├── api/                    # API route handlers
│   │   ├── auth/
│   │   ├── visits/
│   │   ├── signups/
│   │   ├── attendance/
│   │   └── notifications/
│   └── layout.tsx
├── components/
│   ├── ui/                     # shadcn/ui base components
│   ├── visits/
│   ├── volunteers/
│   └── forms/
├── lib/
│   ├── prisma.ts               # Prisma client singleton
│   ├── auth.ts                 # NextAuth config
│   ├── email.ts                # Resend email helpers
│   └── sms.ts                  # Twilio SMS helpers
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Seed data
├── public/
│   └── manifest.json           # PWA manifest
├── next.config.js
├── tailwind.config.ts
└── .env.example
```

---

## Development Phases

### Phase 1 — Foundation (MVP)
- [ ] Project setup: Next.js, TypeScript, Tailwind, Prisma, PostgreSQL
- [ ] Authentication (NextAuth) with role-based access control
- [ ] User registration form + approval workflow
- [ ] Volunteer dashboard skeleton

### Phase 2 — Scheduling
- [ ] Visit and RecurringSchedule data model + API
- [ ] Admin: Create/edit/cancel visits and recurring schedules
- [ ] Volunteer: Browse and sign up for visits
- [ ] Auto-generation of visit instances from recurring schedules

### Phase 3 — Attendance
- [ ] Team Leader attendance page
- [ ] Mark attended / no-show per visit
- [ ] Walk-in volunteer addition

### Phase 4 — Communications
- [ ] Email notifications (approval, confirmation, reminders)
- [ ] Admin communication broadcast tool
- [ ] SMS integration (Twilio)

### Phase 5 — Reports & Polish
- [ ] Attendance and volunteer activity reports
- [ ] PWA manifest + offline support
- [ ] Background check expiry reminders
- [ ] Final UI polish and mobile optimization

---

## Environment Variables Needed

```env
# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=

# SMS (Twilio - optional)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

---

## Notes & Considerations

- **Background checks**: The app tracks dates but does not integrate with a background check provider — coordinators manually enter the date when a check clears. An automated reminder can be sent when a background check is approaching expiry (e.g., 30 days before).
- **County separation**: Douglas and Sarpy data is logically separated. Coordinators only see and manage their assigned county. Super Admins see both.
- **Capacity limits**: Visits have a `volunteerCap`. The sign-up flow enforces this and can show a waitlist in a future phase.
- **Privacy**: Volunteer personal information (phone, address) is visible only to Coordinators and above, not to other volunteers.
- **Offline / PWA**: The schedule and personal visit list should be viewable offline via service worker caching. Sign-ups require connectivity.
