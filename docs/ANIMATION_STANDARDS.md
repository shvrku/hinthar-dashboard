# Hinthar-Dashboard Animation Standards

Motion stack: **GSAP 3** + **`@gsap/react`** (`useGSAP`). Motion / Framer Motion is **not** used.

Token source of truth: [`lib/gsap/easings.ts`](../lib/gsap/easings.ts).

Related: [`docs/FRONTEND_STANDARDS.md`](./FRONTEND_STANDARDS.md), [`docs/hinthar-dashboard-design-system.md`](./hinthar-dashboard-design-system.md).

---

## 1. Goals

1. **Layout-stable loading** — containers keep a consistent footprint between skeleton and loaded states.
2. **No pop-in** — sections, cards, and table rows enter with short fades (and slight rise for sections/cards).
3. **Directional table reveals** — pagination from the top bar reveals top→bottom; from the bottom bar reveals bottom→top.
4. **One system** — shared timings/easings; pages compose primitives instead of inventing one-off tweens.
5. **React-safe** — never keep `style={{ opacity: 0 }}` on elements that re-render; use CSS data attributes + `clearProps` after tweens.

---

## 2. Timing tokens

| Token | Value | Use |
|-------|-------|-----|
| `durations.page` | `0.4s` | Route `template.tsx` enter |
| `durations.enter` | `0.45s` | Header / generic mount enter |
| `durations.reveal` | `0.4s` | `StaggerItem` / Card cascade |
| `durations.row` | `0.32s` | Table row fade |
| `durations.presence` | `0.22s` | Theme toggle, small swaps, `GsapEnter` |
| `durations.hover` | `0.18s` | Reserved for pointer micro-interactions |
| `staggers.section` | `0.07s` | Delay between stagger items / cards |
| `staggers.row` | `0.045s` | Delay between table rows |
| `staggers.card` | `0.06s` | Reserved (cards currently use `section`) |
| `easeOutSoft` | `power2.out` | UI enters / reveals / rows |
| `easeOutSnap` | `power3.out` | Icon / presence swaps |
| `TABLE_ROW_STAGGER_CAP` | `24` | Max rows staggered individually; remainder fades as a group |

Base stagger delay before the first item: **`0.04s`**.

Item delay formula:

```text
delay = 0.04 + index * staggers.section
```

Do not invent new durations in pages without updating `easings.ts`.

---

## 3. Primitives (what to use)

| Primitive | Path | Role |
|-----------|------|------|
| Timing tokens | `lib/gsap/easings.ts` | Shared durations / easings / staggers / row cap |
| `prefersReducedMotion` / `usePrefersReducedMotion` | `lib/gsap/reduced-motion.ts` | Gate GSAP when OS reduced-motion is on |
| `useGsapEnter` | `lib/gsap/use-gsap-enter.ts` | One-shot mount enter on a ref |
| `GsapEnter` | `components/animation/gsap-enter.tsx` | Wrapper for keyed remount enters (toasts, panels) |
| `GsapPresence` | `components/animation/gsap-presence.tsx` | Exit→enter swap (theme icon) |
| `StaggerContainer` / `StaggerItem` / `useStaggerEntrance` | `components/animated-stagger.tsx` | Page section cascade |
| `Card` (auto-stagger) | `components/ui/card.tsx` | Cards inside a container cascade automatically |
| `StableBlock` | `components/animation/stable-block.tsx` | Lock min-height across loading ↔ loaded |
| `AnimatedTableBody` | `components/animation/animated-table-body.tsx` | Skeleton / idle / empty / streamed rows |
| `TableRevealProvider` | `components/animation/table-reveal-context.tsx` | Top vs bottom pagination reveal direction |
| `StandardTablePagination` | `components/standard-table-pagination.tsx` | Set `placement="top" \| "bottom"` |
| Shimmer skeleton | `components/ui/skeleton.tsx` + `.skeleton-shimmer` in `globals.css` | Loading placeholders |

---

## 4. Patterns by surface

### 4.1 Page shell

- Every authenticated page content tree should sit in a **`StaggerContainer`**.
- Wrap non-card blocks (headers, banners, toolbars that are not Cards) in **`StaggerItem`**.
- Route-level enter: [`app/(app)/template.tsx`](../app/(app)/template.tsx) via `useGsapEnter` + `data-gsap-enter`.
- Site header: one-shot enter via `useGsapEnter` + `data-gsap-enter`.

### 4.2 Cards

- Inside `StaggerContainer`, **`Card` auto-staggers** (`data-stagger-card`).
- Cards **nested inside a `StaggerItem` do not** double-animate (`NestedStaggerContext`).
- Prefer leaving metric / detail cards as naked `Card`s under the container so they cascade individually (dashboard stats, detail hubs).
- When a whole strip should move as one beat (legacy list pattern), wrap it in one `StaggerItem`.

### 4.3 Loading & skeletons

- Prefer **shimmer** (`.skeleton-shimmer`), not `animate-pulse`.
- Skeleton bars should be **column-aligned** (`w-full max-w-*`), not free-floating fixed widths that look jagged.
- Reserve table height with ~**8 rows** (`TABLE_RESERVE_ROWS`), not full `pageSize` (avoids huge empty voids).
- Shimmer count may be smaller than reserved height; fillers pad silently (`aria-hidden`).
- **Idle (never loaded):** centered icon + title + short description — not a single divider line with “Click Load Data…”.
- **Empty (loaded, zero rows):** same placeholder style with a search/empty icon.
- **Reload with data:** keep rows, soft opacity pulse — do not collapse back to full skeleton.

### 4.4 Tables

```tsx
<TableRevealProvider>
  <StandardTablePagination placement="top" className="mb-4" ... />
  <Card>
    <Table>
      <TableHeader>...</TableHeader>
      <AnimatedTableBody
        loading={loading}
        hasData={rows.length > 0}
        idle={lastLoaded === null}
        rowCount={Math.min(pageSize, 8)}
        skeletonRowCount={Math.min(pageSize, 8)}
        colSpan={N}
        skeleton={<XxxTableSkeletonRows rows={...} />}
        idleTitle="…"
        idleDescription="…"
        emptyTitle="…"
        emptyDescription="…"
      >
        {rows.map((row) => (
          <TableRow key={row.id}>…</TableRow>
        ))}
      </AnimatedTableBody>
    </Table>
  </Card>
  <StandardTablePagination placement="bottom" className="mt-4" ... />
</TableRevealProvider>
```

**Row animation rules**

- Opacity-only (no `y` / `x`) — prevents table wrapper scrollbars during tweens.
- Table wrapper: `overflow-x-auto overflow-y-hidden`.
- Reveal direction from context: top bar → `stagger.from: "start"`; bottom bar → `"end"`.
- Direction is recorded on pagination click; tween runs when **row React keys** change (after fetch), not when page state flips early.
- Dual pagination (top + bottom) on list pages that paginate.
- Stagger at most **`TABLE_ROW_STAGGER_CAP` (24)** rows individually; remaining rows fade in as one group.
- Do not pass a separate `animationKey` — child React keys drive the reveal.

### 4.5 Bootstrap overlay & navigation progress bar

Two global motion layers handle loading outside the page content tree. Both live above the sidebar (`z-[9998]` / `z-[9999]`).

#### Bootstrap overlay (`components/bootstrap-overlay.tsx`)

Shown during the initial app load — covering Clerk session verification, Django `/me/` profile fetch, and the role-based router dispatch. Stays visible until all three phases complete, then fades out.

| Detail | Value |
|--------|-------|
| Background | `bg-background` — inherits light/dark theme automatically |
| Icon | Inline SVG (1024×1024 viewBox, 90×90px render). `rx="240"` on the background rect matches `--radius-2xl`. Light mode: `fill-foreground` rect + white layers. Dark mode: rect transparent, white layers float on dark bg. |
| Layer stagger | `opacity 0→1`, `y 10→0`, 120 ms between layers (`easeOutSoft`, `durations.reveal`). |
| Progress bar | 5 px tall, `bg-foreground/10` track, `bg-foreground/70` fill. Tweens to fake-indeterminate breakpoints per phase (`easeOutSoft`, 0.6 s). |
| Phases | `session (20%) → profile (60%) → routing (88%) → done (100%)` |
| Exit | `gsap.to(overlay, { opacity: 0, duration: 0.35, ease: easeOutSnap })` then unmount. |
| Debug keybind | `Shift+D` — toggles a phase label under the bar (hidden from normal users). |
| Slow-network hint | After 8 s in any non-done phase a "Taking longer than expected" message + Reload button appear. |
| Reduced motion | All GSAP calls gated behind `prefersReducedMotion()`. |

**Phase lifecycle:**

```text
Clerk isLoaded? no  → phase = "session"
profile loading?    → phase = "profile"
role resolved, route not yet changed? → phase = "routing"
pathname != "/"     → phase = "done" → fade out overlay
```

**Do not** render `AccountBootstrapScreen` or any per-page spinner inside the `(app)` layout while this overlay is mounted. Loading states within `AppAccessGate`, `RequireRole`, and dispatcher pages return `null` — the overlay covers them.

#### Navigation progress bar (`components/navigation-progress.tsx`)

A 2 px viewport-fixed bar at `top-0` (`z-[9998]`) that fires on every client-side route change **after** the bootstrap overlay has unmounted.

| Detail | Value |
|--------|-------|
| Trigger | `usePathname()` change (skips the very first paint) |
| Color | `bg-foreground` — always contrasts regardless of palette |
| Motion | `scaleX: 0 → 0.8` (`easeOutSoft`, 0.4 s) then `→ 1` (`power1.out`, 0.2 s), container fades out after 50 ms |
| Reduced motion | All GSAP calls gated behind `prefersReducedMotion()` |

### 4.6 Small presence

- Theme toggle: `GsapPresence`.
- Terminal alerts / confirmation panels: `GsapEnter` with a stable `key` to replay.
- Prefer remount-enter over building a full AnimatePresence clone unless exit choreography is required.

### 4.6 CSS initial hide (mandatory)

```css
[data-stagger-item]:not([data-stagger-shown]),
[data-stagger-card]:not([data-stagger-shown]) { opacity: 0; }

[data-gsap-enter]:not([data-gsap-entered]) { opacity: 0; }
```

After tween complete: set `data-*-shown` / `data-gsap-entered` and `clearProps: "opacity"` (and `"transform"` where used).

**Never** leave React `style={{ opacity: 0 }}` on staggered nodes — re-renders re-hide content after GSAP finishes.

### 4.7 Reduced motion

Preference sources (in order):

1. Header **MotionToggle** (turtle / rabbit) — persisted in `localStorage` as `reduced-motion`.
2. Else OS `prefers-reduced-motion: reduce`.

Applied via `data-reduced-motion="true|false"` on `<html>` (beforeInteractive init script + `MotionPreferenceProvider`).

When reduced:

- GSAP enters / staggers / presence / table row reveals **skip** (`prefersReducedMotion()`).
- CSS shows stagger / enter nodes immediately (opacity 1).
- Skeleton shimmer animation is frozen (static muted fill).

Staff can force motion on even if the OS asks for reduce (toggle sets `data-reduced-motion="false"`).

---

## 5. Do / don’t

**Do**

- Use `useGSAP` for setup/teardown under React 19.
- Mark shown state with data attributes after tweens.
- Cap reserved table rows (~8–12).
- Cap row stagger with `TABLE_ROW_STAGGER_CAP`.
- Pass `placement` on both pagination bars inside `TableRevealProvider`.
- Respect reduced motion via header toggle + OS fallback (`lib/gsap/reduced-motion.ts`, `MotionPreferenceProvider`, globals CSS).
- Keep Motion out of the dependency tree.

**Don’t**

- Drive permanent visibility with React inline opacity.
- Animate table rows with translate Y/X.
- Pad fillers to `pageSize` (50+).
- Put ScrollTrigger / complex timelines on every list page.
- Animate sidebar chrome or Clerk widgets with this system.
- Reintroduce per-page `animationKey` props for table reveals.

---

## 6. Checklist for new pages

1. Wrap page body in `StaggerContainer`.
2. `StaggerItem` for header / non-card sections.
3. Let `Card`s auto-stagger (or wrap a group in one `StaggerItem` if they must move together).
4. Lists: `AnimatedTableBody` + idle/empty copy + shimmer skeletons.
5. Paginated lists: `TableRevealProvider` + top/bottom `placement`.
6. Loading: shimmer + reserved height; reload keeps data when possible.
7. No new timing constants outside `easings.ts`.

---

## 7. Performance impact assessment

Assessment date: **2026-08-07**. Qualitative + package-size based; not a Lighthouse CI run.

### 7.1 Bundle / dependency

| Item | Approx. size | Notes |
|------|----------------|-------|
| `gsap` min build (`gsap.min.js`) | ~71 KB (raw file on disk) | Core only; no ScrollTrigger / Flip plugins registered |
| `@gsap/react` | ~2.6 KB | `useGSAP` lifecycle helper |
| Removed `motion` | — | Net win vs Motion’s larger React runtime for our usage |

GSAP is tree-shaken at the import level to core. We do **not** register premium plugins. Cost is paid once per client session after JS download/parse.

### 7.2 Runtime cost by animation type

| Surface | When it runs | DOM work | Cost | Risk |
|---------|--------------|----------|------|------|
| Route `template` enter | Each soft navigation | 1 node opacity + y | Low | Low |
| Header enter | App shell mount | 1 node | Low | Low |
| Stagger sections / cards | Page mount (once per node) | ~5–20 nodes typical | Low–medium | Medium if dozens of cards mount at once |
| Table row reveal | After fetch / page change | Up to page size (often ≤50; reserved UI ~8) | Medium | Higher if `pageSize` is 100–200 |
| Reload pulse | While refetch with `hasData` | Existing rows opacity | Low | Low |
| Skeleton shimmer | CSS only while loading | GPU-friendly gradient | Low | Low (infinite CSS; stops when unmounted) |
| Theme / terminal presence | Occasional | 1–2 nodes | Low | Low |
| Filler rows | Always with reserved height | Up to ~8 empty `<tr>` | Low DOM | Avoid raising reserve without need |

### 7.3 What we already optimized for

- **No layout thrash on rows** — opacity-only row tweens; `overflow-y-hidden` on table containers.
- **No permanent React opacity fights** — data-attribute hide + `clearProps`.
- **No double Card animation** inside `StaggerItem`.
- **Reserved height capped** — prevents 50× empty filler rows.
- **Row stagger capped** — `TABLE_ROW_STAGGER_CAP` (24); remainder fades as a group.
- **Reveal direction without extra layout** — GSAP `stagger.from: "start" | "end"`.
- **Tween cleanup** via `useGSAP` (kills tweens on unmount / dep change).
- **Reduced motion** — GSAP skipped; CSS shows content immediately; shimmer frozen.

### 7.4 Measured / expected impact (guidance)

| Metric | Expected impact | Rationale |
|--------|-----------------|-----------|
| JS parse/compile | Small one-time increase vs no animation lib | ~GSAP core only |
| TTI / hydration | Negligible for shell; page content still client-fetched | Animations run after mount |
| CLS | Improved vs hard skeleton swap | Reserved height + stable cards |
| INP / main-thread during page change | Short burst (~0.3–0.6s of staggered tweens) | Row cap + modest section counts |
| Memory | Low; tweens cleared after complete | Avoid leaving infinite GSAP loops (we don’t) |
| Battery / low-end devices | Acceptable for admin desktop use | Prefer CSS shimmer over JS loops for loading |

### 7.5 Lighthouse sample (2026-08-07)

Local `npm run dev` + Lighthouse performance-only (headless Chrome). Auth/session and cold local cache dominate FCP/LCP/TBT; use these as a **CLS / animation-layout** check, not a production perf baseline.

| Route | Perf score | FCP | LCP | TBT | CLS | Speed Index |
|-------|------------|-----|-----|-----|-----|-------------|
| `/students` | 0.29 | 3.9 s | 10.2 s | 2,860 ms | **0** | 13.0 s |
| `/teachers` | 0.32 | 3.7 s | 9.1 s | 1,730 ms | **0** | 9.8 s |
| `/check-in/overview` | 0.31 | 4.3 s | 9.8 s | 1,950 ms | **0** | 9.3 s |

**Takeaway:** CLS stayed at **0** on all three routes — reserved skeletons + opacity-only row reveals are not introducing layout shift. Absolute scores are poor in this local/dev sample (JS blocking + data fetch), unrelated to GSAP choreography.

### 7.6 Hotspots to watch

1. **Large `pageSize` (100–200)** — only the first/last 24 rows stagger; rest group-fade. Prefer default ≤50 anyway.
2. **Dashboard / detail with many Cards** — each Card claims a stagger index. Fine for &lt; ~20; above that, group into fewer `StaggerItem`s.
3. **Strict Mode double-mount in dev** — may replay enters once; production mounts once.

### 7.7 Verdict

| Area | Rating | Summary |
|------|--------|---------|
| Bundle | **Acceptable** | GSAP core replaces Motion; no extra plugins |
| List page UX cost | **Good** | Layout stability gains outweigh short tween cost |
| CLS (sampled) | **Good** | 0 on students / teachers / check-in overview |
| Worst-case main thread | **Bounded** | Row stagger cap + reserved-height cap |
| Overall for staff dashboard | **Ship** | Patterns are bounded; follow checklist to avoid regressions |

---

## 8. Follow-ups

Completed (2026-08-07):

1. **`prefers-reduced-motion`** — GSAP skipped; CSS shows content; shimmer frozen. Header **MotionToggle** overrides OS and persists in `localStorage`.
2. **Row stagger cap** — `TABLE_ROW_STAGGER_CAP = 24`; remainder fades as a group.
3. **Lighthouse sample** — `/students`, `/teachers`, `/check-in/overview` (see §7.5); CLS 0.
4. **`animationKey` removed** — reveal driven by child React keys only.

Completed (2026-08-18):

5. **Bootstrap overlay** — full-page GSAP loading screen covering session + profile + routing phases (§4.5). Replaces all per-page `AccountBootstrapScreen` returns inside the `(app)` layout.
6. **Navigation progress bar** — viewport-fixed 2 px top bar for in-session route changes (§4.5).

---

## 9. File map

```text
lib/gsap/easings.ts
lib/gsap/reduced-motion.ts
lib/gsap/use-gsap-enter.ts
components/bootstrap-overlay.tsx      # full-page bootstrap screen (session + profile + routing)
components/navigation-progress.tsx    # viewport-fixed top-bar progress for in-session navigations
components/animated-stagger.tsx
components/animation/
  animated-table-body.tsx
  gsap-enter.tsx
  gsap-presence.tsx
  stable-block.tsx
  table-reveal-context.tsx
components/motion-preference-provider.tsx
components/motion-toggle.tsx       # header turtle/rabbit
components/ui/card.tsx          # auto-stagger
components/ui/skeleton.tsx      # shimmer class
components/standard-table-pagination.tsx  # placement
app/(app)/template.tsx
app/(app)/layout.tsx            # mounts BootstrapOverlay + NavigationProgress above sidebar
app/globals.css                 # skeleton-shimmer + data-attribute hides + reduced-motion
```
