"use client"

import * as React from "react"
import {
  ChevronDown,
  Globe,
  Loader2,
  Pencil,
  School,
  Tags,
  Trophy,
  UserPlus,
} from "lucide-react"

import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { EventDateTimePicker } from "@/components/events/event-datetime-picker"
import { EventDescriptionDialog } from "@/components/events/event-description-dialog"
import { EventLocationField } from "@/components/events/event-location-field"
import { EditorTitle } from "@/components/markdown/markdown-editor"
import { StandardPageHeader } from "@/components/standard-page-header"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { EVENT_AUDIENCE_LABELS } from "@/lib/communications-labels"
import { emptyEventDraft, type EventDraft } from "@/lib/event-draft"
import { cn } from "@/lib/utils"

const AUDIENCE_OPTIONS: {
  value: EventDraft["audience"]
  label: string
  description: string
  icon: React.ReactNode
}[] = [
  {
    value: "internal",
    label: EVENT_AUDIENCE_LABELS.internal,
    description: "Only signed-in school members can see and register.",
    icon: <School className="size-4" />,
  },
  {
    value: "external",
    label: EVENT_AUDIENCE_LABELS.external,
    description: "Listed publicly. Anyone signed in can register.",
    icon: <Globe className="size-4" />,
  },
]

function AudienceMenu({
  value,
  onChange,
}: {
  value: EventDraft["audience"]
  onChange: (next: EventDraft["audience"]) => void
}) {
  const [open, setOpen] = React.useState(false)
  const current = AUDIENCE_OPTIONS.find((o) => o.value === value) ?? AUDIENCE_OPTIONS[0]

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/80 bg-muted/40 px-2.5 text-sm font-medium shadow-xs transition-colors",
          "hover:bg-muted/60 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        )}
      >
        <span className="text-muted-foreground">{current.icon}</span>
        {current.label}
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 rounded-xl p-1.5" sideOffset={6}>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            if (next === "internal" || next === "external") {
              onChange(next)
              setOpen(false)
            }
          }}
        >
          {AUDIENCE_OPTIONS.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              className="items-start gap-3 rounded-lg py-2.5 pr-10 pl-2.5"
            >
              <span className="mt-0.5 text-muted-foreground">{option.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium leading-none">{option.label}</span>
                <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function OptionsRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1 text-sm font-medium">{label}</div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function CapacityControl({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState(value)

  React.useEffect(() => {
    if (open) setDraft(value)
  }, [open, value])

  const label = value.trim() ? value.trim() : "Unlimited"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        {label}
        <Pencil className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent className="w-56 gap-3 p-3" align="end">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Max attendees</p>
          <Input
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft}
            onChange={(event) => {
              const next = event.target.value.replace(/\D/g, "")
              setDraft(next)
            }}
            placeholder="Unlimited"
            className="h-9 rounded-lg"
          />
          <p className="text-[11px] text-muted-foreground">Leave empty for unlimited.</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onChange(draft)
              setOpen(false)
            }}
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function EventComposeScreen({
  editorKey,
  initial,
  saving,
  submitLabel,
  backHref,
  backLabel,
  onSubmit,
}: {
  editorKey: string
  initial?: EventDraft
  saving: boolean
  submitLabel: string
  backHref: string
  backLabel: string
  onSubmit: (draft: EventDraft) => Promise<void>
}) {
  const formRef = React.useRef<HTMLFormElement>(null)
  const [draft, setDraft] = React.useState<EventDraft>(() => initial ?? emptyEventDraft)
  const [titleInvalid, setTitleInvalid] = React.useState(false)

  React.useEffect(() => {
    if (initial) setDraft(initial)
  }, [initial])

  const patch = (updates: Partial<EventDraft>) => {
    if (updates.title !== undefined && updates.title.trim()) {
      setTitleInvalid(false)
    }
    setDraft((prev) => ({ ...prev, ...updates }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft.title.trim()) {
      setTitleInvalid(true)
      return
    }
    setTitleInvalid(false)
    await onSubmit(draft)
  }

  const requireApproval = draft.registration_mode === "approval_required"

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-6">
      <StaggerContainer className="flex min-h-0 flex-1 flex-col gap-6">
      <StaggerItem>
      <StandardPageHeader
        title={submitLabel === "Publish" ? "New event" : "Edit event"}
        description="Set the schedule, location, and registration options."
        back={{ href: backHref, label: backLabel }}
      >
        <Button
          type="button"
          size="sm"
          disabled={saving}
          onClick={() => formRef.current?.requestSubmit()}
          className="gap-1.5"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : submitLabel}
        </Button>
      </StandardPageHeader>
      </StaggerItem>

      <StaggerItem className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 pb-6">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <AudienceMenu
              value={draft.audience}
              onChange={(audience) => patch({ audience })}
            />
          </div>

          <EditorTitle
            value={draft.title}
            onChange={(title) => patch({ title })}
            placeholder="Event Name"
            invalid={titleInvalid}
            className="text-3xl sm:text-4xl lg:max-w-[calc(50%-1rem)]"
          />

          <div className="grid gap-5 lg:grid-cols-2 lg:gap-x-8 lg:gap-y-1.5">
            <div className="flex min-w-0 flex-col gap-3 lg:col-start-1 lg:row-start-2">
              <EventDateTimePicker
                startsAt={draft.starts_at}
                endsAt={draft.ends_at}
                onStartsAtChange={(starts_at) => patch({ starts_at })}
                onEndsAtChange={(ends_at) => patch({ ends_at })}
              />

              <EventLocationField
                kind={draft.location_kind}
                location={draft.location}
                onKindChange={(location_kind) => patch({ location_kind })}
                onLocationChange={(location) => patch({ location })}
              />

              <EventDescriptionDialog
                editorKey={editorKey}
                value={draft.description}
                onChange={(description) => patch({ description })}
              />
            </div>

            <p className="px-1 text-xs font-medium text-muted-foreground lg:col-start-2 lg:row-start-1">
              Event Options
            </p>

            <div className="flex min-w-0 flex-col gap-3 lg:col-start-2 lg:row-start-2">
              <div className="divide-y divide-border/80 overflow-hidden rounded-2xl border border-border/80 bg-muted/30">
                <OptionsRow icon={<UserPlus className="size-4" />} label="Require Approval">
                  <Switch
                    checked={requireApproval}
                    onCheckedChange={(checked) =>
                      patch({
                        registration_mode: checked ? "approval_required" : "instant_waitlist",
                      })
                    }
                  />
                </OptionsRow>

                <OptionsRow icon={<Trophy className="size-4" />} label="Capacity">
                  <CapacityControl
                    value={draft.capacity}
                    onChange={(capacity) => patch({ capacity })}
                  />
                </OptionsRow>

                <OptionsRow icon={<Tags className="size-4" />} label="Tags">
                  <Popover>
                    <PopoverTrigger className="inline-flex max-w-[10rem] items-center gap-1.5 truncate text-sm text-muted-foreground transition-colors hover:text-foreground">
                      <span className="truncate">{draft.tag_names.trim() || "None"}</span>
                      <Pencil className="size-3.5 shrink-0" />
                    </PopoverTrigger>
                    <PopoverContent className="w-64 gap-3 p-3" align="end">
                      <Input
                        value={draft.tag_names}
                        onChange={(event) => patch({ tag_names: event.target.value })}
                        placeholder="Sports, Club"
                        className="h-9 rounded-lg"
                      />
                      <p className="text-[11px] text-muted-foreground">Comma-separated tags.</p>
                    </PopoverContent>
                  </Popover>
                </OptionsRow>
              </div>

              <Button
                type="button"
                size="lg"
                className="h-11 w-full rounded-xl text-base font-semibold"
                disabled={saving}
                onClick={() => formRef.current?.requestSubmit()}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : submitLabel}
              </Button>
            </div>
          </div>
        </div>
      </StaggerItem>
      </StaggerContainer>
    </form>
  )
}
