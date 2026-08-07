# Hinthar System Audit Findings

**Date:** 2026-08-07  
**Scope:** `hinthar-dashboard` (Next.js 16 + Clerk) and `Hinthar-SMS` (Django REST + Clerk JWT)  
**Method:** Static code review of auth, permissions, proxies, serializers, analytics, and hot paths. No production exploit attempts were run against live systems.

Findings are ordered **critical → high → medium → low**, grouped from **system security** down to **performance**.

## Implementation status (2026-08-07)

| ID | Status | Notes |
|----|--------|-------|
| SEC-C1 | Done | `DEBUG` defaults False; mock auth requires `ENABLE_MOCK_AUTH=true` |
| SEC-C2 | Accepted | Local-only secrets; gitignored |
| SEC-H1 / BUG-H1 | Done | Inactive users rejected in auth |
| SEC-H2 | Done | Token only on retrieve + token actions |
| SEC-H3 | Done | Integration tests for pending/terminal 403 |
| SEC-M1–M6 | Done | iss/aud, generic errors, PUT admin guard, CORS, proxy allowlist, docs DEBUG-only |
| SEC-L1–L5 | Done | AdminUserSerializer, mock cap, JWKS kid bust, `BACKEND_API_ORIGIN`, static theme script |
| BUG-M1 / M2 / PERF-M1 | Done | Status-only `save` skips `full_clean`; `from_db` tracks status for audits |
| BUG-M3 | Deferred | Client→RSC data-fetch rewrite is a larger product change |
| PERF-H1 | Done | Dropped session list attendance prefetch |
| PERF-H2 | Done | Terminal QR: throttle, downscale, skip when locked/hidden; dynamic `jsqr` |
| PERF-H3 | Done | `range=all` still enrollment→today; lesson agg moved to SQL `Count`/`values` |
| PERF-M2 | Done | StatsView single multi-subselect COUNT query |
| PERF-M3 | Done | `jsqr` + `qrcode` dynamic; recharts charts extracted + `next/dynamic` on student/teacher/class detail |
| PERF-M4 | Done | Removed `experimental.cpus: 1` |
| PERF-M5 | Kept | Documented intentional OG tradeoff |
| PERF-M6 | Done | Optional `REDIS_URL` shared cache; else LocMem |

---

## Severity legend


| Severity     | Meaning                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------- |
| **Critical** | Auth bypass, secret exposure, or config that can fully compromise the system if mis-deployed |
| **High**     | Privilege / access control failure, or sensitive data exposure with clear blast radius       |
| **Medium**   | Hardening gap, partial guard, or scale problem that will hurt under real school load         |
| **Low**      | Defense-in-depth, maintainability, or minor perf debt                                        |


---



# 1. System Security Vulnerabilities



## CRITICAL



### SEC-C1 — `DEBUG` defaults to `True`, which enables mock-auth bypass


|                     |                                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Where**           | `Hinthar-SMS/config/settings.py` (`DEBUG`, `ENABLE_MOCK_AUTH`); `people/authentication.py` (`_authenticate_mock`) |
| **Impact**          | Full authentication bypass if production ever runs without `DEBUG=False`                                          |
| **Who is affected** | Entire API surface (any endpoint that accepts `Authorization: Bearer …`)                                          |


**Evidence**

- `DEBUG = os.getenv("DEBUG", "True").lower() == "true"` — insecure default.
- When `DEBUG` and `ENABLE_MOCK_AUTH` are on, any `Bearer mock_token_<suffix>` creates/returns a user with **no signature verification**.
- Mock identity is deterministic (`clerk_id = "clerk_" + token`). If a mock account was later promoted to `admin`/`staff` in Django admin, anyone who knows that token string authenticates **as that privileged user**.

**Mitigating factor:** `render.yaml` sets `DEBUG=False` for the Render service, so the current Render deploy is protected *if that env is present*. The insecure default still makes any forgotten env var catastrophic.

**Recommended fix**

1. Default `DEBUG` to `"False"`.
2. Require an explicit `ENABLE_MOCK_AUTH=true` **and** `DEBUG=True`; never default mock auth on.
3. Prefer a fixed allowlist of mock tokens in tests only, not open-ended `get_or_create`.

---



### SEC-C2 — Live secrets present in local `.env` / `.env.local` working trees


|                     |                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------- |
| **Where**           | `Hinthar-SMS/.env`, `hinthar-dashboard/.env.local`                                       |
| **Impact**          | Database takeover + Clerk tenant control if these files are shared, backed up, or leaked |
| **Who is affected** | Production/staging Neon DB, Clerk application                                            |


**Evidence**

- SMS `.env` contains a real Neon `DATABASE_URL` password and a Clerk `sk_test_…` secret.
- Dashboard `.env.local` contains the same Clerk secret key family.
- Both are **gitignored** (not tracked) — good — but they still sit in plaintext on disk.

**Status:** Accepted risk — local machine only (gitignored). No rotation required unless the machine or backups are shared.

---



## HIGH



### SEC-H1 — Deactivated users (`is_active=False`) can still authenticate


|                     |                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| **Where**           | `people/authentication.py` (mock + Clerk paths); no `is_active` check anywhere in auth/permissions |
| **Impact**          | “Deactivate user” in admin/API does **not** revoke API access                                      |
| **Who is affected** | Any user an admin thought they locked out                                                          |


DRF custom auth does not inherit Django’s inactive-user rejection. After JIT lookup, `(user, token)` is returned even when `user.is_active` is `False`. Role and permissions remain intact until the Clerk session expires — and the next request re-resolves the same row.

**Recommended fix:** After resolving the user, raise `AuthenticationFailed` if `not user.is_active`. Optionally also reject `role='pending'` at sensitive endpoints (already mostly gated by `IsStaffOrAbove`).

---



### SEC-H2 — Student `check_in_token` secrets returned in normal student list/detail payloads for staff


|                     |                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Where**           | `people/serializers.py` `StudentSerializer`                                                                                    |
| **Impact**          | QR check-in secrets mass-exported in every student list response                                                               |
| **Who is affected** | All students (campus check-in forgery if tokens leak via logs, proxies, screenshots, XSS, or over-permissioned staff accounts) |


`to_representation` strips tokens for non-owner / non-staff, but **admin and staff always receive** `check_in_token`. Listing 200 students therefore leaks 200 long-lived bearer-like secrets. Dedicated endpoints already exist (`check_in_token`, `regenerate_check_in_token`).

**Recommended fix:** Never include `check_in_token` in list serializers. Return it only from the explicit detail actions used to print/regenerate QR codes.

---



### SEC-H3 — Frontend role gates are client-only (UI), while API is the real gate


|                     |                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------- |
| **Where**           | `components/app-access-gate.tsx`, `components/require-role.tsx`                        |
| **Impact**          | Signed-in users can still *call* `/api/…` for routes the UI hides; backend must reject |
| **Who is affected** | `pending` / `terminal` / future `student`/`teacher` accounts                           |


This is mostly mitigated today because Django defaults to `IsStaffOrAbove` and check-in writes use `CanCheckIn`. Still, any future endpoint that forgets a permission class becomes immediately reachable from a browser with a valid Clerk session via the Next proxy.

**Recommended fix:** Keep treating backend permissions as source of truth; add integration tests that assert terminal/pending get 403 on staff routes. Do not rely on `AppAccessGate` alone.

---



## MEDIUM



### SEC-M1 — JWT `iss` not verified; `aud` verification is optional


|            |                                                   |
| ---------- | ------------------------------------------------- |
| **Where**  | `people/authentication.py` `jwt.decode(...)`      |
| **Impact** | Weaker token binding to this API / Clerk instance |


RS256 + signature + expiry are enforced (good). `audience` is only verified when `CLERK_JWT_AUDIENCE` is set; issuer (`iss`) is never checked.

**Recommended fix:** Require `iss` == configured Clerk issuer and always verify `aud`.

---



### SEC-M2 — Auth errors can leak internal exception text


|            |                                                                            |
| ---------- | -------------------------------------------------------------------------- |
| **Where**  | `people/authentication.py` catch-all `Token verification failed: {str(e)}` |
| **Impact** | Information disclosure to API clients                                      |


**Recommended fix:** Return a generic message; log the detail server-side.

---



### SEC-M3 — Last-admin protection only on PATCH, not PUT


|            |                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------- |
| **Where**  | `people/views.py` `UserViewSet` (`partial_update` only; `http_method_names` includes `put`) |
| **Impact** | Admin can demote the last admin via PUT and lock the org out of admin access                |


**Recommended fix:** Move the guard into `update` / `perform_update` / serializer validation so both verbs share it.

---



### SEC-M4 — Production CORS always trusts localhost origins with credentials


|            |                                                                                  |
| ---------- | -------------------------------------------------------------------------------- |
| **Where**  | `config/settings.py` `CORS_ALLOWED_ORIGINS`                                      |
| **Impact** | Credentialed cross-origin calls from malware/`localhost` apps on a staff machine |


Hardcoded `http://localhost:3000|3001` are always appended, even when `DEBUG=False`.

**Recommended fix:** Env-only allowlist; no localhost in production.

---



### SEC-M5 — API proxy path traversal on the Django host


|            |                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Where**  | `hinthar-dashboard/app/api/[...slug]/route.ts`                                                                           |
| **Impact** | Authenticated users may reach non-`/api/` paths on the **same** `API_ORIGIN` host (e.g. `/admin/`) if Django serves them |


`API_ORIGIN` is fixed (no classic open SSRF to arbitrary hosts). Slug is concatenated as ``${API_ORIGIN}/api/${cleanSlug}/`` with `redirect: "follow"`. Segments like `..` can normalize to other paths on that origin.

**Recommended fix:** Reject `..` / absolute URLs in slug; set `redirect: "manual"`; optionally allowlist path prefixes to `/api/v1/`.

---



### SEC-M6 — OpenAPI schema / Swagger mounted on the live API


|            |                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Where**  | `config/urls.py` (`/api/v1/schema/`, `/docs/`, `/redoc/`)                                                  |
| **Impact** | Full API map available to anyone who can authenticate as staff+ (and to anyone if permissions ever loosen) |


Uses default `IsStaffOrAbove`, so not public today, but docs on production increase recon value.

**Recommended fix:** Disable Spectacular UI in production or restrict to admin-only / internal networks.

---



## LOW



### SEC-L1 — `role` / `is_active` writable on shared `UserSerializer`

Safe today because `UserViewSet` is `IsAdmin` and create is disabled. Risky if the serializer is reused on a broader write endpoint later.

### SEC-L2 — Unbounded mock user creation

Distinct `mock_token_*` values each `get_or_create` a row while mock auth is on.

### SEC-L3 — JWKS cache has no kid-miss bust

Rotated Clerk keys may fail for up to 1 hour; functional more than security.

### SEC-L4 — `NEXT_PUBLIC_API_ORIGIN` exposes backend origin to the browser bundle

Browser traffic correctly uses same-origin `/api/v1` (`lib/api.ts`). The public env still advertises the Django host for anyone who reads the client bundle. Prefer server-only `BACKEND_API_ORIGIN` for the proxy.

### SEC-L5 — Theme bootstrap uses `dangerouslySetInnerHTML`

`app/layout.tsx` injects a small static theme script (reads `localStorage.theme`). Not user-controlled today — keep it static; do not interpolate request data into it.

---



# 2. Correctness / Reliability Issues



## HIGH



### BUG-H1 — Deactivate user does not match operator expectation

Same root cause as **SEC-H1**. UI/API can set `is_active=false`, but tokens keep working. Operators will believe accounts are locked when they are not.

---



## MEDIUM



### BUG-M1 — Session / AdHoc `full_clean()` on every `save()`


|            |                                                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Where**  | `class_sessions/models.py` `Session.save`, `AdHocSession.save`; `timetable/models.py` `TimetableSlot.save`                   |
| **Impact** | Extra validation cost; also triggers audit `pre_save` SELECT (see PERF). Bulk generation / status updates pay this every row |




### BUG-M2 — Audit signals issue an extra DB read per Session update


|            |                                                                                           |
| ---------- | ----------------------------------------------------------------------------------------- |
| **Where**  | `people/signals.py` `audit_session_pre_save` / `audit_adhoc_session_pre_save`             |
| **Impact** | Every status change = `SELECT` old row + `INSERT` audit log, synchronously in the request |




### BUG-M3 — Frontend pages fetch via client `useEffect` + Clerk `getToken`

Many staff pages (`sessions`, `users`, `attendance`, `timetable`, check-in overview) are client components that waterfall: hydrate → auth load → token → fetch. Works, but increases empty-state time and duplicate fetch logic vs server components.

---



# 3. Performance Issues



## HIGH



### PERF-H1 — Session list always `prefetch_related('attendances')`


|            |                                                                              |
| ---------- | ---------------------------------------------------------------------------- |
| **Where**  | `class_sessions/views.py` `SessionViewSet.queryset`                          |
| **Impact** | Listing sessions pulls **all attendance rows** for every session on the page |


With `page_size` up to **200** (`config/pagination.py`) and ~30 students/session, a list call can hydrate thousands of attendance rows even when the UI only needs session metadata.

**Recommended fix:** Drop default prefetch; use a detail serializer / nested endpoint when the matrix UI needs attendances.

---



### PERF-H2 — Terminal QR scanner runs `jsQR` every animation frame at full camera resolution


|            |                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| **Where**  | `app/(app)/check-in/terminal/page.tsx` `QrScanner`                                                      |
| **Impact** | Sustained high CPU on check-in tablets/phones; UI jank; heat/battery drain during peak morning check-in |


`requestAnimationFrame(scan)` → `getImageData` full frame → `jsQR` with no throttle, even while `scanLockedRef` is true (still decodes every frame).

**Recommended fix:** Skip decode while locked; throttle to ~5–10 fps; downscale canvas before `jsQR`; pause when tab hidden.

---



### PERF-H3 — Student analytics `range=all` builds a per-day calendar array since enrollment


|            |                                                                                              |
| ---------- | -------------------------------------------------------------------------------------------- |
| **Where**  | `people/student_analytics.py` `build_student_attendance_summary`                             |
| **Impact** | Multi-year enrollments return thousands of `campus_daily` objects + heavy Python aggregation |


Aggregation is in Python loops over all attendance rows (related objects are `select_related` — good), but payload size and CPU grow linearly with history.

**Recommended fix:** Keep `range=all` = since enrollment (product requirement). Push lesson aggregation to SQL (`values` + `Count`); keep full `campus.daily` series.

**Status:** Done — SQL aggregation for lesson counts/by_class/by_subject/trend; campus daily since enrollment unchanged.

---



## MEDIUM



### PERF-M1 — Audit `pre_save` SELECT on every Session / AdHocSession write

See BUG-M2. Under bulk session generation this doubles write QPS.

**Recommended fix:** Pass old status from the view, use `update_fields`, or write audit logs asynchronously / in bulk.

---



### PERF-M2 — `StatsView` runs N separate `COUNT(*)` queries (cached 5 min)


|            |                                                                               |
| ---------- | ----------------------------------------------------------------------------- |
| **Where**  | `class_sessions/views.py` `StatsView`                                         |
| **Impact** | Cold cache = 11 sequential counts; fine at small scale, slower as tables grow |


Cache TTL 300s helps. Prefer a single SQL with subselects or maintain counters if the dashboard polls often.

---



### PERF-M3 — Heavy client libraries imported eagerly


| Library        | Used on                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| `recharts`     | student/teacher/class detail pages; also `components/ui/chart.tsx` does `import * as RechartsPrimitive` |
| `motion/react` | terminal, sessions-adjacent UI, teachers, timetable, header, templates                                  |
| `jsqr`         | terminal (eager top-level import)                                                                       |


**Impact:** Larger JS for routes that do not need charts/camera.

**Recommended fix:** `next/dynamic` for chart sections and QR scanner; avoid `import `* from recharts in shared UI if possible.

---



### PERF-M4 — `experimental.cpus: 1` in `next.config.ts`


|            |                                                      |
| ---------- | ---------------------------------------------------- |
| **Impact** | Slower local/CI builds (single-threaded compilation) |


Only keep if it was required to work around a specific machine/OOM issue.

---



### PERF-M5 — `htmlLimitedBots: /.*/`


|            |                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| **Where**  | `next.config.ts`                                                                                                  |
| **Impact** | Blocking metadata for **all** user agents (intentional for Telegram OG), slightly worse TTFB vs streamed metadata |


Acceptable tradeoff if social previews matter; document it so it is not “fixed” accidentally.

---

