"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { Plus, Pencil, Trash2, RotateCcw, Loader2, Search, Users, ArrowLeft, GraduationCap } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import { Class, ClassPayload, EDUCATION_LEVELS, Student, ClassStudent } from "@/lib/types"
import { useSortableData } from "@/lib/use-sortable-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableHeadSortable,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

function TableSkeletonRow() {
  return (
    <TableRow>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
        </TableCell>
      ))}
    </TableRow>
  )
}

export default function ClassesPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  // Data
  const [classes, setClasses] = React.useState<Class[]>([])
  const [students, setStudents] = React.useState<Student[]>([])
  const [classStudents, setClassStudents] = React.useState<ClassStudent[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)

  // Search
  const [searchQuery, setSearchQuery] = React.useState("")
  const [rosterSearchQuery, setRosterSearchQuery] = React.useState("")

  // Modals / Selection
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingClass, setEditingClass] = React.useState<Class | null>(null)
  const [formSubmitting, setFormSubmitting] = React.useState(false)
  const [activeRosterClass, setActiveRosterClass] = React.useState<Class | null>(null)

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<number | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = React.useState(false)

  // Form state
  const [formEducationLevel, setFormEducationLevel] =
    React.useState<ClassPayload["education_level"]>("IAL")
  const [formCohortIdentifier, setFormCohortIdentifier] = React.useState("")
  const [formCohortSubCategory, setFormCohortSubCategory] = React.useState("")

  // Success message auto-dismiss
  React.useEffect(() => {
    if (!successMessage) return
    const timer = setTimeout(() => setSuccessMessage(null), 3000)
    return () => clearTimeout(timer)
  }, [successMessage])

  const loadData = React.useCallback(async () => {
    if (!isSignedIn) return
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const [classesData, studentsData, classStudentsData] = await Promise.all([
        api.listClasses(),
        api.listStudents(),
        api.listClassStudents(),
      ])
      setClasses(classesData)
      setStudents(studentsData)
      setClassStudents(classStudentsData)
      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "Failed to load data")
      }
    } finally {
      setLoading(false)
    }
  }, [getToken, isSignedIn])

  const openAddModal = () => {
    setEditingClass(null)
    setFormEducationLevel("IAL")
    setFormCohortIdentifier("")
    setFormCohortSubCategory("")
    setModalOpen(true)
  }

  const openEditModal = (cls: Class) => {
    setEditingClass(cls)
    setFormEducationLevel(cls.education_level)
    setFormCohortIdentifier(cls.cohort_identifier)
    setFormCohortSubCategory(cls.cohort_sub_category ?? "")
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingClass(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formSubmitting) return
    setFormSubmitting(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)

      const payload: ClassPayload = {
        education_level: formEducationLevel,
        cohort_identifier: formCohortIdentifier,
        cohort_sub_category: formCohortSubCategory || null,
      }

      if (editingClass) {
        await api.updateClass(editingClass.id, payload)
        setSuccessMessage(`Class "${editingClass.cohort_identifier}" updated successfully.`)
      } else {
        await api.createClass(payload)
        setSuccessMessage(`Class "${payload.cohort_identifier}" created successfully.`)
      }

      closeModal()
      await loadData()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "Failed to save class")
      }
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (deleteSubmitting) return
    setDeleteSubmitting(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      await api.deleteClass(id)
      setSuccessMessage("Class deleted successfully.")
      setDeleteConfirmId(null)
      await loadData()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "Failed to delete class")
      }
    } finally {
      setDeleteSubmitting(false)
    }
  }

  // Roster assignment logic
  const handleAssign = async (studentId: number) => {
    if (!activeRosterClass) return
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const newEntry = await api.createClassStudent(activeRosterClass.id, studentId)
      setClassStudents((prev) => [...prev, newEntry])
      setSuccessMessage("Student enrolled in class successfully.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign student")
    }
  }

  const handleUnassign = async (classStudentId: number) => {
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      await api.deleteClassStudent(classStudentId)
      setClassStudents((prev) => prev.filter((cs) => cs.id !== classStudentId))
      setSuccessMessage("Student removed from class successfully.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove student")
    }
  }

  const filteredClasses = React.useMemo(() => {
    if (!searchQuery.trim()) return classes
    const q = searchQuery.toLowerCase().trim()
    return classes.filter(
      (c) =>
        c.education_level.toLowerCase().includes(q) ||
        c.cohort_identifier.toLowerCase().includes(q) ||
        (c.cohort_sub_category && c.cohort_sub_category.toLowerCase().includes(q))
    )
  }, [classes, searchQuery])

  // Sorting
  const { items: sortedClasses, requestSort, sortConfig } = useSortableData(filteredClasses, "id", "asc")

  // Roster helpers
  const assignedStudentIds = React.useMemo(() => {
    return new Set(
      classStudents.map((cs) =>
        typeof cs.student === "object" && cs.student !== null ? cs.student.id : cs.student
      )
    )
  }, [classStudents])

  const enrolledList = React.useMemo(() => {
    if (!activeRosterClass) return []
    const classStudentMap = new Map<number, number>()
    for (const cs of classStudents) {
      const classId = typeof cs.class_obj === "object" && cs.class_obj !== null ? cs.class_obj.id : cs.class_obj
      const studentId = typeof cs.student === "object" && cs.student !== null ? cs.student.id : cs.student
      if (classId === activeRosterClass.id) {
        classStudentMap.set(studentId, cs.id)
      }
    }
    return students
      .filter((s) => classStudentMap.has(s.id))
      .map((s) => ({
        student: s,
        classStudentId: classStudentMap.get(s.id)!,
      }))
  }, [students, classStudents, activeRosterClass])

  const unassignedList = React.useMemo(() => {
    return students.filter((s) => !assignedStudentIds.has(s.id))
  }, [students, assignedStudentIds])

  const filteredUnassigned = React.useMemo(() => {
    if (!rosterSearchQuery.trim()) return unassignedList
    const q = rosterSearchQuery.toLowerCase().trim()
    return unassignedList.filter(
      (s) => s.name.toLowerCase().includes(q) || String(s.id).includes(q)
    )
  }, [unassignedList, rosterSearchQuery])

  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="mb-6 h-4 w-72 animate-pulse rounded-lg bg-muted" />
        <div className="rounded-xl border p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 w-full animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground font-medium">Please sign in to view classes.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Classes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage academic classes, cohorts, and student roster enrollments.
          </p>
        </div>

        {!activeRosterClass && (
          <div className="flex items-center gap-3">
            <Button onClick={loadData} disabled={loading} variant="default" className="shadow-xs">
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 size-4" />
                  Load Data
                </>
              )}
            </Button>

            <Button onClick={openAddModal} variant="outline" className="shadow-xs">
              <Plus className="mr-2 size-4" />
              Add Class
            </Button>
          </div>
        )}
      </div>

      {/* Banners */}
      {successMessage && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          <span>{successMessage}</span>
          <Button size="xs" variant="ghost" onClick={() => setSuccessMessage(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <Button size="xs" variant="ghost" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Roster View vs Main Table */}
      {activeRosterClass ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveRosterClass(null)}
            >
              <ArrowLeft className="mr-2 size-4" />
              Back to Classes
            </Button>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="px-3 py-1">
                {activeRosterClass.education_level} - {activeRosterClass.cohort_identifier}
                {activeRosterClass.cohort_sub_category && ` (${activeRosterClass.cohort_sub_category})`}
              </Badge>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Enrolled Students Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Enrolled Students</span>
                  <Badge variant="default">{enrolledList.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {enrolledList.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No students currently enrolled.
                  </p>
                ) : (
                  enrolledList.map(({ student, classStudentId }) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between rounded-lg border p-3 bg-muted/20"
                    >
                      <div>
                        <p className="font-medium text-sm">{student.name}</p>
                        <p className="text-xs text-muted-foreground">ID: {student.id}</p>
                      </div>
                      <Button
                        size="xs"
                        variant="destructive"
                        onClick={() => handleUnassign(classStudentId)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Unassigned Students Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Available Students to Enroll</CardTitle>
                <div className="relative pt-2">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search available students..."
                    value={rosterSearchQuery}
                    onChange={(e) => setRosterSearchQuery(e.target.value)}
                    className="pl-9 h-8 text-xs"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
                {filteredUnassigned.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No matching unassigned students.
                  </p>
                ) : (
                  filteredUnassigned.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-sm">{student.name}</p>
                        <p className="text-xs text-muted-foreground">ID: {student.id}</p>
                      </div>
                      <Button
                        size="xs"
                        variant="outline"
                        className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-700"
                        onClick={() => handleAssign(student.id)}
                      >
                        Enroll
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Class list table */
        <div>
          {/* Toolbar */}
          <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search classes by level, cohort, sub-category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {lastLoaded && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="px-3 py-1 text-xs">
                  <GraduationCap className="mr-1.5 size-3.5" />
                  {classes.length} class{classes.length !== 1 ? "es" : ""}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Loaded {lastLoaded}
                </span>
              </div>
            )}
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeadSortable
                  className="w-[100px]"
                  sortKey="id"
                  currentSortKey={sortConfig.key}
                  currentSortOrder={sortConfig.order}
                  onSort={requestSort}
                >
                  ID
                </TableHeadSortable>

                <TableHeadSortable
                  sortKey="education_level"
                  currentSortKey={sortConfig.key}
                  currentSortOrder={sortConfig.order}
                  onSort={requestSort}
                >
                  Education Level
                </TableHeadSortable>

                <TableHeadSortable
                  sortKey="cohort_identifier"
                  currentSortKey={sortConfig.key}
                  currentSortOrder={sortConfig.order}
                  onSort={requestSort}
                >
                  Cohort Identifier
                </TableHeadSortable>

                <TableHeadSortable
                  sortKey="cohort_sub_category"
                  currentSortKey={sortConfig.key}
                  currentSortOrder={sortConfig.order}
                  onSort={requestSort}
                >
                  Sub Category
                </TableHeadSortable>

                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && classes.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => <TableSkeletonRow key={i} />)
              ) : sortedClasses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    {classes.length === 0 ? 'Click "Load Data" to fetch classes.' : 'No classes found.'}
                  </TableCell>
                </TableRow>
              ) : (
                sortedClasses.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-semibold text-foreground">{cls.id}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{cls.education_level}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{cls.cohort_identifier}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {cls.cohort_sub_category ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setActiveRosterClass(cls)}
                          title="Manage Roster"
                        >
                          <Users className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditModal(cls)}
                          title="Edit"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirmId(cls.id)}
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={(val) => !val && closeModal()}>
        <DialogContent onClose={closeModal}>
          <DialogHeader>
            <DialogTitle>{editingClass ? "Edit Class" : "Add Class"}</DialogTitle>
            <DialogDescription>
              {editingClass
                ? "Update class details below."
                : "Enter details for the new class cohort."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Education Level</label>
              <select
                value={formEducationLevel}
                onChange={(e) => setFormEducationLevel(e.target.value as ClassPayload["education_level"])}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                required
              >
                {EDUCATION_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Cohort Identifier</label>
              <Input
                type="text"
                value={formCohortIdentifier}
                onChange={(e) => setFormCohortIdentifier(e.target.value)}
                maxLength={1}
                placeholder="e.g. A"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Sub Category <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                type="text"
                value={formCohortSubCategory}
                onChange={(e) => setFormCohortSubCategory(e.target.value)}
                maxLength={1}
                placeholder="e.g. 1"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={formSubmitting}>
                {formSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                {editingClass ? "Save Changes" : "Create Class"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(val) => !val && setDeleteConfirmId(null)}>
        <DialogContent onClose={() => setDeleteConfirmId(null)}>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this class? This action cannot be undone.
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
  )
}
