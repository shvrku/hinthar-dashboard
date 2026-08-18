"use client"

import * as React from "react"
import {
  AlertCircle,
  Check,
  Info,
  Moon,
  Palette,
  Rabbit,
  RotateCcw,
  Sun,
  Turtle,
  X,
} from "lucide-react"
import { StandardPageHeader } from "@/components/standard-page-header"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { GsapEnter } from "@/components/animation/gsap-enter"
import { ThemePaletteCard } from "@/components/theme-palette-card"
import { useTheme, type ThemeMode, type ThemePalette } from "@/components/theme-provider"
import { useMotionPreference } from "@/components/motion-preference-provider"
import { durations, staggers } from "@/lib/gsap/easings"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

const SECTIONS = [
  { id: "theme", label: "Theme" },
  { id: "colors", label: "Colors" },
  { id: "typography", label: "Typography" },
  { id: "buttons", label: "Buttons" },
  { id: "badges", label: "Badges" },
  { id: "forms", label: "Forms" },
  { id: "feedback", label: "Feedback" },
  { id: "motion", label: "Motion" },
  { id: "standards", label: "Standards" },
] as const

const PALETTES: {
  id: ThemePalette
  label: string
  description: string
}[] = [
  {
    id: "emerald",
    label: "Hinthar",
    description: "Emerald accent on zinc neutrals — default product look.",
  },
  {
    id: "mono",
    label: "Monochrome",
    description: "Quiet greys; keep attendance status colors semantic.",
  },
  {
    id: "amoled",
    label: "AMOLED",
    description: "Monochrome chrome on a true-black page in dark mode.",
  },
]

const COLOR_TOKENS = [
  { name: "background", className: "bg-background border" },
  { name: "foreground", className: "bg-foreground" },
  { name: "card", className: "bg-card border" },
  { name: "primary", className: "bg-primary" },
  { name: "secondary", className: "bg-secondary" },
  { name: "muted", className: "bg-muted" },
  { name: "accent", className: "bg-accent" },
  { name: "destructive", className: "bg-destructive" },
  { name: "border", className: "bg-border" },
  { name: "input", className: "bg-input" },
  { name: "ring", className: "bg-ring" },
  { name: "success", className: "bg-success" },
  { name: "warning", className: "bg-warning" },
] as const

const ATTENDANCE_TOKENS = [
  { name: "present", className: "bg-attendance-present" },
  { name: "late", className: "bg-attendance-late" },
  { name: "absent", className: "bg-attendance-absent" },
  { name: "excused", className: "bg-attendance-excused" },
  { name: "campus", className: "bg-attendance-campus" },
] as const

const CHART_TOKENS = [
  { name: "chart-1", className: "bg-chart-1" },
  { name: "chart-2", className: "bg-chart-2" },
  { name: "chart-3", className: "bg-chart-3" },
  { name: "chart-4", className: "bg-chart-4" },
  { name: "chart-5", className: "bg-chart-5" },
] as const

const DO_ITEMS = [
  "Use shadcn primitives from `components/ui/` (base-vega / zinc).",
  "Wrap pages in `StaggerContainer` + `StaggerItem` (include the header).",
  "Gate admin routes with `RequireRole mode=\"admin\"`.",
  "Paginate on the server (`page` / `page_size` + `q`) — never fetch-all then slice.",
  "Keep Session Attendance vs Campus Check-In verbally separate.",
  "Parse backend datetimes only via `lib/utils.ts` helpers.",
  "Reuse `StandardPageHeader`, `ConfirmDialog`, and `StandardTablePagination`.",
  "Hubs: identity row → weekly TimetableSlot grid (`HubTimetableCard`) → compact related info → analytics.",
]

const DONT_ITEMS = [
  "Do not invent new GSAP timings — use `lib/gsap/easings.ts`.",
  "Do not use Framer Motion; stack is GSAP + tw-animate-css.",
  "Do not add payroll / rate / bank fields — out of scope.",
  "Do not put decorative cards in heroes or clutter KPI strips without need.",
  "Do not use bare `new Date(backendString)` for list keys or filters.",
  "Do not style Clerk with global card flatten that breaks Sign-In.",
  "Do not add secret admin tools to the sidebar — search-only is fine.",
]

function SectionNav({ activeId }: { activeId: string }) {
  return (
    <nav
      aria-label="Design system sections"
      className="sticky top-0 z-20 -mx-4 mb-2 border-b border-border/60 bg-background/90 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 md:-mx-8 md:px-8"
    >
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              activeId === section.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  )
}

function SectionHeading({
  id,
  title,
  description,
}: {
  id: string
  title: string
  description: string
}) {
  return (
    <div id={id} className="scroll-mt-16 space-y-1">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function Swatch({
  name,
  className,
}: {
  name: string
  className: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={cn("h-12 w-full rounded-lg shadow-xs", className)} />
      <span className="font-mono text-[10px] text-muted-foreground">{name}</span>
    </div>
  )
}

export function DesignSystemContent() {
  const { theme, palette, setTheme, setPalette } = useTheme()
  const { reducedMotion, toggleReducedMotion } = useMotionPreference()
  const [enterKey, setEnterKey] = React.useState(0)
  const [activeId, setActiveId] = React.useState<string>("theme")

  React.useEffect(() => {
    const nodes = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      Boolean
    ) as HTMLElement[]
    if (nodes.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]?.target.id) setActiveId(visible[0].target.id)
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5] }
    )
    nodes.forEach((n) => observer.observe(n))
    return () => observer.disconnect()
  }, [])

  return (
    <StaggerContainer className="container mx-auto max-w-5xl px-4 pb-6 sm:px-6 md:px-8 md:pb-8">
      <StaggerItem>
        <StandardPageHeader
          title="Design System"
          description="Living standards for Hinthar UI — tokens, components, motion, and feature rules. Admin-only; open via search (Ctrl/Cmd+K)."
        />
      </StaggerItem>

      <SectionNav activeId={activeId} />

      <div className="flex flex-col gap-10">
        {/* Theme */}
        <StaggerItem>
          <section className="flex flex-col gap-4">
            <SectionHeading
              id="theme"
              title="Theme switcher"
              description="Palette and mode update CSS variables on the document. Prefer these controls (or Settings) over hard-coded brand colors."
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {PALETTES.map((item) => (
                <ThemePaletteCard
                  key={item.id}
                  palette={item.id}
                  label={item.label}
                  description={item.description}
                  mode={theme}
                  selected={palette === item.id}
                  onSelect={() => setPalette(item.id)}
                />
              ))}
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Mode & motion</CardTitle>
                <CardDescription>
                  Same controls as the site header and Settings. Motion preference
                  gates GSAP via `data-reduced-motion`.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(
                  [
                    { id: "light" as ThemeMode, label: "Light", icon: Sun },
                    { id: "dark" as ThemeMode, label: "Dark", icon: Moon },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <Button
                    key={id}
                    type="button"
                    variant={theme === id ? "default" : "outline"}
                    size="sm"
                    className="gap-1.5"
                    aria-pressed={theme === id}
                    onClick={() => setTheme(id)}
                  >
                    <Icon className="size-3.5" />
                    {label}
                  </Button>
                ))}
                <Separator orientation="vertical" className="mx-1 hidden h-8 sm:block" />
                <Button
                  type="button"
                  variant={reducedMotion ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                  aria-pressed={reducedMotion}
                  onClick={toggleReducedMotion}
                >
                  {reducedMotion ? (
                    <Rabbit className="size-3.5" />
                  ) : (
                    <Turtle className="size-3.5" />
                  )}
                  {reducedMotion ? "Animations reduced" : "Full motion"}
                </Button>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">
              Active: <span className="font-medium text-foreground">{palette}</span>{" "}
              · <span className="font-medium text-foreground">{theme}</span>
              {reducedMotion ? " · reduced motion" : ""}
            </p>
          </section>
        </StaggerItem>

        {/* Colors */}
        <StaggerItem>
          <section className="flex flex-col gap-4">
            <SectionHeading
              id="colors"
              title="Color tokens"
              description="Use semantic Tailwind classes (`bg-primary`, `text-muted-foreground`). Never invent one-off hex in feature UI."
            />
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {COLOR_TOKENS.map((token) => (
                <Swatch key={token.name} {...token} />
              ))}
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">
                Attendance / check-in semantics
              </h3>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {ATTENDANCE_TOKENS.map((token) => (
                  <Swatch key={token.name} {...token} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">
                Chart series
              </h3>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {CHART_TOKENS.map((token) => (
                  <Swatch key={token.name} {...token} />
                ))}
              </div>
            </div>
          </section>
        </StaggerItem>

        {/* Typography */}
        <StaggerItem>
          <section className="flex flex-col gap-4">
            <SectionHeading
              id="typography"
              title="Typography"
              description="Page titles via StandardPageHeader. Section titles are text-lg semibold. Body stays text-sm for dense staff UIs."
            />
            <Card>
              <CardContent className="flex flex-col gap-4 pt-6">
                <div>
                  <p className="text-2xl font-semibold tracking-tight">
                    Page title — text-2xl / semibold
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supporting description — text-sm muted
                  </p>
                </div>
                <Separator />
                <p className="text-lg font-semibold tracking-tight">
                  Section heading — text-lg
                </p>
                <p className="text-sm text-foreground">
                  Body copy — text-sm foreground for readable denser layouts.
                </p>
                <p className="text-xs text-muted-foreground">
                  Meta / captions — text-xs muted-foreground
                </p>
                <p className="font-mono text-xs text-foreground">
                  Identifiers — font-mono text-xs (codes, clerk ids)
                </p>
              </CardContent>
            </Card>
          </section>
        </StaggerItem>

        {/* Buttons */}
        <StaggerItem>
          <section className="flex flex-col gap-4">
            <SectionHeading
              id="buttons"
              title="Buttons"
              description="Header contract: back = ghost, tertiary = outline, reload = outline via buildReloadAction, primary CTA = default."
            />
            <Card>
              <CardHeader>
                <CardTitle>Variants</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="default">Default</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="link">Link</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Sizes</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2">
                <Button size="xs">Extra small</Button>
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon" aria-label="Palette">
                  <Palette className="size-4" />
                </Button>
              </CardContent>
            </Card>
          </section>
        </StaggerItem>

        {/* Badges */}
        <StaggerItem>
          <section className="flex flex-col gap-4">
            <SectionHeading
              id="badges"
              title="Badges"
              description="Status labels use Title Case: Present, Late, Absent, Excused. Prefer semantic variants over custom colors."
            />
            <Card>
              <CardContent className="flex flex-wrap gap-2 pt-6">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="ghost">Ghost</Badge>
              </CardContent>
            </Card>
          </section>
        </StaggerItem>

        {/* Forms */}
        <StaggerItem>
          <section className="flex flex-col gap-4">
            <SectionHeading
              id="forms"
              title="Forms & tables"
              description="Mark required fields consistently. Tables use AnimatedTableBody + shared skeletons; reserve ~8 shimmer rows."
            />
            <Card>
              <CardHeader>
                <CardTitle>Input</CardTitle>
                <CardDescription>Search fields use pl-9 with a leading icon.</CardDescription>
              </CardHeader>
              <CardContent className="max-w-sm space-y-3">
                <Input placeholder="Enter a value…" />
                <Input placeholder="Disabled" disabled />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Sample table chrome</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Aung Min</TableCell>
                      <TableCell className="font-mono text-xs">STU-1042</TableCell>
                      <TableCell>
                        <Badge variant="success">Present</Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Thiri Aye</TableCell>
                      <TableCell className="font-mono text-xs">STU-1088</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Late</Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>
        </StaggerItem>

        {/* Feedback */}
        <StaggerItem>
          <section className="flex flex-col gap-4">
            <SectionHeading
              id="feedback"
              title="Feedback"
              description="One shared ConfirmDialog for destructive actions. Alerts for inline page-level messages."
            />
            <Alert>
              <Info />
              <AlertTitle>Informational</AlertTitle>
              <AlertDescription>
                Prefer concise copy. Point staff to the next action when something is empty.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Surface `ApiError.userMessage` when requests fail; always offer Retry.
              </AlertDescription>
            </Alert>
          </section>
        </StaggerItem>

        {/* Motion */}
        <StaggerItem>
          <section className="flex flex-col gap-4">
            <SectionHeading
              id="motion"
              title="Motion"
              description="GSAP only. Tokens live in lib/gsap/easings.ts — do not invent new durations on pages."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Timing tokens</CardTitle>
                  <CardDescription>Source of truth for enters and staggers.</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 font-mono text-xs">
                    {Object.entries(durations).map(([key, value]) => (
                      <React.Fragment key={key}>
                        <dt className="text-muted-foreground">durations.{key}</dt>
                        <dd className="text-foreground">{value}s</dd>
                      </React.Fragment>
                    ))}
                    {Object.entries(staggers).map(([key, value]) => (
                      <React.Fragment key={key}>
                        <dt className="text-muted-foreground">staggers.{key}</dt>
                        <dd className="text-foreground">{value}s</dd>
                      </React.Fragment>
                    ))}
                  </dl>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Replay enter</CardTitle>
                  <CardDescription>
                    `GsapEnter` remounts via `key` — used for presence swaps and panels.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setEnterKey((k) => k + 1)}
                  >
                    <RotateCcw className="size-3.5" />
                    Replay animation
                  </Button>
                  <GsapEnter key={enterKey} className="rounded-xl border border-border bg-muted/40 p-4">
                    <p className="text-sm font-medium text-foreground">
                      Fade + slight rise
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Toggle reduced motion above to see the gated path.
                    </p>
                  </GsapEnter>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Auto-stagger cards</CardTitle>
                <CardDescription>
                  Cards inside StaggerContainer cascade via `data-stagger-card`. Nested cards
                  inside a StaggerItem do not double-animate.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                {["Header", "KPIs", "Table"].map((label) => (
                  <div
                    key={label}
                    className="rounded-lg border border-dashed border-border/80 bg-muted/30 px-3 py-6 text-center text-xs font-medium text-muted-foreground"
                  >
                    {label}
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </StaggerItem>

        {/* Standards */}
        <StaggerItem>
          <section className="flex flex-col gap-4">
            <SectionHeading
              id="standards"
              title="Feature addition standards"
              description="Follow docs/FRONTEND_STANDARDS.md and docs/ANIMATION_STANDARDS.md. This page is the visual companion."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Check className="size-4 text-success" />
                    Do
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5 text-sm text-foreground">
                    {DO_ITEMS.map((item) => (
                      <li key={item} className="flex gap-2">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <X className="size-4 text-destructive" />
                    Don&apos;t
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5 text-sm text-foreground">
                    {DONT_ITEMS.map((item) => (
                      <li key={item} className="flex gap-2">
                        <X className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Product domains</CardTitle>
                <CardDescription>
                  Keep these separate in nav titles and copy when adding features.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      title: "People & classes",
                      routes: "/students, /teachers, /subjects, /classes",
                    },
                    {
                      title: "Schedule",
                      routes: "/timetable, /sessions, /sessions/find",
                    },
                    {
                      title: "Lesson attendance",
                      routes: "/attendance/…",
                    },
                    {
                      title: "Campus check-in",
                      routes: "/check-in/overview, management, terminal",
                    },
                  ].map((domain) => (
                    <div
                      key={domain.title}
                      className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {domain.title}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {domain.routes}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>New paginated route checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal space-y-2 pl-4 text-sm text-foreground">
                  <li>Types in `lib/types.ts` + `Paginated&lt;T&gt;`.</li>
                  <li>
                    API helper with `page` / `page_size` exposing `count` (not results-only).
                  </li>
                  <li>
                    Page with `RequireRole`, URL filters, `StandardTablePagination`, skeletons.
                  </li>
                  <li>
                    Sidebar only if it is a staff workflow — internal tools can be search-only.
                  </li>
                  <li>Empty / error states with a clear Retry CTA.</li>
                </ol>
              </CardContent>
            </Card>
          </section>
        </StaggerItem>
      </div>
    </StaggerContainer>
  )
}
