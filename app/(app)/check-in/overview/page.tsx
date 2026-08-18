"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Monitor,
  RotateCcw,
  Search,
  UserRoundX,
  Wrench,
} from "lucide-react"

import { createApi, ApiError } from "@/lib/api"
import { toLocalDateString } from "@/lib/utils"
import type {
  OverviewClassResponse,
  OverviewClassSummary,
  OverviewSchoolResponse,
  OverviewSearchResponse,
} from "@/lib/types"
import { StandardPageHeader, reloadActionLabel } from "@/components/standard-page-header"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { SearchableSelect } from "@/components/searchable-select"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ClassStudentTable,
  GroupEmptyState,
  LoadingState,
  RosterPageFooter,
  SearchResultsTable,
  toClassRows,
  type ClassRow,
} from "@/components/check-in/overview-tables"

const SEARCH_PAGE_SIZE = 50
const SCHOOL_PAGE_SIZE = 50
const SEARCH_DEBOUNCE_MS = 300
const ALL_CLASSES_ID = "all"


export default function CheckInOverviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getToken, isLoaded, isSignedIn } = useAuth()

  const [selectedDate, setSelectedDate] = React.useState(
    searchParams.get("date") || toLocalDateString()
  )
  const [selectedClassId, setSelectedClassId] = React.useState(
    searchParams.get("class_id") || ALL_CLASSES_ID
  )
  const [searchQuery, setSearchQuery] = React.useState("")

  const [classesSummary, setClassesSummary] = React.useState<
    OverviewClassSummary[] | null
  >(null)
  const [classData, setClassData] = React.useState<OverviewClassResponse | null>(
    null
  )
  const [missingSchool, setMissingSchool] =
    React.useState<OverviewSchoolResponse | null>(null)
  const [arrivedSchool, setArrivedSchool] =
    React.useState<OverviewSchoolResponse | null>(null)
  const [searchData, setSearchData] = React.useState<OverviewSearchResponse | null>(
    null
  )
  const [searchPage, setSearchPage] = React.useState(1)
  const [missingPage, setMissingPage] = React.useState(1)
  const [arrivedPage, setArrivedPage] = React.useState(1)

  const [classesLoading, setClassesLoading] = React.useState(false)
  const [classLoading, setClassLoading] = React.useState(false)
  const [missingLoading, setMissingLoading] = React.useState(false)
  const [arrivedLoading, setArrivedLoading] = React.useState(false)
  const [searchLoading, setSearchLoading] = React.useState(false)
  // True from the keystroke until the debounced request resolves, so typing
  // never looks frozen during the debounce window.
  const [searchPending, setSearchPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [lastLoaded, setLastLoaded] = React.useState<string | null>(null)
  const [undoTarget, setUndoTarget] = React.useState<ClassRow | null>(null)
  const [undoing, setUndoing] = React.useState(false)
  // Query the user is currently on, so out-of-order responses can be discarded.
  const latestSearchRef = React.useRef("")

  const isSchoolWide = selectedClassId === ALL_CLASSES_ID
  const normalizedQuery = searchQuery.trim()
  const isSearching = normalizedQuery.length > 0

  const readError = (err: unknown, fallback: string) =>
    err instanceof ApiError
      ? err.userMessage
      : err instanceof Error
        ? err.message
        : fallback

  const updateUrl = React.useCallback(
    (updates: { class_id?: string; date?: string }) => {
      const params = new URLSearchParams(searchParams.toString())
      const classId = updates.class_id ?? selectedClassId
      const date = updates.date ?? selectedDate
      if (classId) params.set("class_id", classId)
      else params.delete("class_id")
      params.set("date", date)
      router.replace(`/check-in/overview?${params.toString()}`, {
        scroll: false,
      })
    },
    [router, searchParams, selectedClassId, selectedDate]
  )

  const loadClasses = React.useCallback(async () => {
    if (!isSignedIn) return
    setClassesLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No authentication token is available.")
      const data = await createApi(token).overviewClasses(selectedDate)
      setClassesSummary(data.classes)
      setLastLoaded(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      )
    } catch (err) {
      setError(readError(err, "Failed to load classes."))
    } finally {
      setClassesLoading(false)
    }
  }, [getToken, isSignedIn, selectedDate])

  const loadClass = React.useCallback(
    async (classId: string) => {
      if (!isSignedIn || !classId || classId === ALL_CLASSES_ID) return
      setClassLoading(true)
      setError(null)
      setMissingSchool(null)
      setArrivedSchool(null)
      try {
        const token = await getToken()
        if (!token) throw new Error("No authentication token is available.")
        const data = await createApi(token).overviewClass(
          selectedDate,
          Number(classId)
        )
        if (data.mode !== "class") {
          throw new Error("Unexpected overview response for this class.")
        }
        setClassData(data)
      } catch (err) {
        setClassData(null)
        setError(readError(err, "Failed to load the class roster."))
      } finally {
        setClassLoading(false)
      }
    },
    [getToken, isSignedIn, selectedDate]
  )

  const loadSchoolSide = React.useCallback(
    async (status: "missing" | "arrived", page: number) => {
      if (!isSignedIn) return
      const setLoading =
        status === "missing" ? setMissingLoading : setArrivedLoading
      const setData = status === "missing" ? setMissingSchool : setArrivedSchool
      const setPage = status === "missing" ? setMissingPage : setArrivedPage
      setLoading(true)
      setError(null)
      setClassData(null)
      try {
        const token = await getToken()
        if (!token) throw new Error("No authentication token is available.")
        const data = await createApi(token).overviewClass(selectedDate, "all", {
          page,
          page_size: SCHOOL_PAGE_SIZE,
          status,
        })
        if (data.mode !== "school") {
          throw new Error(
            "Unexpected overview response. Check that the API supports school-wide overview."
          )
        }
        setData(data)
        setPage(data.page)
      } catch (err) {
        setData(null)
        setError(readError(err, "Failed to load the school-wide roster."))
      } finally {
        setLoading(false)
      }
    },
    [getToken, isSignedIn, selectedDate]
  )

  const loadSchool = React.useCallback(
    async (nextMissingPage = 1, nextArrivedPage = 1) => {
      // Load missing first (primary ops view), then arrived — halves concurrent burst.
      await loadSchoolSide("missing", nextMissingPage)
      await loadSchoolSide("arrived", nextArrivedPage)
    },
    [loadSchoolSide]
  )

  const runSearch = React.useCallback(
    async (query: string, page: number) => {
      if (!isSignedIn) return
      setSearchLoading(true)
      setError(null)
      try {
        const token = await getToken()
        if (!token) throw new Error("No authentication token is available.")
        const data = await createApi(token).overviewSearch(selectedDate, query, {
          page,
          page_size: SEARCH_PAGE_SIZE,
        })
        // Ignore a response the user has already typed past.
        if (latestSearchRef.current !== query) return
        setSearchData(data)
      } catch (err) {
        if (latestSearchRef.current !== query) return
        setError(readError(err, "Failed to search students."))
      } finally {
        if (latestSearchRef.current === query) setSearchLoading(false)
      }
    },
    [getToken, isSignedIn, selectedDate]
  )

  // Load the class picker summary on mount and whenever the date or auth changes.
  React.useEffect(() => {
    if (isLoaded && isSignedIn) void loadClasses()
  }, [isLoaded, isSignedIn, loadClasses])

  // Keep a valid class selected once the summary is available.
  React.useEffect(() => {
    if (!classesSummary || classesSummary.length === 0) return
    if (selectedClassId === ALL_CLASSES_ID) return
    const exists = classesSummary.some(
      (option) => String(option.id) === selectedClassId
    )
    if (!exists) {
      setSelectedClassId(ALL_CLASSES_ID)
      updateUrl({ class_id: ALL_CLASSES_ID })
    }
  }, [classesSummary, selectedClassId, updateUrl])

  // Fetch the selected roster (skipped while a search is active).
  React.useEffect(() => {
    if (isSearching) return
    if (!(isLoaded && isSignedIn && selectedClassId)) return
    if (selectedClassId === ALL_CLASSES_ID) {
      setMissingPage(1)
      setArrivedPage(1)
      void loadSchool(1, 1)
    } else {
      void loadClass(selectedClassId)
    }
  }, [
    isLoaded,
    isSignedIn,
    isSearching,
    selectedClassId,
    loadClass,
    loadSchool,
  ])

  // Debounced server-side search.
  React.useEffect(() => {
    if (!isSearching) {
      latestSearchRef.current = ""
      setSearchData(null)
      setSearchPending(false)
      return
    }
    latestSearchRef.current = normalizedQuery
    setSearchPending(true)
    setSearchPage(1)
    const handle = setTimeout(() => {
      void runSearch(normalizedQuery, 1).finally(() => {
        if (latestSearchRef.current === normalizedQuery) setSearchPending(false)
      })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [isSearching, normalizedQuery, runSearch])

  const selectedOption =
    selectedClassId === ALL_CLASSES_ID
      ? null
      : (classesSummary?.find(
          (option) => String(option.id) === selectedClassId
        ) ?? null)

  const schoolWideTotals = React.useMemo(() => {
    const classes = classesSummary ?? []
    return {
      arrived: classes.reduce((sum, option) => sum + option.arrived, 0),
      total: classes.reduce((sum, option) => sum + option.total, 0),
    }
  }, [classesSummary])

  const classSelectOptions = React.useMemo(
    () => [
      {
        value: ALL_CLASSES_ID,
        label: "All classes",
        subLabel: `${schoolWideTotals.arrived}/${schoolWideTotals.total} arrived`,
      },
      ...(classesSummary ?? []).map((option) => ({
        value: String(option.id),
        label: option.label,
        subLabel: `${option.arrived}/${option.total} arrived`,
      })),
    ],
    [classesSummary, schoolWideTotals]
  )

  const schoolBusy = missingLoading || arrivedLoading
  const searchBusy = searchPending || searchLoading
  const busy = searchBusy || classesLoading || classLoading || schoolBusy
  const busyLabel = searchBusy
    ? "Searching all classes…"
    : classesLoading
      ? "Loading classes…"
      : isSchoolWide
        ? "Loading school-wide roster…"
        : "Loading class roster…"

  const missingRows = React.useMemo(() => {
    if (isSchoolWide) return toClassRows(missingSchool?.students ?? [])
    return toClassRows(
      (classData?.students ?? []).filter((student) => student.check_in === null)
    )
  }, [isSchoolWide, missingSchool, classData])

  const checkedInRows = React.useMemo(() => {
    if (isSchoolWide) return toClassRows(arrivedSchool?.students ?? [])
    return toClassRows(
      (classData?.students ?? []).filter((student) => student.check_in !== null)
    )
  }, [isSchoolWide, arrivedSchool, classData])

  const enrolledTotal = isSchoolWide
    ? (missingSchool?.total ?? arrivedSchool?.total ?? 0)
    : (classData?.total ?? 0)
  const arrivedTotal = isSchoolWide
    ? (missingSchool?.arrived ?? arrivedSchool?.arrived ?? 0)
    : (classData?.arrived ?? 0)
  const missingTotal = Math.max(enrolledTotal - arrivedTotal, 0)
  const progressValue =
    enrolledTotal === 0 ? 0 : Math.round((arrivedTotal / enrolledTotal) * 100)
  const viewTitle =
    (isSchoolWide
      ? (missingSchool?.class?.label ?? arrivedSchool?.class?.label)
      : classData?.class?.label) ??
    selectedOption?.label ??
    (isSchoolWide ? "All classes" : "Campus arrivals")

  const selectClass = (classId: string) => {
    setSelectedClassId(classId)
    updateUrl({ class_id: classId })
  }

  const selectDate = (date: string) => {
    setSelectedDate(date)
    updateUrl({ date })
  }

  const goToSearchPage = (page: number) => {
    setSearchPage(page)
    void runSearch(normalizedQuery, page)
  }

  const openTerminal = () => router.push("/check-in/terminal")

  const refreshRoster = React.useCallback(async () => {
    if (isSchoolWide) {
      await loadSchool(missingPage, arrivedPage)
    } else {
      await loadClass(selectedClassId)
    }
  }, [
    isSchoolWide,
    loadSchool,
    loadClass,
    missingPage,
    arrivedPage,
    selectedClassId,
  ])

  const confirmUndo = async () => {
    if (!undoTarget?.checkIn || !isSignedIn) return
    setUndoing(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No authentication token is available.")
      await createApi(token).deleteCheckIn(undoTarget.checkIn.id)
      setUndoTarget(null)
      await Promise.all([loadClasses(), refreshRoster()])
    } catch (err) {
      setError(readError(err, "Failed to undo the check-in."))
    } finally {
      setUndoing(false)
    }
  }

  if (!isLoaded) {
    return <LoadingState />
  }

  if (!isSignedIn) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Monitor />
          </EmptyMedia>
          <EmptyTitle>Sign in required</EmptyTitle>
          <EmptyDescription>
            Sign in to view campus check-in information.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <StaggerContainer className="flex flex-col gap-6">
      <StaggerItem>
        <StandardPageHeader
          title="Check-In Overview"
          description="Review campus arrivals by class and date. This is separate from lesson attendance."
          primaryAction={{
            label: "Open Terminal",
            onClick: openTerminal,
            icon: <Monitor />,
          }}
          secondaryAction={{
            label: "Corrections",
            onClick: () =>
              router.push(`/check-in/corrections?date=${selectedDate}`),
            icon: <Wrench />,
          }}
        />
      </StaggerItem>

      {error && (
        <StaggerItem>
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Unable to load check-ins</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </StaggerItem>
      )}

      <StaggerItem>
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <InputGroup>
                <InputGroupInput
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search any student across all classes by name or code"
                  aria-label="Search students across all classes"
                />
                <InputGroupAddon>
                  {searchBusy ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Search />
                  )}
                </InputGroupAddon>
              </InputGroup>

              <div className="flex flex-wrap items-center gap-2">
                <SearchableSelect
                  options={classSelectOptions}
                  value={selectedClassId}
                  onValueChange={selectClass}
                  placeholder="Select a class…"
                  searchPlaceholder="Search classes…"
                  className="w-64"
                  triggerClassName="w-64"
                />

                <InputGroup className="w-auto">
                  <InputGroupInput
                    type="date"
                    value={selectedDate}
                    onChange={(event) => selectDate(event.target.value)}
                    aria-label="Check-in date"
                    className="w-40"
                  />
                </InputGroup>

                <Button
                  size="default"
                  variant="outline"
                  className="h-9 gap-1.5"
                  onClick={() => {
                    void loadClasses()
                    void refreshRoster()
                  }}
                  disabled={classesLoading || classLoading || schoolBusy}
                >
                  <RotateCcw
                    className={`size-4 ${
                      classesLoading || classLoading || schoolBusy
                        ? "animate-spin"
                        : ""
                    }`}
                  />
                  {reloadActionLabel(!!lastLoaded)}
                </Button>
              </div>
            </div>

            <p
              className="flex h-4 items-center gap-2 text-xs text-muted-foreground"
              aria-live="polite"
            >
              {busy ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  {busyLabel}
                </>
              ) : lastLoaded ? (
                `Updated ${lastLoaded}`
              ) : null}
            </p>
          </CardContent>
        </Card>
      </StaggerItem>

      {classesLoading && classesSummary === null ? (
        <StaggerItem>
          <LoadingState />
        </StaggerItem>
      ) : classesSummary !== null && classesSummary.length === 0 ? (
        <StaggerItem>
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UserRoundX />
              </EmptyMedia>
              <EmptyTitle>No enrolled students found</EmptyTitle>
              <EmptyDescription>
                Add students to a class before reviewing campus arrivals.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </StaggerItem>
      ) : isSearching ? (
        <StaggerItem>
          <Card>
            <CardHeader>
              <CardTitle>Search results</CardTitle>
              <CardDescription>
                {searchBusy
                  ? `Searching all classes for “${normalizedQuery}”…`
                  : searchData
                    ? `${searchData.count} match${searchData.count === 1 ? "" : "es"} across all classes for “${normalizedQuery}” on ${selectedDate}.`
                    : "No results yet."}
              </CardDescription>
              <CardAction>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="px-0" aria-busy={searchBusy}>
              {searchBusy ? (
                <SearchResultsTable
                  data={null}
                  loading
                  onSelectClass={() => {}}
                />
              ) : searchData && searchData.results.length > 0 ? (
                <>
                  <SearchResultsTable
                    data={searchData}
                    onSelectClass={(classId) => {
                      selectClass(String(classId))
                      setSearchQuery("")
                    }}
                  />
                  {searchData.num_pages > 1 && (
                    <div className="flex items-center justify-between gap-2 px-6 pt-3">
                      <p className="text-xs text-muted-foreground">
                        Page {searchData.page} of {searchData.num_pages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="icon-xs"
                          variant="outline"
                          disabled={searchPage <= 1 || searchBusy}
                          onClick={() => goToSearchPage(searchPage - 1)}
                          aria-label="Previous page"
                        >
                          <ArrowLeft className="size-3.5" />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="outline"
                          disabled={
                            searchPage >= searchData.num_pages || searchBusy
                          }
                          onClick={() => goToSearchPage(searchPage + 1)}
                          aria-label="Next page"
                        >
                          <ArrowRight className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <UserRoundX />
                    </EmptyMedia>
                    <EmptyTitle>No students matched</EmptyTitle>
                    <EmptyDescription>
                      Try a different name or student code.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>
        </StaggerItem>
      ) : (
        <>
          <StaggerItem>
            <Card>
              <CardHeader>
                <CardTitle>{viewTitle}</CardTitle>
                <CardDescription>
                  {classLoading || schoolBusy
                    ? isSchoolWide
                      ? "Loading the school-wide roster…"
                      : "Loading the roster for this class…"
                    : `${arrivedTotal} of ${enrolledTotal} enrolled students checked in on ${selectedDate}.`}
                </CardDescription>
                <CardAction>
                  {classLoading || schoolBusy ? (
                    <Skeleton className="h-5 w-24" />
                  ) : (
                    <Badge variant={arrivedTotal > 0 ? "success" : "secondary"}>
                      {progressValue}% arrived
                    </Badge>
                  )}
                </CardAction>
              </CardHeader>
              <CardContent>
                {classLoading || schoolBusy ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3.5 w-44" />
                      <Skeleton className="h-3.5 w-10" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ) : (
                  <Progress value={progressValue}>
                    <ProgressLabel>Campus check-in progress</ProgressLabel>
                    <ProgressValue />
                  </Progress>
                )}
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <div
              className="grid min-w-0 gap-4 xl:grid-cols-2"
              aria-busy={classLoading || schoolBusy}
            >
              <Card className="min-w-0 overflow-hidden" size="sm">
                <CardHeader>
                  <CardTitle>Missing</CardTitle>
                  <CardDescription>
                    Enrolled students without a campus check-in
                    {isSchoolWide ? " across all classes" : ""}.
                  </CardDescription>
                  <CardAction>
                    {classLoading || (isSchoolWide && missingLoading) ? (
                      <Skeleton className="h-5 w-8" />
                    ) : (
                      <Badge variant="outline">{missingTotal}</Badge>
                    )}
                  </CardAction>
                </CardHeader>
                <CardContent className="px-0">
                  {classLoading ||
                  (isSchoolWide && missingLoading) ||
                  missingRows.length > 0 ? (
                    <ClassStudentTable
                      rows={missingRows}
                      kind="missing"
                      loading={
                        classLoading || (isSchoolWide && missingLoading)
                      }
                      showClass={isSchoolWide}
                      onOpenTerminal={openTerminal}
                    />
                  ) : (
                    <GroupEmptyState
                      kind="missing"
                      hasEnrollments={enrolledTotal > 0}
                    />
                  )}
                  {isSchoolWide && missingSchool && (
                    <RosterPageFooter
                      page={missingSchool.page}
                      numPages={missingSchool.num_pages}
                      count={missingSchool.count}
                      loading={missingLoading}
                      onPrevious={() =>
                        void loadSchoolSide("missing", missingPage - 1)
                      }
                      onNext={() =>
                        void loadSchoolSide("missing", missingPage + 1)
                      }
                    />
                  )}
                </CardContent>
              </Card>

              <Card className="min-w-0 overflow-hidden" size="sm">
                <CardHeader>
                  <CardTitle>Checked in</CardTitle>
                  <CardDescription>
                    Arrival time and check-in method. Undo removes a mistaken
                    campus check-in.
                  </CardDescription>
                  <CardAction>
                    {classLoading || (isSchoolWide && arrivedLoading) ? (
                      <Skeleton className="h-5 w-8" />
                    ) : (
                      <Badge variant="success">{arrivedTotal}</Badge>
                    )}
                  </CardAction>
                </CardHeader>
                <CardContent className="px-0">
                  {classLoading ||
                  (isSchoolWide && arrivedLoading) ||
                  checkedInRows.length > 0 ? (
                    <ClassStudentTable
                      rows={checkedInRows}
                      kind="checked-in"
                      loading={
                        classLoading || (isSchoolWide && arrivedLoading)
                      }
                      showClass={isSchoolWide}
                      undoingId={
                        undoing && undoTarget?.checkIn
                          ? undoTarget.checkIn.id
                          : null
                      }
                      onOpenTerminal={openTerminal}
                      onUndoCheckIn={setUndoTarget}
                    />
                  ) : (
                    <GroupEmptyState
                      kind="checked-in"
                      hasEnrollments={enrolledTotal > 0}
                    />
                  )}
                  {isSchoolWide && arrivedSchool && (
                    <RosterPageFooter
                      page={arrivedSchool.page}
                      numPages={arrivedSchool.num_pages}
                      count={arrivedSchool.count}
                      loading={arrivedLoading}
                      onPrevious={() =>
                        void loadSchoolSide("arrived", arrivedPage - 1)
                      }
                      onNext={() =>
                        void loadSchoolSide("arrived", arrivedPage + 1)
                      }
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </StaggerItem>

        </>
      )}

      <ConfirmDialog
        open={undoTarget !== null}
        title="Undo campus check-in?"
        description={
          undoTarget
            ? `Remove ${undoTarget.studentName}'s check-in for ${selectedDate}. Auto-marked lesson attendance attributed to this check-in will revert to Absent.`
            : ""
        }
        confirmLabel="Undo check-in"
        variant="destructive"
        onConfirm={confirmUndo}
        onCancel={() => {
          if (!undoing) setUndoTarget(null)
        }}
        loading={undoing}
      />
    </StaggerContainer>
  )
}
