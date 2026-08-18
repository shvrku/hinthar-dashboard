# Hinthar Dashboard

Next.js App Router frontend for the Hinthar school management system (students, teachers, classes, timetable, session attendance, campus check-in). Backend: sibling repo **Hinthar-SMS**.

## Standards & plans

| Doc | Purpose |
|-----|---------|
| [`docs/FRONTEND_STANDARDS.md`](docs/FRONTEND_STANDARDS.md) | UX review, role gates, paginated pages, attendance IA, payroll scrap list |
| [`docs/SCALING_IMPLEMENTATION_PLAN.md`](docs/SCALING_IMPLEMENTATION_PLAN.md) | Cross-repo plan — **phases 0–9 complete** |
| [`docs/hinthar-dashboard-design-system.md`](docs/hinthar-dashboard-design-system.md) | Design-system notes (shadcn; **base-vega / zinc**) |

UI: shadcn/ui + Tailwind. Auth: Clerk. API calls go to `/api/v1/*` and are proxied to Django.

## What it does

- **Role home (`/`)** — post-login dispatcher; staff land on **Overview (`/overview`)** with live KPIs, enrollment chart, and recent activity. Students land on a read-only `/students/[id]` hub (QR download only).
- **People & classes** — paginated lists; student / class / teacher hubs (enroll, QR lifecycle, attendance analytics)
- **Schedule** — timetable, generated sessions, Find sessions (slot-first), substitutes (`actual_teacher`)
- **Lesson attendance** — class / ad-hoc matrices; unmarked cells vs stored absent
- **Campus check-in** — school/class overview, terminal, QR activate/deactivate, corrections

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Configure Clerk keys and `BACKEND_API_ORIGIN` / `NEXT_PUBLIC_API_ORIGIN` (default `http://localhost:8000`).

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- Backend OpenAPI at the SMS service: `/api/v1/docs/`
