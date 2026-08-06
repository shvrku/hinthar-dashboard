"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { Plus, Pencil, Trash2, Loader2, Search, ArrowLeft, GraduationCap, Users } from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import { Class, ClassPayload, EDUCATION_LEVELS, Student, ClassStudent } from "@/lib/types"
import { useSortableData } from "@/lib/use-sortable-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { StandardPageHeader, buildReloadAction } from "@/components/standard-page-header"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePagination } from "@/components/use-pagination"
import { StandardTablePagination } from "@/components/standard-table-pagination"
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
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ClassTableSkeletonRows } from "@/components/page-skeletons"

function TableSkeletonRow() {
  return <ClassTableSkeletonRows rows={1} />
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

  // Selection state
  const [selectedIds, setSelectedIds] = React.useState<number[]>([])
  const [bulkDeleting, setBulkDeleting] = React.useState(false)
  const [bulkConfirmOpen, setBulkConfirmOpen] = React.useState(false)

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
    setSelectedIds([])
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const [classesData, classStudentsData, studentsData] = await Promise.all([
        api.listClasses(),
        api.listClassStudents(),
        api.listStudents(),
      ])
      setClasses(classesData)
      setClassStudents(classStudentsData)
      setStudents(studentsData)
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
      setSelectedIds((prev) => prev.filter((item) => item !== id))
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

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0 || bulkDeleting) return
    setBulkDeleting(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const res = await api.bulkDeleteClasses(selectedIds)
      setSuccessMessage(`Successfully deleted ${res.deleted_count} class(es).`)
      setSelectedIds([])
      setBulkConfirmOpen(false)
      await loadData()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.userMessage)
      } else {
        setError(err instanceof Error ? err.message : "Failed to delete selected classes")
      }
    } finally {
      setBulkDeleting(false)
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

  const [levelFilter, setLevelFilter] = React.useState<string>("all")

  const filteredClasses = React.useMemo(() => {
    return classes.filter((c) => {
      const matchesLevel = levelFilter === "all" || c.education_level === levelFilter
      if (!matchesLevel) return false
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (
        c.education_level.toLowerCase().includes(q) ||
        c.cohort_identifier.toLowerCase().includes(q) ||
        (c.cohort_sub_category && c.cohort_sub_category.toLowerCase().includes(q))
      )
    })
  }, [classes, levelFilter, searchQuery])

  // Sorting
  const { items: sortedClasses, requestSort, sortConfig } = useSortableData(filteredClasses, "id", "asc")

  // Pagination
  const pagination = usePagination(sortedClasses, 10)

  // Selection helpers
  const currentPageIds = React.useMemo(
    () => pagination.paginatedItems.map((c) => c.id),
    [pagination.paginatedItems]
  )
  const allCurrentPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id))

  const toggleSelectAll = () => {
    if (allCurrentPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])))
    }
  }

  const toggleSelectRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Roster helpers
  const enrolledList = React.useMemo(() => {
    if (!activeRosterClass) return []
    const relations = classStudents.filter((cs) => {
      const cId = typeof cs.class_obj === "object" && cs.class_obj ? cs.class_obj.id : cs.class_obj_id ?? (typeof cs.class_obj === "number" ? cs.class_obj : null)
      return cId === activeRosterClass.id
    })
    return relations
      .map((cs) => {
        const sId = typeof cs.student === "object" && cs.student ? cs.student.id : cs.student_id ?? (typeof cs.student === "number" ? cs.student : null)
        const student = students.find((s) => s.id === sId)
        return student ? { student, classStudentId: cs.id } : null
      })
      .filter((x): x is { student: Student; classStudentId: number } => x !== null)
  }, [activeRosterClass, classStudents, students])

  const enrolledStudentIds = React.useMemo(
    () => new Set(enrolledList.map((x) => x.student.id)),
    [enrolledList]
  )

  const filteredUnassigned = React.useMemo(() => {
    const unassigned = students.filter((s) => !enrolledStudentIds.has(s.id))
    if (!rosterSearchQuery.trim()) return unassigned
    const q = rosterSearchQuery.toLowerCase().trim()
    return unassigned.filter(
      (s) => s.name.toLowerCase().includes(q) || String(s.id).includes(q)
    )
  }, [students, enrolledStudentIds, rosterSearchQuery])

  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 max-w-7xl">
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
    <StaggerContainer className="space-y-6">
      {/* Standardized Header */}
      <StaggerItem>
        <StandardPageHeader
          title="Classes"
          description="Manage education levels, cohort identifiers, sub-categories, and student enrollments."
          primaryAction={{
            label: "Add Class",
            onClick: openAddModal,
            icon: <Plus className="size-4" />,
          }}
          secondaryAction={buildReloadAction({
            hasLoaded: lastLoaded !== null,
            loading,
            onClick: loadData,
          })}
        />
      </StaggerItem>

      {/* Metric Highlight Strip */}
      <StaggerItem>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Classes</p>
              <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <GraduationCap className="size-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">{classes.length}</h2>
              {lastLoaded && (
                <span className="text-[11px] text-muted-foreground">Updated {lastLoaded}</span>
              )}
            </div>
          </Card>
        </div>
      </StaggerItem>

      {/* Banners */}
      {successMessage && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
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
                        className="text-success border-success/30 hover:bg-success/10 hover:text-success"
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
          {/* Standardized Management Toolbar Card */}
          <Card className="p-4 mb-6 shadow-2xs border-border/80 bg-card">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex flex-1 items-center gap-3 max-w-lg">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search classes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={levelFilter} onValueChange={(val) => setLevelFilter(val ?? "all")}>
                  <SelectTrigger className="w-40 text-xs">
                    <SelectValue>
                      {levelFilter === "all" ? "All Levels" : (EDUCATION_LEVELS.find((lvl) => lvl.value === levelFilter)?.label ?? levelFilter)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {EDUCATION_LEVELS.map((lvl) => (
                      <SelectItem key={lvl.value} value={lvl.value}>
                        {lvl.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {selectedIds.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setBulkConfirmOpen(true)}
                    className="gap-1.5"
                  >
                    <Trash2 className="size-4" />
                    Delete Selected ({selectedIds.length})
                  </Button>
                )}

                {lastLoaded && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="px-3 py-1 text-xs">
                      <GraduationCap className="mr-1.5 size-3.5" />
                      {classes.length} class{classes.length !== 1 ? "es" : ""}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Floating Table Card */}
          <Card className="rounded-xl border border-border/80 bg-card shadow-2xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={allCurrentPageSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all current page"
                    />
                  </TableHead>

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
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <TableSkeletonRow key={i} />)
                ) : sortedClasses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      {lastLoaded === null ? 'Click "Load Data" to fetch classes.' : "No classes found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  pagination.paginatedItems.map((cls) => {
                    const isSelected = selectedIds.includes(cls.id)
                    return (
                      <TableRow key={cls.id} data-state={isSelected ? "selected" : undefined}>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectRow(cls.id)}
                            aria-label={`Select class ${cls.cohort_identifier}`}
                          />
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">{cls.id}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {EDUCATION_LEVELS.find((l) => l.value === cls.education_level)?.label ?? cls.education_level}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">{cls.cohort_identifier}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {cls.cohort_sub_category || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setActiveRosterClass(cls)}
                              title="Roster / Students"
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
                    )
                  })
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Separate Pagination Container */}
          {filteredClasses.length > 0 && (
            <StandardTablePagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setCurrentPage}
              onPageSizeChange={pagination.setPageSize}
            />
          )}
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
              <Select
                value={formEducationLevel}
                onValueChange={(val) => setFormEducationLevel(val as ClassPayload["education_level"])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Education Level" />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      <ConfirmDialog
        open={deleteConfirmId !== null}
        title="Confirm Delete"
        description="Are you sure you want to delete this class? This action cannot be undone."
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        onCancel={() => setDeleteConfirmId(null)}
        loading={deleteSubmitting}
      />

      <ConfirmDialog
        open={bulkConfirmOpen}
        title="Delete Multiple Classes"
        description={`Are you sure you want to delete ${selectedIds.length} selected class(es)? This action cannot be undone.`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkConfirmOpen(false)}
        loading={bulkDeleting}
      />
    </StaggerContainer>
  )
}
