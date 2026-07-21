"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
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
  Menu,
  PanelLeft,
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

// ─── Types ────────────────────────────────────────────────────────────────────

type ClassObj = { id: number; name: string };
type TeacherObj = { id: number; name: string };
type SubjectObj = { id: number; name: string };

type TimetableSlot = {
  id: number;
  teacherId: number;
  teacherName: string;
  subjectId: number;
  subjectName: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number; // 0 = Monday, 1 = Tuesday, 2 = Wednesday, 3 = Thursday, 4 = Friday
  classId: number;
};

// ─── Initial Mock Data ─────────────────────────────────────────────────────────

const INIT_CLASSES: ClassObj[] = [
  { id: 1, name: "Grade 1 - A" },
  { id: 2, name: "Grade 1 - B" },
  { id: 3, name: "Grade 2 - A" },
  { id: 12, name: "Grade 12 - A (IGCSE)" },
  { id: 13, name: "Grade 13 - A (A-Level)" },
];

const INIT_TEACHERS: TeacherObj[] = [
  { id: 1, name: "Mr. John" },
  { id: 2, name: "Ms. Mary" },
  { id: 3, name: "Mr. David" },
  { id: 4, name: "Ms. Sarah" },
  { id: 5, name: "Mr. Adam" },
];

const INIT_SUBJECTS: SubjectObj[] = [
  { id: 1, name: "Mathematics" },
  { id: 2, name: "Physics" },
  { id: 3, name: "Chemistry" },
  { id: 4, name: "Biology" },
  { id: 5, name: "English" },
];

let _nextId = 10;
const genId = () => _nextId++;

const INIT_LESSONS: TimetableSlot[] = [
  {
    id: 1,
    teacherId: 1,
    teacherName: "Mr. John",
    subjectId: 1,
    subjectName: "Mathematics",
    startTime: "08:00",
    endTime: "08:40",
    dayOfWeek: 0,
    classId: 1,
  },
  {
    id: 2,
    teacherId: 2,
    teacherName: "Ms. Mary",
    subjectId: 5,
    subjectName: "English",
    startTime: "08:45",
    endTime: "09:25",
    dayOfWeek: 0,
    classId: 1,
  },
  {
    id: 3,
    teacherId: 1,
    teacherName: "Mr. John",
    subjectId: 1,
    subjectName: "Mathematics",
    startTime: "09:00",
    endTime: "10:30",
    dayOfWeek: 0,
    classId: 12,
  },
  {
    id: 4,
    teacherId: 2,
    teacherName: "Ms. Mary",
    subjectId: 5,
    subjectName: "English",
    startTime: "09:00",
    endTime: "10:30",
    dayOfWeek: 0,
    classId: 12,
  },
  {
    id: 5,
    teacherId: 5,
    teacherName: "Mr. Adam",
    subjectId: 2,
    subjectName: "Physics",
    startTime: "13:00",
    endTime: "14:30",
    dayOfWeek: 0,
    classId: 13,
  },
  {
    id: 6,
    teacherId: 4,
    teacherName: "Ms. Sarah",
    subjectId: 3,
    subjectName: "Chemistry",
    startTime: "13:00",
    endTime: "14:30",
    dayOfWeek: 0,
    classId: 13,
  },
  {
    id: 7,
    teacherId: 3,
    teacherName: "Mr. David",
    subjectId: 4,
    subjectName: "Biology",
    startTime: "08:00",
    endTime: "09:00",
    dayOfWeek: 1,
    classId: 3,
  },
  {
    id: 8,
    teacherId: 1,
    teacherName: "Mr. John",
    subjectId: 1,
    subjectName: "Mathematics",
    startTime: "10:00",
    endTime: "11:30",
    dayOfWeek: 2,
    classId: 1,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timeToMins = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const HOURS = Array.from({ length: 10 }, (_, i) => i + 7); // 07:00–16:00

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Searchable single-select for teachers */
function TeacherSelect({
  teachers,
  value,
  onChange,
}: {
  teachers: TeacherObj[];
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
  subjects: SubjectObj[];
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

const emptyForm = (dayOfWeek = 0): FormState => ({
  dayOfWeek,
  startTime: "09:00",
  endTime: "10:30",
  teacherId: 1,
  subjectId: 1,
});

function lessonToForm(l: TimetableSlot): FormState {
  return {
    dayOfWeek: l.dayOfWeek,
    startTime: l.startTime,
    endTime: l.endTime,
    teacherId: l.teacherId,
    subjectId: l.subjectId,
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
  teachers: TeacherObj[];
  subjects: SubjectObj[];
  onSave: (form: FormState, id?: number) => void;
  onDelete?: (id: number) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(() =>
    modal.mode === "edit" && modal.lesson
      ? lessonToForm(modal.lesson)
      : emptyForm(modal.prefillDayOfWeek),
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
    await new Promise((r) => setTimeout(r, 300));
    onSave(form, modal.lesson?.id);
    setSaving(false);
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
  const [mounted, setMounted] = useState(false);
  const [lessons, setLessons] = useState<TimetableSlot[]>(INIT_LESSONS);
  const [classes] = useState<ClassObj[]>(INIT_CLASSES);
  const [teachers] = useState<TeacherObj[]>(INIT_TEACHERS);
  const [subjects] = useState<SubjectObj[]>(INIT_SUBJECTS);

  const [selectedClassId, setSelectedClassId] = useState<number>(1);
  const [selectedLesson, setSelectedLesson] = useState<TimetableSlot | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "week">("list");
  const [modal, setModal] = useState<ModalState | null>(null);
  const [activeDay, setActiveDay] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const filteredClasses = useMemo(
    () =>
      classes.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [searchQuery, classes],
  );

  const filteredLessons = useMemo(
    () => lessons.filter((l) => l.classId === selectedClassId),
    [selectedClassId, lessons],
  );

  const listDayLessons = useMemo(
    () =>
      filteredLessons
        .filter((l) => l.dayOfWeek === activeDay)
        .sort((a, b) => timeToMins(a.startTime) - timeToMins(b.startTime)),
    [filteredLessons, activeDay],
  );

  // ── TimetableSlot CRUD ──────────────────────────────────────────────────────────

  const handleSave = useCallback(
    (form: FormState, id?: number) => {
      const teacher = teachers.find((t) => t.id === form.teacherId);
      const subject = subjects.find((s) => s.id === form.subjectId);
      if (!teacher || !subject) return;

      if (id) {
        // Edit
        setLessons((prev) =>
          prev.map((l) =>
            l.id === id
              ? {
                  ...l,
                  dayOfWeek: form.dayOfWeek,
                  startTime: form.startTime,
                  endTime: form.endTime,
                  teacherId: form.teacherId,
                  teacherName: teacher.name,
                  subjectId: form.subjectId,
                  subjectName: subject.name,
                  classId: selectedClassId,
                }
              : l,
          ),
        );
        setSelectedLesson((prev) =>
          prev?.id === id
            ? {
                ...prev,
                dayOfWeek: form.dayOfWeek,
                startTime: form.startTime,
                endTime: form.endTime,
                teacherId: form.teacherId,
                teacherName: teacher.name,
                subjectId: form.subjectId,
                subjectName: subject.name,
                classId: selectedClassId,
              }
            : prev,
        );
      } else {
        // Add
        const newLesson: TimetableSlot = {
          id: genId(),
          teacherId: form.teacherId,
          teacherName: teacher.name,
          subjectId: form.subjectId,
          subjectName: subject.name,
          startTime: form.startTime,
          endTime: form.endTime,
          dayOfWeek: form.dayOfWeek,
          classId: selectedClassId,
        };
        setLessons((prev) => [...prev, newLesson]);
      }
      setModal(null);
    },
    [selectedClassId, teachers, subjects],
  );

  const handleDelete = useCallback(
    (id: number) => {
      setLessons((prev) => prev.filter((l) => l.id !== id));
      if (selectedLesson?.id === id) setSelectedLesson(null);
    },
    [selectedLesson],
  );

  // ── Week View ─────────────────────────────────────────────────────────────

  const renderWeekEvents = (dayIndex: number) => {
    const dayLessons = lessons
      .filter((l) => l.dayOfWeek === dayIndex && l.classId === selectedClassId)
      .sort((a, b) => {
        const diff = timeToMins(a.startTime) - timeToMins(b.startTime);
        if (diff !== 0) return diff;
        return (
          timeToMins(a.endTime) -
          timeToMins(a.startTime) -
          (timeToMins(b.endTime) - timeToMins(b.startTime))
        );
      });

    // Group into clusters of overlapping events
    const clusters: TimetableSlot[][] = [];
    let currentCluster: TimetableSlot[] = [];
    let clusterEnd = 0;

    for (const lesson of dayLessons) {
      const start = timeToMins(lesson.startTime);
      const end = timeToMins(lesson.endTime);

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
        const start = timeToMins(lesson.startTime);

        for (let c = 0; c < columns.length; c++) {
          const lastInCol = columns[c][columns[c].length - 1];
          if (start >= timeToMins(lastInCol.endTime)) {
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
          const s = timeToMins(lesson.startTime);
          const e = timeToMins(lesson.endTime);
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
                {lesson.subjectName}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                {lesson.teacherName}
              </div>
              <div className="text-[9px] text-muted-foreground/80 mt-0.5">
                {lesson.startTime}–{lesson.endTime}
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

  if (!mounted) return null;

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
          {selectedClass?.name} Timetable
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
                  (l) => l.classId === cls.id,
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
                      <div>
                        <h3
                          className={`font-medium text-sm ${
                            isActive ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {cls.name}
                        </h3>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {lessonCount} lesson{lessonCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                    {isActive && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
                  {selectedClass?.name}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {filteredLessons.length} total lessons
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
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
                {/* Add TimetableSlot ─ primary style */}
                <Button
                  onClick={() =>
                    setModal({ mode: "add", prefillDayOfWeek: activeDay })
                  }
                >
                  <Plus className="mr-2 size-4" />
                  <span>Add Timetable Slot</span>
                </Button>
              </div>
            </div>
          </div>

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
                        No lessons for {selectedClass?.name} on {DAYS[activeDay]}
                      </p>
                      <Button
                        variant="outline"
                        onClick={() =>
                          setModal({ mode: "add", prefillDayOfWeek: activeDay })
                        }
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
                                  {lesson.startTime}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {lesson.endTime}
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
                                      {lesson.subjectName}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {lesson.teacherName}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Edit button */}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setModal({ mode: "edit", lesson });
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Mobile: vertical layout */}
                            <div className="sm:hidden space-y-3">
                              {/* Time on top */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                  {lesson.startTime} – {lesson.endTime}
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModal({ mode: "edit", lesson });
                                  }}
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </Button>
                              </div>

                              {/* Subject & Teacher info */}
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
                                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-foreground">
                                    {lesson.subjectName}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {lesson.teacherName}
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
                    className="w-full min-h-[48px] py-4 border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm font-medium hover:text-foreground hover:border-accent hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
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
                                setModal({
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
                          {selectedLesson.subjectName}
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
                          {selectedLesson.teacherName}
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
                          {selectedLesson.startTime} – {selectedLesson.endTime}
                        </div>
                      </div>
                    </div>
                    {/* Day */}
                    <div className="flex gap-3 items-start">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Day</div>
                        <div className="text-sm text-foreground font-medium">
                          {DAYS[selectedLesson.dayOfWeek]}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 border-t border-border">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        setModal({ mode: "edit", lesson: selectedLesson })
                      }
                    >
                      <Edit3 className="mr-2 size-4" /> Edit Timetable Slot
                    </Button>
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
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
