"use client"

import * as React from "react"
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Layers,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { DUMMY_COHORTS } from "./v2-dummy-data"

// -----------------------------------------------------------------------------
// 1. TelemetryTag
// -----------------------------------------------------------------------------

export type TelemetryStatus =
  | "present"
  | "late"
  | "absent"
  | "excused"
  | "active"
  | "inactive"
  | "info"
  | "neutral"

const TELEMETRY_STYLE_MAP: Record<
  TelemetryStatus,
  { container: string; dot: string }
> = {
  present: {
    container: "bg-success/15 text-success border-success/35",
    dot: "bg-success",
  },
  active: {
    container: "bg-foreground/10 text-foreground border-foreground/30",
    dot: "bg-foreground",
  },
  late: {
    container: "bg-warning/15 text-warning border-warning/35",
    dot: "bg-warning",
  },
  absent: {
    container: "bg-destructive/15 text-destructive border-destructive/35",
    dot: "bg-destructive",
  },
  excused: {
    container: "bg-muted text-foreground border-border",
    dot: "bg-muted-foreground",
  },
  info: {
    container: "bg-foreground/10 text-foreground border-foreground/25",
    dot: "bg-foreground",
  },
  inactive: {
    container: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground/60",
  },
  neutral: {
    container: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground/60",
  },
}

export function TelemetryTag({
  status,
  children,
  className,
}: {
  status: TelemetryStatus
  children: React.ReactNode
  className?: string
}) {
  const styles = TELEMETRY_STYLE_MAP[status] ?? TELEMETRY_STYLE_MAP.neutral

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[2px] border px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider select-none whitespace-nowrap",
        styles.container,
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 shrink-0 rounded-[1px]", styles.dot)}
      />
      {children}
    </span>
  )
}

// -----------------------------------------------------------------------------
// 2. CodeChip
// -----------------------------------------------------------------------------

export function CodeChip({
  children,
  accent = false,
  className,
}: {
  children: React.ReactNode
  accent?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[2px] border border-border px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums tracking-tight whitespace-nowrap",
        accent
          ? "border-l-2 border-l-foreground bg-muted text-foreground"
          : "bg-muted/70 text-foreground",
        className
      )}
    >
      {children}
    </span>
  )
}

// -----------------------------------------------------------------------------
// 3. SystemHeader
// -----------------------------------------------------------------------------

export interface SystemHeaderMetric {
  label: string
  value: string | number
  tone?: "default" | "success" | "warning" | "destructive"
}

export interface SystemHeaderTab {
  id: string
  label: string
  count?: number
}

export interface SystemHeaderProps {
  domain?: string
  breadcrumb?: { label: string; onClick?: () => void }[] | string
  title: string
  description?: string
  metrics?: SystemHeaderMetric[]
  tabs?: SystemHeaderTab[]
  activeTab?: string
  onTabChange?: (id: string) => void
  actions?: React.ReactNode
  className?: string
}

const METRIC_TONE_CLASSES: Record<
  NonNullable<SystemHeaderMetric["tone"]>,
  string
> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
}

export function SystemHeader({
  domain,
  breadcrumb,
  title,
  description,
  metrics,
  tabs,
  activeTab,
  onTabChange,
  actions,
  className,
}: SystemHeaderProps) {
  const hasBreadcrumb =
    typeof breadcrumb === "string"
      ? breadcrumb.trim().length > 0
      : Array.isArray(breadcrumb) && breadcrumb.length > 0

  return (
    <div
      className={cn(
        "w-full min-w-0 rounded-sm border border-border bg-card overflow-hidden",
        className
      )}
    >
      <div className="px-4 py-3.5">
        {/* Top Overline Row */}
        {(domain || hasBreadcrumb) && (
          <div className="mb-1.5 flex flex-wrap items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-[1px] bg-primary"
            />
            {domain && <span>{domain}</span>}
            {domain && hasBreadcrumb && (
              <span className="text-border">//</span>
            )}
            {typeof breadcrumb === "string" && (
              <span className="text-foreground">{breadcrumb}</span>
            )}
            {Array.isArray(breadcrumb) &&
              breadcrumb.map((item, idx) => {
                const isLast = idx === breadcrumb.length - 1
                return (
                  <React.Fragment key={`${item.label}-${idx}`}>
                    {item.onClick ? (
                      <button
                        type="button"
                        onClick={item.onClick}
                        className={cn(
                          "transition-colors hover:text-foreground",
                          isLast && "text-foreground"
                        )}
                      >
                        {item.label}
                      </button>
                    ) : (
                      <span className={cn(isLast && "text-foreground")}>
                        {item.label}
                      </span>
                    )}
                    {!isLast && (
                      <span className="text-muted-foreground/50">/</span>
                    )}
                  </React.Fragment>
                )
              })}
          </div>
        )}

        {/* Main Tactical Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Inline Telemetry Metrics */}
            {metrics && metrics.length > 0 && (
              <div
                className={cn(
                  "grid divide-x divide-border rounded-[2px] border border-border/80 bg-muted/25 [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-border sm:[&>*:nth-child(n+3)]:border-t-0",
                  metrics.length <= 2
                    ? "grid-cols-2"
                    : metrics.length === 3
                      ? "grid-cols-2 sm:grid-cols-3"
                      : "grid-cols-2 sm:grid-cols-4"
                )}
              >
                {metrics.map((m, idx) => {
                  const toneClass =
                    METRIC_TONE_CLASSES[m.tone ?? "default"] ??
                    METRIC_TONE_CLASSES.default
                  return (
                    <div
                      key={`${m.label}-${idx}`}
                      className="flex min-w-0 flex-col px-3.5 py-1.5 text-right sm:text-left"
                    >
                      <span className="whitespace-nowrap font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {m.label}
                      </span>
                      <span
                        className={cn(
                          "whitespace-nowrap font-mono text-sm font-bold tabular-nums leading-tight",
                          toneClass
                        )}
                      >
                        {m.value}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Far-right Actions */}
            {actions && (
              <div className="flex flex-wrap items-center gap-2">{actions}</div>
            )}
          </div>
        </div>
      </div>

      {/* Optional Docked Bottom Tab Bar */}
      {tabs && tabs.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto border-t border-border bg-muted/20 px-4">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  "group relative flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold tracking-tight transition-colors whitespace-nowrap",
                  isActive
                    ? "border-primary text-foreground bg-background/50"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <span>{tab.label}</span>
                {typeof tab.count === "number" && (
                  <span
                    className={cn(
                      "rounded-[2px] px-1.5 py-0.2 font-mono text-[10px] font-semibold tabular-nums",
                      isActive
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "bg-muted text-muted-foreground border border-border"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// 4. DataModule
// -----------------------------------------------------------------------------

export interface DataModuleProps {
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (val: string) => void
  filters?: React.ReactNode
  toolbarRight?: React.ReactNode
  selectedCount?: number
  onClearSelection?: () => void
  bulkActions?: React.ReactNode
  totalCount?: number
  countLabel?: string
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  children: React.ReactNode
  className?: string
}

export function DataModule({
  searchPlaceholder = "Filter records...",
  searchValue,
  onSearchChange,
  filters,
  toolbarRight,
  selectedCount = 0,
  onClearSelection,
  bulkActions,
  totalCount,
  countLabel = "RECORDS",
  page = 1,
  totalPages = 1,
  onPageChange,
  children,
  className,
}: DataModuleProps) {
  const showSearch =
    onSearchChange !== undefined ||
    searchValue !== undefined ||
    Boolean(searchPlaceholder)

  return (
    <div
      className={cn(
        "w-full min-w-0 rounded-sm border border-border bg-card overflow-hidden",
        className
      )}
    >
      {/* Docked Command Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-3.5 py-2.5">
        {/* Left: Search + Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {showSearch && onSearchChange && (
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchValue ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-8 rounded-sm border-border bg-background pl-8 pr-7 text-xs"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          )}
          {filters && (
            <div className="flex flex-wrap items-center gap-2">{filters}</div>
          )}
        </div>

        {/* Right: Tactical Selection Bar or Toolbar Right */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedCount > 0 ? (
            <div className="flex items-center gap-2 rounded-[2px] border border-primary/40 bg-primary/10 px-2.5 py-1">
              <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-primary">
                <span className="size-1.5 rounded-[1px] bg-primary" />
                {selectedCount} SELECTED
              </span>
              {bulkActions && (
                <div className="flex items-center gap-1.5 border-l border-primary/30 pl-2">
                  {bulkActions}
                </div>
              )}
              {onClearSelection && (
                <button
                  type="button"
                  onClick={onClearSelection}
                  className="ml-1 inline-flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
                >
                  <X className="size-3" />
                  Clear
                </button>
              )}
            </div>
          ) : (
            toolbarRight
          )}
        </div>
      </div>

      {/* Body (flush 0px margin) */}
      <div className="w-full overflow-x-auto">{children}</div>

      {/* Docked Footer Bar */}
      {(totalCount !== undefined || totalPages > 1 || onPageChange) && (
        <div className="flex items-center justify-between border-t border-border bg-muted/20 px-3.5 py-2 font-mono text-xs tabular-nums text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-[1px] bg-primary/70" />
            <span>
              COUNT ALL //{" "}
              <strong className="font-semibold text-foreground">
                {totalCount ?? 0}
              </strong>{" "}
              {countLabel.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="xs"
              disabled={page <= 1}
              onClick={() => onPageChange?.(Math.max(1, page - 1))}
              className="h-7 rounded-sm px-2 font-mono text-[11px]"
            >
              <ChevronLeft className="size-3" />
              Prev
            </Button>
            <span className="px-2 font-mono text-[11px] text-muted-foreground">
              Page <strong className="text-foreground">{page}</strong> of{" "}
              <strong className="text-foreground">
                {Math.max(1, totalPages)}
              </strong>
            </span>
            <Button
              variant="outline"
              size="xs"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(Math.min(totalPages, page + 1))}
              className="h-7 rounded-sm px-2 font-mono text-[11px]"
            >
              Next
              <ChevronRight className="size-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// 5. CohortSwitcher
// -----------------------------------------------------------------------------

export interface CohortSwitcherOption {
  id: number | string
  code: string
  level: string
  levelLabel: string
  studentCount?: number
  subjectCount?: number
}

type LevelFilter = "ALL" | "IG" | "IAL" | "YR"

function matchesLevelFilter(level: string, filter: LevelFilter): boolean {
  if (filter === "ALL") return true
  const upper = level.toUpperCase()
  if (filter === "IG") return upper.includes("IG")
  if (filter === "IAL") return upper.includes("IAL") || upper === "A-LEVEL"
  if (filter === "YR") return upper.startsWith("YEAR") || upper.startsWith("YR") || /^Y\d/.test(upper)
  return true
}

export function CohortSwitcher({
  value,
  onValueChange,
  cohorts = DUMMY_COHORTS,
  includeAdhoc = false,
  actions,
  className,
}: {
  value: string
  onValueChange: (val: string) => void
  cohorts?: CohortSwitcherOption[]
  includeAdhoc?: boolean
  actions?: React.ReactNode
  className?: string
}) {
  const [levelFilter, setLevelFilter] = React.useState<LevelFilter>("ALL")

  const filteredCohorts = React.useMemo(() => {
    return cohorts.filter((c) => matchesLevelFilter(c.level, levelFilter))
  }, [cohorts, levelFilter])

  const levels: LevelFilter[] = ["ALL", "IG", "IAL", "YR"]

  const levelCounts = React.useMemo(() => {
    return {
      ALL: cohorts.length,
      IG: cohorts.filter((c) => matchesLevelFilter(c.level, "IG")).length,
      IAL: cohorts.filter((c) => matchesLevelFilter(c.level, "IAL")).length,
      YR: cohorts.filter((c) => matchesLevelFilter(c.level, "YR")).length,
    }
  }, [cohorts])

  const handleLevelChange = (lvl: LevelFilter) => {
    setLevelFilter(lvl)
    const nextList = cohorts.filter((c) => matchesLevelFilter(c.level, lvl))
    if (value !== "ADHOC") {
      if (nextList.length > 0) {
        if (!nextList.some((c) => c.code === value || String(c.id) === value)) {
          onValueChange(nextList[0].code)
        }
      } else {
        // No cohorts in this level — clear selection so trigger and workspace show empty level state
        onValueChange("")
      }
    }
  }

  const currentIndex = filteredCohorts.findIndex(
    (c) => c.code === value || String(c.id) === value
  )

  const handleCycleCohort = (direction: -1 | 1) => {
    if (filteredCohorts.length === 0) return
    if (currentIndex === -1) {
      onValueChange(filteredCohorts[0].code)
      return
    }
    const nextIndex =
      (currentIndex + direction + filteredCohorts.length) %
      filteredCohorts.length
    onValueChange(filteredCohorts[nextIndex].code)
  }

  const activeCohortObj = cohorts.find(
    (c) => c.code === value || String(c.id) === value
  )

  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center justify-between gap-2 rounded-sm border border-border bg-card px-2.5 py-1.5",
        className
      )}
    >
      {/* Left Cluster: LVL Filter + Fixed-Width Cohort Select + Prev/Next Steppers */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Compact Segmented Level Filter with Empty Level Dimming */}
        <div className="inline-flex items-center gap-0.5 rounded-[2px] border border-border bg-muted/50 p-0.5">
          <span className="flex items-center gap-1 px-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Layers className="size-3 text-foreground" />
            LVL
          </span>
          {levels.map((lvl) => {
            const active = levelFilter === lvl
            const count = levelCounts[lvl]
            const isEmpty = lvl !== "ALL" && count === 0

            return (
              <button
                key={lvl}
                type="button"
                onClick={() => handleLevelChange(lvl)}
                title={isEmpty ? `No cohorts registered under ${lvl}` : `${count} cohort${count === 1 ? "" : "s"} under ${lvl}`}
                className={cn(
                  "min-w-[36px] rounded-[2px] px-1.5 py-0.5 text-center font-mono text-[11px] font-semibold uppercase transition-colors",
                  active
                    ? "bg-foreground text-background shadow-2xs"
                    : isEmpty
                      ? "text-muted-foreground/40 hover:bg-background/40 hover:text-muted-foreground"
                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                )}
              >
                {lvl}
              </button>
            )
          })}
        </div>

        {/* Strictly Fixed-Width Cohort Select Trigger (Never shifts adjacent buttons) */}
        <Select
          value={value}
          onValueChange={(val) => {
            if (val) onValueChange(val)
          }}
        >
          <SelectTrigger
            size="sm"
            className={cn(
              "h-7 w-[260px] shrink-0 justify-between overflow-hidden rounded-[2px] px-2.5 font-mono text-xs data-[size=sm]:h-7",
              filteredCohorts.length === 0 && value !== "ADHOC"
                ? "border-dashed border-border/80 bg-muted/20 text-muted-foreground hover:bg-muted/30"
                : "border-border bg-muted/30 hover:bg-muted/50"
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden pr-1">
              <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                COHORT //
              </span>
              <span
                className={cn(
                  "truncate font-mono text-xs",
                  filteredCohorts.length === 0 && value !== "ADHOC"
                    ? "font-semibold italic text-muted-foreground/75"
                    : "font-bold text-foreground"
                )}
              >
                {value === "ADHOC"
                  ? "ADHOC SESSION"
                  : filteredCohorts.length === 0
                    ? `NO ${levelFilter} COHORTS`
                    : activeCohortObj
                      ? `${activeCohortObj.code} · ${activeCohortObj.levelLabel}${
                          activeCohortObj.studentCount != null
                            ? ` (${activeCohortObj.studentCount})`
                            : ""
                        }`
                      : value || "Select cohort..."}
              </span>
            </div>
          </SelectTrigger>
          <SelectContent className="min-w-[260px]">
            {filteredCohorts.length === 0 ? (
              <div className="px-3 py-3 text-center">
                <p className="font-mono text-xs font-semibold text-foreground">
                  No cohorts found for {levelFilter}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Select another level filter or register an {levelFilter} cohort in Academics.
                </p>
                <a
                  href="/classes"
                  className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-primary hover:underline"
                >
                  Open Academics Hub →
                </a>
              </div>
            ) : (
              filteredCohorts.map((c) => (
                <SelectItem
                  key={c.id}
                  value={c.code}
                  className="font-mono text-xs"
                >
                  {c.code} — {c.levelLabel}
                  {c.studentCount != null ? ` (${c.studentCount} students)` : ""}
                </SelectItem>
              ))
            )}
            {includeAdhoc && (
              <div className={cn(filteredCohorts.length === 0 && "mt-1 border-t border-border pt-1")}>
                <SelectItem value="ADHOC" className="font-mono text-xs">
                  ADHOC — Custom Ad-hoc Session
                </SelectItem>
              </div>
            )}
          </SelectContent>
        </Select>

        {/* Anchored 1-Click Prev / Next Cohort Steppers (Disabled when no cohorts or 1 cohort) */}
        <div className="inline-flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => handleCycleCohort(-1)}
            disabled={filteredCohorts.length <= 1}
            title={filteredCohorts.length === 0 ? "No cohorts to cycle" : "Previous cohort in filter"}
            aria-label="Previous cohort"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-[2px] border border-border bg-muted/30 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleCycleCohort(1)}
            disabled={filteredCohorts.length <= 1}
            title={filteredCohorts.length === 0 ? "No cohorts to cycle" : "Next cohort in filter"}
            aria-label="Next cohort"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-[2px] border border-border bg-muted/30 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Right Cluster: Active Cohort Quick Summary + Ad-hoc Session Toggle */}
      <div className="ml-auto flex items-center gap-2">
        {activeCohortObj ? (
          <span className="hidden items-center gap-2 font-mono text-[11px] text-muted-foreground md:inline-flex">
            {activeCohortObj.studentCount != null && (
              <span>
                ENROLLED:{" "}
                <strong className="font-semibold text-foreground">
                  {activeCohortObj.studentCount}
                </strong>
              </span>
            )}
            {activeCohortObj.studentCount != null &&
              activeCohortObj.subjectCount != null && (
                <span className="text-border">·</span>
              )}
            {activeCohortObj.subjectCount != null && (
              <span>
                SUBJECTS:{" "}
                <strong className="font-semibold text-foreground">
                  {activeCohortObj.subjectCount}
                </strong>
              </span>
            )}
          </span>
        ) : value === "ADHOC" ? (
          <span className="hidden font-mono text-[11px] text-muted-foreground md:inline-flex">
            CUSTOM AD-HOC SESSION
          </span>
        ) : (
          <span className="hidden items-center gap-1.5 font-mono text-[11px] text-muted-foreground md:inline-flex">
            <span className="size-1.5 rounded-[1px] bg-muted-foreground/40" />
            <span>0 COHORTS IN {levelFilter}</span>
          </span>
        )}

        {includeAdhoc && (
          <button
            type="button"
            onClick={() =>
              onValueChange(
                value === "ADHOC"
                  ? (filteredCohorts[0]?.code ?? "IG K1")
                  : "ADHOC"
              )
            }
            className={cn(
              "inline-flex h-7 shrink-0 items-center gap-1 rounded-[2px] border px-2.5 font-mono text-[11px] font-semibold uppercase transition-colors",
              value === "ADHOC"
                ? "border-foreground bg-foreground text-background"
                : "border-dashed border-border bg-transparent text-muted-foreground hover:border-foreground/50 hover:text-foreground"
            )}
          >
            <Sparkles className="size-3" />
            Ad-hoc
          </button>
        )}

        {actions}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// 6. RollStatusControl (Tactical Spreadsheet Cell Select Trigger)
// -----------------------------------------------------------------------------

export type RollAttendanceStatus = "present" | "late" | "absent" | "excused"

const ROLL_STATUS_META: Record<
  RollAttendanceStatus,
  {
    shortcut: string
    label: string
    dotClass: string
    triggerClass: string
  }
> = {
  present: {
    shortcut: "[P]",
    label: "PRESENT",
    dotClass: "bg-emerald-500",
    triggerClass:
      "border-success/40 bg-success/10 text-success hover:bg-success/15 hover:border-success/60",
  },
  late: {
    shortcut: "[L]",
    label: "LATE",
    dotClass: "bg-amber-500",
    triggerClass:
      "border-warning/40 bg-warning/10 text-warning hover:bg-warning/15 hover:border-warning/60",
  },
  absent: {
    shortcut: "[A]",
    label: "ABSENT",
    dotClass: "bg-rose-500",
    triggerClass:
      "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15 hover:border-destructive/60",
  },
  excused: {
    shortcut: "[E]",
    label: "EXCUSED",
    dotClass: "bg-zinc-400",
    triggerClass:
      "border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
  },
}

const ROLL_STATUS_ORDER: RollAttendanceStatus[] = [
  "present",
  "late",
  "absent",
  "excused",
]

export function RollStatusControl({
  value,
  onChange,
  className,
}: {
  value: RollAttendanceStatus
  onChange: (val: RollAttendanceStatus) => void
  className?: string
}) {
  const activeMeta = ROLL_STATUS_META[value] ?? ROLL_STATUS_META.present

  return (
    <Select
      value={value}
      onValueChange={(val) => {
        if (val) onChange(val as RollAttendanceStatus)
      }}
    >
      <SelectTrigger
        size="sm"
        className={cn(
          "h-7 min-w-[128px] rounded-sm border px-2.5 py-0 font-mono text-[11px] font-semibold tracking-wider uppercase shadow-none transition-colors data-[size=sm]:h-7 [&_svg]:ml-1 [&_svg]:size-3.5 [&_svg]:border-l [&_svg]:border-current/25 [&_svg]:pl-1 [&_svg]:text-current [&_svg]:opacity-75",
          activeMeta.triggerClass,
          className
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn(
              "size-1.5 shrink-0 rounded-[1px]",
              activeMeta.dotClass
            )}
          />
          <span>{activeMeta.label}</span>
        </span>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="min-w-[156px]">
        {ROLL_STATUS_ORDER.map((st) => {
          const meta = ROLL_STATUS_META[st]
          return (
            <SelectItem
              key={st}
              value={st}
              className="font-mono text-[11px] font-semibold uppercase tracking-wider"
            >
              <span className="inline-flex w-full items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-1.5 shrink-0 rounded-[1px]",
                      meta.dotClass
                    )}
                  />
                  <span>{meta.label}</span>
                </span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  {meta.shortcut}
                </span>
              </span>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

// -----------------------------------------------------------------------------
// 6. InspectorSheet
// -----------------------------------------------------------------------------

export interface InspectorSheetField {
  label: string
  value: React.ReactNode
  mono?: boolean
}

export interface InspectorSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  code?: string
  title: string
  subtitle?: string
  status?: {
    label: string
    tone?: TelemetryStatus
    variant?: TelemetryStatus | string
  }
  fields?: InspectorSheetField[]
  children?: React.ReactNode
  footerActions?: React.ReactNode
}

export function InspectorSheet({
  open,
  onOpenChange,
  code,
  title,
  subtitle,
  status,
  fields,
  children,
  footerActions,
}: InspectorSheetProps) {
  const resolvedTone =
    (status?.tone ??
      (status?.variant as TelemetryStatus | undefined) ??
      "neutral")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[440px] sm:max-w-[520px] p-0 flex flex-col gap-0 border-l border-border bg-card"
      >
        {/* Tactical Header */}
        <SheetHeader className="border-b border-border bg-muted/25 px-5 py-4">
          <div className="mb-1.5 flex flex-wrap items-center gap-2 pr-6">
            {code && <CodeChip accent>{code}</CodeChip>}
            {status && (
              <TelemetryTag status={resolvedTone}>{status.label}</TelemetryTag>
            )}
          </div>
          <SheetTitle className="text-base font-bold tracking-tight text-foreground">
            {title}
          </SheetTitle>
          {subtitle && (
            <SheetDescription className="font-mono text-xs text-muted-foreground">
              {subtitle}
            </SheetDescription>
          )}
        </SheetHeader>

        {/* Scrollable Inspector Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Structured 2-Column Key-Value Telemetry Grid */}
          {fields && fields.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="size-1.5 rounded-[1px] bg-primary" />
                TELEMETRY ATTRIBUTES
              </div>
              <div className="divide-y divide-border/60 border-t border-b border-border/60">
                {fields.map((field, idx) => (
                  <div
                    key={`${field.label}-${idx}`}
                    className="grid grid-cols-[130px_1fr] items-center gap-3 border-b border-border/60 py-2 text-xs last:border-b-0"
                  >
                    <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      {field.label}
                    </span>
                    <div
                      className={cn(
                        "text-right font-medium text-foreground break-words",
                        field.mono && "font-mono tabular-nums"
                      )}
                    >
                      {field.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Inspector Content */}
          {children && <div className="space-y-4">{children}</div>}
        </div>

        {/* Sticky Bottom Footer Bar */}
        {footerActions && (
          <SheetFooter className="mt-auto border-t border-border bg-muted/20 p-4">
            <div className="flex w-full flex-wrap items-center justify-end gap-2">
              {footerActions}
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
