# School communications (Announcements & Events)

Product and UI contracts for the **School** sidebar domain in Hinthar-Dashboard, backed by Hinthar-SMS `communications` (`/api/v1/announcements/`, `/api/v1/events/`, `/api/v1/tags/`).

Related: [`FRONTEND_STANDARDS.md`](./FRONTEND_STANDARDS.md), [`ANIMATION_STANDARDS.md`](./ANIMATION_STANDARDS.md). Backend: SMS `communications/` + OpenAPI at `/api/v1/docs/`.

Last updated: **2026-09-02**.

---

## 1. Routes

| Route | Audience | Purpose |
|-------|----------|---------|
| `/announcements` | Signed-in school members | Press-style feed of published announcements |
| `/announcements/[slug]` | Signed-in | Blog-style detail (no tag chips on this page) |
| `/announcements/new` | Staff+ | Markdown compose + publish |
| `/announcements/[slug]/edit` | Staff+ | Edit existing |
| `/events` | Public + signed-in | Timeline of upcoming / going / past events |
| `/events/[slug]` | Public + signed-in | Event detail + register / cancel |
| `/events/manage` | Staff+ | Manage list |
| `/events/manage/new` | Staff+ | Compose + publish |
| `/events/manage/[slug]` | Staff+ | Dashboard (summary, slug, delete) |
| `/events/manage/[slug]/edit` | Staff+ | Edit compose |
| `/events/manage/[slug]/registrations` | Staff+ | Registration roster |

Events public browse can use unauthenticated `publicRequest` for external/public payloads; registration requires sign-in.

---

## 2. Announcements list (press feed)

Layout per row (top → bottom):

1. **Date** — muted, above the title (`month short` · `day` · `year`).
2. **Title** — large semibold; whole row links to `/announcements/[slug]`.
3. **Preview** — 1–2 line plain excerpt from markdown body (`descriptionPreview`, capped ~140 chars).
4. **Chips** — under the preview only (not on the detail slug page):
   - **Pinned** — yellow / amber pill with filled star + “Pinned” when `is_pinned`.
   - **Topic tags** — `#slugifiedname` pills with stable hash tones from `components/announcements/announcement-tags.tsx`.

Header: search (right) + staff icon-only **+** (no tag filter bar on the list).

Sort: pinned first, then `published_at` descending.

### Detail page

- Blog column `max-w-2xl`: back link, staff Edit, title, meta (`weekday date · By author`), markdown body.
- **Do not** render tag / pinned chips on the detail page — chips belong on the list.

### Skeletons

`AnnouncementsListSkeleton` mirrors date → title → preview → chip row.  
`AnnouncementDetailSkeleton` / `EditorPageSkeleton` mirror header + editor chrome.  
Source: `components/skeleton/communications-skeleton.tsx`.

---

## 3. Events

### Public / member home (`/events`)

- Header + Upcoming / Going / Past tabs (+ tag chips when signed in).
- Body: date-grouped **timeline** (rail + dots). Each event card is its own `StaggerItem` (same cascade pattern as announcement rows).
- Registration closed UI uses `isEventRegistrationOpen()` (`lib/communications-labels.ts`) — closed when `now >= (ends_at || starts_at)` (and explicit open/close window fields when set).

### Detail (`/events/[slug]`)

- Meta icons (date / location), registration card, about / location sections.
- Avoid `overflow-x-hidden` on the page root — pairs badly with stagger `y` and creates a bogus vertical scrollbar (see animation standards).

### Manage

- List: `StandardPageHeader` + bordered rows (`EventsManageListSkeleton` is **list body only** — header is real chrome while loading).
- Compose: `EventComposeScreen` with staggered header + form body; end time must be after start (UI clamp + API validation).
- Registrations: search + filter pills + guest rows (`EventRegistrationRosterSkeleton`).

### Skeletons

| Export | Matches |
|--------|---------|
| `EventsHomeSkeleton` | Timeline columns |
| `EventDetailSkeleton` | Back + title + meta + registration card |
| `EventComposeSkeleton` | Header + two-column compose |
| `EventManageDashboardSkeleton` | Header + split detail card |
| `EventsManageListSkeleton` | Manage list rows |
| `EventRegistrationsSkeleton` | Header + roster |
| `EventRegistrationRosterSkeleton` | Search / filters / rows |

---

## 4. Motion

All School communications pages use `StaggerContainer` / `StaggerItem`:

- Header (and tabs/toolbars) in early items.
- **Feed-style lists** (announcement rows, event cards): **one `StaggerItem` per row/card**, not one wrapper around the whole list.
- Loading / empty states: single `StaggerItem` around the skeleton or empty card.

Ops landings (Sessions find, Timetable, Attendance) already stagger; class-picker loading uses `ClassPickerCardSkeleton`; week grids use `WeekGridSkeleton` (`components/page-skeletons.tsx`).

---

## 5. Markdown viewer

`MarkdownContent` (`components/markdown-content.tsx`):

- Use `overflow-x-clip` (not `overflow-hidden` / page-level `overflow-x-hidden`) so long tokens clip horizontally without creating a vertical scrollport.
- Detail pages: `min-w-0` on the column; let the app `main` scroll when content is actually tall.

---

## 6. Backend contract (SMS)

| Concern | Behavior |
|---------|----------|
| Tags | Prefetched on list/detail; scope `announcement` \| `event` |
| Event end ≥ start | Serializer rejects `ends_at <= starts_at` |
| Registration window | Closed after `registration_closes_at`, before `registration_opens_at`, or when `now >= (ends_at or starts_at)` |
| Registration count | Confirmed only |
| Staff manage | Event CRUD + registration review actions |

Frontend helper: `isEventRegistrationOpen(event)` must stay aligned with SMS `_registration_window_open`.

---

## 7. File map

```text
app/(app)/announcements/...
app/events/...
components/announcements/announcement-tags.tsx
components/announcements/announcement-editor-form.tsx
components/events/...
components/skeleton/communications-skeleton.tsx
components/page-skeletons.tsx          # ClassPickerCardSkeleton, WeekGridSkeleton
lib/communications-labels.ts
lib/event-draft.ts
```
