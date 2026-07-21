"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { createApi, ApiError } from "@/lib/api";
import type { Class, Teacher, Subject, TimetableSlot } from "@/lib/types";
import {
  Search,
  Users,
  BookOpen,
  Clock,
  Calendar,
  Edit3,
  User,
  CalendarDays,
  List,
  ChevronRight,
  X,
  Plus,
  Check,
  ChevronDown,
  Loader2,
  Trash2,
  PanelLeft,
  RotateCcw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timeToMins = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const getClassName = (cls: Class) => {
  return `${cls.education_level} - ${cls.cohort_identifier} ${cls.cohort_sub_category ? `(${cls.cohort_sub_category})` : ""}`.trim();
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOURS = Array.from({ length: 10 }, (_, i) => i + 7); // 07:00–16:00

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Searchable single-select for teachers */
function TeacherSelect({
  teachers,
  value,
  onChange,
}: {
  teachers: Teacher[];
  value: number;
  onChange: (id: number, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = teachers.find((t) => t.id === value);
  const filtered = teachers.filter((t) =>
    t.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? selected.name : "Select teacher…"}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md overflow-hidden text-popover-foreground">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search teacher…"
                className="w-full rounded-md bg-background border border-input py-1.5 pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto hinthar-scrollbar">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground text-center">
                No teachers found
              </p>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onChange(t.id, t.name);
                    setOpen(false);
                    setQ("");
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                    t.id === value
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {t.name}
                  {t.id === value && (
                    <Check className="h-3.5 w-3.5 text-green-400 ml-auto" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Searchable single-select for subjects */
function SubjectSelect({
  subjects,
  value,
  onChange,
}: {
  subjects: Subject[];
  value: number;
  onChange: (id: number, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = subjects.find((s) => s.id === value);
  const filtered = subjects.filter((s) =>
    s.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? selected.name : "Select subject…"}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md overflow-hidden text-popover-foreground">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search subject…"
                className="w-full rounded-md bg-background border border-input py-1.5 pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto hinthar-scrollbar">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground text-center">
                No subjects found
              </p>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onChange(s.id, s.name);
                    setOpen(false);
                    setQ("");
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                    s.id === value
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {s.name}
                  {s.id === value && (
                    <Check className="h-3.5 w-3.5 text-green-400 ml-auto" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SlotModal ─────────────────────────────────────────────────────────────

type ModalMode = "add" | "edit";
type ModalState = {
  mode: ModalMode;
  lesson?: TimetableSlot;
  prefillDayOfWeek?: number;
};

type FormState = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  teacherId: number;
  subjectId: number;
};

function lessonToForm(l: TimetableSlot): FormState {
  const formatTimeToSeconds = (time: string): string => {
    if (!time) return "00:00:00"
    return time.length === 5 ? `${time}:00` : time
  }

  return {
    dayOfWeek: l.day_of_week,
    startTime: formatTimeToSeconds(l.start_time),
    endTime: formatTimeToSeconds(l.end_time),
    teacherId: l.teacher.id,
    subjectId: l.subject.id,
  };
}

function SlotModal({
  modal,
  teachers,
  subjects,
  onSave,
  onDelete,
  onClose,
}: {
  modal: ModalState;
  teachers: Teacher[];
  subjects: Subject[];
  onSave: (form: FormState, id?: number) => Promise<void>;
  onDelete?: (id: number) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(() =>
    modal.mode === "edit" && modal.lesson
      ? lessonToForm(modal.lesson)
      : {
          dayOfWeek: modal.prefillDayOfWeek ?? 0,
          startTime: "09:00:00",
          endTime: "10:30:00",
          teacherId: teachers[0]?.id || 0,
          subjectId: subjects[0]?.id || 0,
        }
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const validate = () => {
    const e: string[] = [];
    if (!form.startTime) e.push("Start time is required.");
    if (!form.endTime) e.push("End time is required.");
    if (
      form.startTime &&
      form.endTime &&
      timeToMins(form.startTime) >= timeToMins(form.endTime)
    )
      e.push("End time must be after start time.");
    if (!form.teacherId) e.push("Teacher is required.");
    if (!form.subjectId) e.push("Subject is required.");
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (e.length) {
      setErrors(e);
      return;
    }
    setErrors([]);
    setSaving(true);
    try {
      await onSave(form, modal.lesson?.id);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors([err.userMessage]);
      } else {
        const error = err as Error;
        setErrors([error.message || "An unexpected error occurred."]);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(val) => !val && onClose()}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>
            {modal.mode === "add" ? "Add Timetable Slot" : "Edit Timetable Slot"}
          </DialogTitle>
          <DialogDescription>
            {modal.mode === "add"
              ? "Create a new class session entry in the schedule."
              : "Update this class session's timing, teacher, or subject."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Errors */}
          {errors.length > 0 && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive space-y-1">
              {errors.map((e, i) => (
                <p key={i}>{e}</p>
              ))}
            </div>
          )}

          {/* Day */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Day</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d, index) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, dayOfWeek: index }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    form.dayOfWeek === index
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input text-muted-foreground hover:border-accent hover:text-foreground"
                  }`}
                >
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Start Time</label>
              <Input
                type="time"
                step="1"
                value={form.startTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startTime: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">End Time</label>
              <Input
                type="time"
                step="1"
                value={form.endTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endTime: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Teacher */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Teacher</label>
            <TeacherSelect
              teachers={teachers}
              value={form.teacherId}
              onChange={(id) => setForm((f) => ({ ...f, teacherId: id }))}
            />
          </div>

          {/* Subject */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Subject</label>
            <SubjectSelect
              subjects={subjects}
              value={form.subjectId}
              onChange={(id) => setForm((f) => ({ ...f, subjectId: id }))}
            />
          </div>
        </div>

        <DialogFooter className="flex flex-row justify-between items-center pt-2">
          {modal.mode === "edit" && modal.lesson && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                onDelete(modal.lesson!.id);
                onClose();
              }}
              disabled={saving}
            >
              <Trash2 className="mr-2 size-4" /> Delete
            </Button>
          )}
          <div className="flex gap-3 ml-auto">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function TimetableDashboard() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastLoaded, setLastLoaded] = useState<string | null>(null);

  const [lessons, setLessons] = useState<TimetableSlot[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<TimetableSlot | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "week">("list");
  const [modal, setModal] = useState<ModalState | null>(null);
  const [activeDay, setActiveDay] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const loadData = useCallback(async () => {
    if (!isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No auth token available");
      const api = createApi(token);

      const [classesData, teachersData, subjectsData, slotsData] = await Promise.all([
        api.listClasses(),
        api.listTeachers(),
        api.listSubjects(),
        api.listTimetableSlots(),
      ]);

      setClasses(classesData);
      setTeachers(teachersData);
      setSubjects(subjectsData);
      setLessons(slotsData);

      setLastLoaded(new Date().toLocaleTimeString());

      // If no class is selected yet, select the first class from the loaded list
      if (classesData.length > 0 && selectedClassId === null) {
        setSelectedClassId(classesData[0].id);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load timetable data");
      }
    } finally {
      setLoading(false);
    }
  }, [getToken, isSignedIn, selectedClassId]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const filteredClasses = useMemo(
    () =>
      classes.filter((c) =>
        getClassName(c).toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [searchQuery, classes],
  );

  const filteredLessons = useMemo(
    () => lessons.filter((l) => l.class_obj?.id === selectedClassId),
    [selectedClassId, lessons],
  );

  const listDayLessons = useMemo(
    () =>
      filteredLessons
        .filter((l) => l.day_of_week === activeDay)
        .sort((a, b) => timeToMins(a.start_time) - timeToMins(b.start_time)),
    [filteredLessons, activeDay],
  );

  // ── TimetableSlot CRUD ──────────────────────────────────────────────────────────

  const handleSave = useCallback(
    async (form: FormState, id?: number) => {
      if (!isSignedIn) return;
      if (selectedClassId === null) return;
      setError(null);

      const token = await getToken();
      if (!token) throw new Error("No auth token available");
      const api = createApi(token);

      const payload = {
        class_obj_id: selectedClassId,
        subject_id: form.subjectId,
        teacher_id: form.teacherId,
        day_of_week: form.dayOfWeek,
        start_time: form.startTime.length === 5 ? `${form.startTime}:00` : form.startTime,
        end_time: form.endTime.length === 5 ? `${form.endTime}:00` : form.endTime,
      };

      if (id) {
        // Edit
        await api.updateTimetableSlot(id, payload);
        setSuccess("Timetable slot updated successfully.");
      } else {
        // Add
        await api.createTimetableSlot(payload);
        setSuccess("Timetable slot added successfully.");
      }

      setModal(null);
      await loadData();
    },
    [getToken, isSignedIn, selectedClassId, loadData]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      if (!isSignedIn) return;
      setError(null);
      setDeleteSubmitting(true);

      try {
        const token = await getToken();
        if (!token) throw new Error("No auth token available");
        const api = createApi(token);

        await api.deleteTimetableSlot(id);
        setSuccess("Timetable slot deleted successfully.");
        if (selectedLesson?.id === id) setSelectedLesson(null);
        setDeleteConfirmId(null);
        await loadData();
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.userMessage);
        } else {
          setError(err instanceof Error ? err.message : "Failed to delete timetable slot");
        }
      } finally {
        setDeleteSubmitting(false);
      }
    },
    [getToken, isSignedIn, selectedLesson, loadData]
  );

  // ── Week View ─────────────────────────────────────────────────────────────

  const renderWeekEvents = (dayIndex: number) => {
    const dayLessons = lessons
      .filter((l) => l.day_of_week === dayIndex && l.class_obj?.id === selectedClassId)
      .sort((a, b) => {
        const diff = timeToMins(a.start_time) - timeToMins(b.start_time);
        if (diff !== 0) return diff;
        return (
          timeToMins(a.end_time) -
          timeToMins(a.start_time) -
          (timeToMins(b.end_time) - timeToMins(b.start_time))
        );
      });

    // Group into clusters of overlapping events
    const clusters: TimetableSlot[][] = [];
    let currentCluster: TimetableSlot[] = [];
    let clusterEnd = 0;

    for (const lesson of dayLessons) {
      const start = timeToMins(lesson.start_time);
      const end = timeToMins(lesson.end_time);

      if (currentCluster.length === 0) {
        currentCluster.push(lesson);
        clusterEnd = end;
      } else if (start < clusterEnd) {
        currentCluster.push(lesson);
        clusterEnd = Math.max(clusterEnd, end);
      } else {
        clusters.push(currentCluster);
        currentCluster = [lesson];
        clusterEnd = end;
      }
    }
    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }

    const renderedEvents: React.ReactNode[] = [];
    const dayStart = 7 * 60;
    const pxPerMin = 64 / 60;

    for (const cluster of clusters) {
      // Pack events into columns
      const columns: TimetableSlot[][] = [];
      for (const lesson of cluster) {
        let placed = false;
        const start = timeToMins(lesson.start_time);

        for (let c = 0; c < columns.length; c++) {
          const lastInCol = columns[c][columns[c].length - 1];
          if (start >= timeToMins(lastInCol.end_time)) {
            columns[c].push(lesson);
            placed = true;
            break;
          }
        }
        if (!placed) {
          columns.push([lesson]);
        }
      }

      const totalCols = columns.length;
      for (let c = 0; c < totalCols; c++) {
        for (const lesson of columns[c]) {
          const s = timeToMins(lesson.start_time);
          const e = timeToMins(lesson.end_time);
          const top = (s - dayStart) * pxPerMin;
          const height = Math.max((e - s) * pxPerMin, 28);

          const wPct = 100 / totalCols;
          const lPct = c * wPct;

          const isSelected = selectedLesson?.id === lesson.id;

          renderedEvents.push(
            <div
              key={lesson.id}
              onClick={() => {
                setSelectedLesson(lesson);
                setModal({ mode: "edit", lesson });
              }}
              style={{
                top: `${top}px`,
                height: `${height}px`,
                width: `calc(${wPct}% - 4px)`,
                left: `calc(${lPct}% + 2px)`,
              }}
              className={`absolute p-2 rounded-lg cursor-pointer transition-all duration-200 overflow-hidden flex flex-col group hover:z-30 hover:!w-[calc(100%-8px)] hover:!left-[4px] hover:shadow-xl
                ${isSelected ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card hover:border-accent hover:bg-muted"}
                border`}
            >
              <div className="text-xs font-semibold text-foreground truncate">
                {lesson.subject.name}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                {lesson.teacher.name}
              </div>
              <div className="text-[9px] text-muted-foreground/80 mt-0.5">
                {lesson.start_time.substring(0, 5)}–{lesson.end_time.substring(0, 5)}
              </div>
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Edit3 className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
          );
        }
      }
    }

    return renderedEvents;
  };

  if (!mounted || !isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground font-medium">Loading auth state...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-background">
        <p className="text-muted-foreground font-medium">Please sign in to view the timetable.</p>
      </div>
    );
  }

  if (!lastLoaded) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center bg-background p-6 text-center">
        <div className="h-16 w-16 rounded-2xl bg-card border border-border flex items-center justify-center mb-4 shadow-xs">
          <Calendar className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Timetable Dashboard</h2>
        <p className="text-muted-foreground text-sm max-w-sm mb-6">
          Connect to the school management system API to load classes, teachers, and timetable schedules.
        </p>
        {error && (
          <div className="mb-4 max-w-md mx-auto text-sm text-destructive rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2">
            {error}
          </div>
        )}
        <Button onClick={loadData} disabled={loading} size="lg">
          {loading ? (
            <>
              <Loader2 className="mr-2 size-5 animate-spin" />
              Loading Timetable...
            </>
          ) : (
            <>
              <RotateCcw className="mr-2 size-5" />
              Load Timetable Data
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── MOBILE SIDEBAR OVERLAY ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Header breadcrumb for mobile only */}
      <header className="sticky top-0 z-30 flex h-14 md:hidden items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md gap-2">
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          className="lg:hidden flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1.5 border border-border bg-card shadow-xs"
          aria-label="Select Class"
        >
          <PanelLeft className="h-4 w-4" />
          <span className="text-xs font-semibold">Classes</span>
        </button>
        <span className="text-sm font-semibold text-muted-foreground truncate">
          {selectedClass ? getClassName(selectedClass) : ""} Timetable
        </span>
      </header>

      <main className="flex h-[calc(100vh-56px)] md:h-[calc(100vh-64px)] lg:h-screen overflow-hidden">
        {/* ── LEFT SIDEBAR ── */}
        <aside
          className={`
            fixed lg:relative inset-y-0 left-0 z-40
            w-72 flex-shrink-0 border-r border-border bg-background flex flex-col
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            top-[56px] md:top-[64px] lg:top-0
            h-[calc(100vh-56px)] md:h-[calc(100vh-64px)] lg:h-auto
          `}
        >
          {/* Sidebar header with close button on mobile */}
          <div className="flex items-center justify-between p-4 lg:hidden border-b border-border">
            <span className="text-sm font-medium text-muted-foreground">
              Classes
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 flex flex-col flex-1 overflow-hidden">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search class…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 hinthar-scrollbar">
              {filteredClasses.map((cls) => {
                const isActive = cls.id === selectedClassId;
                const lessonCount = lessons.filter(
                  (l) => l.class_obj?.id === cls.id,
                ).length;
                return (
                  <button
                    key={cls.id}
                    onClick={() => {
                      setSelectedClassId(cls.id);
                      setSelectedLesson(null);
                      setSidebarOpen(false);
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between ${
                      isActive
                        ? "bg-card border-border shadow-xs"
                        : "bg-transparent border-transparent hover:bg-muted/50 hover:border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          isActive ? "bg-accent" : "bg-muted"
                        }`}
                      >
                        <Users
                          className={`h-5 w-5 ${
                            isActive ? "text-accent-foreground" : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3
                          className={`font-medium text-sm truncate ${
                            isActive ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {getClassName(cls)}
                        </h3>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {lessonCount} lesson{lessonCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                    {isActive && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ── MAIN AREA ── */}
        <section className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-border px-4 md:px-6 py-3 md:py-4 shrink-0 flex-wrap gap-3">
            {/* Title */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 md:h-11 md:w-11 items-center justify-center rounded-xl bg-card border border-border flex-shrink-0">
                <Users className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg md:text-xl font-bold text-foreground truncate">
                  {selectedClass ? getClassName(selectedClass) : "Select a Class"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {filteredLessons.length} total lessons
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
              {/* Refresh button */}
              <Button
                variant="outline"
                size="icon"
                onClick={loadData}
                disabled={loading}
                title="Refresh Timetable Data"
                className="shrink-0"
              >
                <RotateCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>

              {/* View toggle */}
              <div className="flex rounded-lg border border-border bg-muted/50 p-1 w-full sm:w-auto">
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === "list"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <List className="h-4 w-4" />{" "}
                  <span className="hidden xs:inline">List</span>
                  <span className="xs:hidden sr-only">List</span>
                </button>
                <button
                  onClick={() => setViewMode("week")}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === "week"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CalendarDays className="h-4 w-4" />{" "}
                  <span className="hidden xs:inline">Week</span>
                  <span className="xs:hidden sr-only">Week</span>
                </button>
              </div>

              {/* Button row */}
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  onClick={() =>
                    setModal({ mode: "add", prefillDayOfWeek: activeDay })
                  }
                  disabled={selectedClassId === null}
                >
                  <Plus className="mr-2 size-4" />
                  <span>Add Timetable Slot</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Banners */}
          {error && (
            <div className="mx-4 md:mx-6 mt-4 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <span>{error}</span>
              <Button size="xs" variant="ghost" onClick={() => setError(null)}>
                Dismiss
              </Button>
            </div>
          )}

          {success && (
            <div className="mx-4 md:mx-6 mt-4 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
              <span>{success}</span>
              <Button size="xs" variant="ghost" onClick={() => setSuccess(null)}>
                Dismiss
              </Button>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-hidden flex min-h-0">
            <div className="flex-1 overflow-y-auto p-4 md:p-6 hinthar-scrollbar min-w-0">
              {/* ── LIST VIEW ── */}
              {viewMode === "list" && (
                <div className="max-w-3xl mx-auto space-y-4 pb-20">
                  {/* Day tabs ─ horizontally scrollable on mobile */}
                  <div className="overflow-x-auto hinthar-scrollbar -mx-4 md:-mx-2 px-4 md:px-2">
                    <div className="flex gap-1 border-b border-border sticky top-0 bg-background z-10 pt-1 min-w-max">
                      {DAYS.map((d, index) => (
                        <button
                          key={d}
                          onClick={() => setActiveDay(index)}
                          className={`px-3 md:px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                            index === activeDay
                              ? "text-foreground border-foreground"
                              : "text-muted-foreground border-transparent hover:text-foreground"
                          }`}
                        >
                          <span className="sm:hidden">{d.slice(0, 3)}</span>
                          <span className="hidden sm:inline">{d}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lessons for selected day */}
                  {listDayLessons.length === 0 ? (
                    <div
                      key="empty"
                      className="flex flex-col items-center justify-center py-20 text-center"
                    >
                      <div className="h-16 w-16 rounded-2xl bg-card border border-border flex items-center justify-center mb-4">
                        <Calendar className="h-7 w-7 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        No lessons for {selectedClass ? getClassName(selectedClass) : "selected class"} on {DAYS[activeDay]}
                      </p>
                      <Button
                        variant="outline"
                        onClick={() =>
                          setModal({ mode: "add", prefillDayOfWeek: activeDay })
                        }
                        disabled={selectedClassId === null}
                        className="mt-4"
                      >
                        <Plus className="mr-2 size-4" /> Add First Timetable Slot
                      </Button>
                    </div>
                  ) : (
                    <div key="list" className="space-y-3 mt-2">
                      {listDayLessons.map((lesson) => {
                        const isSelected = selectedLesson?.id === lesson.id;
                        return (
                          <div
                            key={lesson.id}
                            onClick={() =>
                              setSelectedLesson(isSelected ? null : lesson)
                            }
                            className={`group relative rounded-xl border p-4 cursor-pointer transition-all ${
                              isSelected
                                ? "bg-accent/40 border-accent"
                                : "bg-card border-border hover:bg-muted/50"
                            }`}
                          >
                            {/* Desktop/tablet: horizontal layout */}
                            <div className="hidden sm:flex items-center gap-4">
                              {/* Time column */}
                              <div className="w-20 flex-shrink-0 text-right border-r border-border pr-4">
                                <div className="text-sm font-semibold text-foreground">
                                  {lesson.start_time.substring(0, 5)}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {lesson.end_time.substring(0, 5)}
                                </div>
                              </div>

                              {/* Main content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
                                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold text-foreground">
                                      {lesson.subject.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {lesson.teacher.name}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Edit & Delete buttons */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModal({ mode: "edit", lesson });
                                  }}
                                  title="Edit Slot"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmId(lesson.id);
                                  }}
                                  title="Delete Slot"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Mobile: vertical layout */}
                            <div className="sm:hidden space-y-3">
                              {/* Time on top */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                  {lesson.start_time.substring(0, 5)} – {lesson.end_time.substring(0, 5)}
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setModal({ mode: "edit", lesson });
                                    }}
                                    title="Edit Slot"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteConfirmId(lesson.id);
                                    }}
                                    title="Delete Slot"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {/* Subject & Teacher info */}
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
                                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-foreground">
                                    {lesson.subject.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {lesson.teacher.name}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add lesson CTA ─ always visible */}
                  <button
                    onClick={() =>
                      setModal({ mode: "add", prefillDayOfWeek: activeDay })
                    }
                    disabled={selectedClassId === null}
                    className="w-full min-h-[48px] py-4 border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm font-medium hover:text-foreground hover:border-accent hover:bg-muted/50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4" /> Add Timetable Slot
                  </button>
                </div>
              )}

              {/* ── WEEK VIEW ── */}
              {viewMode === "week" && (
                <div className="overflow-x-auto hinthar-scrollbar -mx-4 md:-mx-6 px-4 md:px-6">
                  <div className="min-w-[700px] flex flex-col h-full">
                    {/* Day headers */}
                    <div className="flex border-b border-border sticky top-0 bg-background z-20">
                      <div className="w-16 shrink-0 border-r border-border" />
                      {DAYS.map((d) => (
                        <div
                          key={d}
                          className="flex-1 py-3 text-center text-xs font-semibold text-muted-foreground border-r border-border last:border-r-0"
                        >
                          {d}
                        </div>
                      ))}
                    </div>

                    {/* Grid + events */}
                    <div className="flex-1 overflow-y-auto relative hinthar-scrollbar">
                      {HOURS.map((h) => (
                        <div
                          key={h}
                          className="flex border-b border-border h-16"
                        >
                          <div className="w-16 shrink-0 border-r border-border p-1 text-right text-[10px] text-muted-foreground sticky left-0 bg-background z-10">
                            {h.toString().padStart(2, "0")}:00
                          </div>
                          {DAYS.map((d, index) => (
                            <div
                              key={d}
                              className="flex-1 border-r border-border last:border-r-0 relative hover:bg-muted/20 transition-colors cursor-pointer"
                              onClick={() =>
                                selectedClassId !== null && setModal({
                                  mode: "add",
                                  prefillDayOfWeek: index,
                                })
                              }
                            />
                          ))}
                        </div>
                      ))}

                      {/* Absolute events overlay */}
                      <div className="absolute top-0 left-16 right-0 bottom-0 pointer-events-none">
                        <div className="flex h-full w-full">
                          {DAYS.map((d, index) => (
                            <div
                              key={d}
                              className="flex-1 relative pointer-events-auto h-full"
                            >
                              {renderWeekEvents(index)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── DETAIL PANEL ── */}
            {selectedLesson && viewMode === "list" && (
              <aside className="flex-shrink-0 border-l border-border bg-card overflow-hidden whitespace-nowrap z-10 hidden md:flex flex-col">
                <div className="w-[300px] h-full flex flex-col">
                  <div className="flex items-center justify-between p-5 border-b border-border">
                    <h3 className="font-semibold text-sm text-foreground">
                      Timetable Slot Details
                    </h3>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setSelectedLesson(null)}
                      className="size-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 p-5 space-y-5 overflow-y-auto hinthar-scrollbar whitespace-normal">
                    {/* Subject */}
                    <div className="flex gap-3 items-start">
                      <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">
                          Subject
                        </div>
                        <div className="text-sm text-foreground font-medium">
                          {selectedLesson.subject.name}
                        </div>
                      </div>
                    </div>
                    {/* Teacher */}
                    <div className="flex gap-3 items-start">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">
                          Teacher
                        </div>
                        <div className="text-sm text-foreground font-medium">
                          {selectedLesson.teacher.name}
                        </div>
                      </div>
                    </div>
                    {/* Time */}
                    <div className="flex gap-3 items-start">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">
                          Time
                        </div>
                        <div className="text-sm text-foreground font-medium">
                          {selectedLesson.start_time.substring(0, 5)} – {selectedLesson.end_time.substring(0, 5)}
                        </div>
                      </div>
                    </div>
                    {/* Day */}
                    <div className="flex gap-3 items-start">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Day</div>
                        <div className="text-sm text-foreground font-medium">
                          {DAYS[selectedLesson.day_of_week]}
                        </div>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() =>
                          setModal({ mode: "edit", lesson: selectedLesson })
                        }
                      >
                        <Edit3 className="mr-2 size-4" /> Edit
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => {
                          setDeleteConfirmId(selectedLesson.id);
                        }}
                      >
                        <Trash2 className="mr-2 size-4" /> Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </aside>
            )}
          </div>
        </section>
      </main>

      {/* ── LESSON MODAL ── */}
      {modal && (
        <SlotModal
          modal={modal}
          teachers={teachers}
          subjects={subjects}
          onSave={handleSave}
          onDelete={(id) => setDeleteConfirmId(id)}
          onClose={() => setModal(null)}
        />
      )}

      {/* ── DELETE CONFIRMATION DIALOG ── */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(val) => !val && setDeleteConfirmId(null)}>
        <DialogContent onClose={() => setDeleteConfirmId(null)}>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this timetable slot? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={deleteSubmitting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
