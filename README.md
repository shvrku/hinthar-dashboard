# Hinthar Dashboard

Next.js App Router frontend for the Hinthar school management system (students, teachers, classes, timetable, session attendance, campus check-in). Backend: sibling repo **Hinthar-SMS**.

## Standards & plans

| Doc | Purpose |
|-----|---------|
| [`docs/FRONTEND_STANDARDS.md`](docs/FRONTEND_STANDARDS.md) | UX review, role gates, paginated pages, attendance IA, payroll scrap list |
| [`docs/SCALING_IMPLEMENTATION_PLAN.md`](docs/SCALING_IMPLEMENTATION_PLAN.md) | Cross-repo phased implementation |
| [`docs/hinthar-dashboard-design-system.md`](docs/hinthar-dashboard-design-system.md) | Design-system notes (shadcn; **base-vega / zinc**) |

UI: shadcn/ui + Tailwind. Auth: Clerk. API calls go to `/api/v1/*` and are proxied to Django.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Configure Clerk keys and `BACKEND_API_ORIGIN` / `NEXT_PUBLIC_API_ORIGIN` (default `http://localhost:8000`).

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- Backend OpenAPI at the SMS service: `/api/v1/docs/`
