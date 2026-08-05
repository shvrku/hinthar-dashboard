"use client"

import * as React from "react"
import { Upload, Download, FileText, CheckCircle2, AlertCircle, Loader2, X, Trash2 } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { SCHOOL_CODES, StudentPayload, TeacherPayload } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"

interface ParsedItem {
  id: string
  selected: boolean
  valid: boolean
  errors: string[]
  fieldErrors: Record<string, string>
  data: Record<string, any>
}

interface BulkImportModalProps {
  open: boolean
  onClose: () => void
  entityType: "student" | "teacher"
  onImport: (items: any[]) => Promise<{ created_count: number }>
  onSuccess: (count: number) => void
}

// Simple robust CSV parser handling quotes and commas
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) return []

  const parseLine = (line: string): string[] => {
    const values: string[] = []
    let current = ""
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === "," && !inQuotes) {
        values.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }
    values.push(current.trim())
    return values
  }

  const rawHeaders = parseLine(lines[0])
  const headers = rawHeaders.map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^_+|_+$/g, ""))

  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i])
    if (vals.length === 0 || (vals.length === 1 && vals[0] === "")) continue
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      if (h) {
        row[h] = vals[idx] ?? ""
      }
    })
    rows.push(row)
  }

  return rows
}

// Smart date parser to convert DD/MM/YYYY, D/M/YYYY, etc. to YYYY-MM-DD
function normalizeDate(val: string): string {
  if (!val || !val.trim()) return ""
  const str = val.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str

  const parts = str.split(/[/.-]/)
  if (parts.length === 3) {
    const [p1, p2, p3] = parts
    if (p1.length === 4) {
      return `${p1}-${p2.padStart(2, "0")}-${p3.padStart(2, "0")}`
    } else if (p3.length === 4) {
      const year = p3
      const num1 = parseInt(p1, 10)
      const num2 = parseInt(p2, 10)
      if (num1 > 12 && num2 <= 12) {
        return `${year}-${p2.padStart(2, "0")}-${p1.padStart(2, "0")}`
      } else if (num2 > 12 && num1 <= 12) {
        return `${year}-${p1.padStart(2, "0")}-${p2.padStart(2, "0")}`
      }
      return `${year}-${p2.padStart(2, "0")}-${p1.padStart(2, "0")}`
    }
  }
  return str
}

// Normalize keys from CSV header mapping
function normalizeRow(
  row: Record<string, string>,
  entityType: "student" | "teacher",
  defaultSchoolCode: string
): { payload: any; errors: string[]; fieldErrors: Record<string, string> } {
  const getKey = (...aliases: string[]) => {
    for (const alias of aliases) {
      for (const k of Object.keys(row)) {
        if (k === alias || k.includes(alias)) {
          if (row[k]) return row[k].trim()
        }
      }
    }
    return ""
  }

  const errors: string[] = []
  const fieldErrors: Record<string, string> = {}

  const name = getKey("name", "student_name", "teacher_name", "full_name")
  if (!name) {
    errors.push("Missing name")
    fieldErrors.name = "Name field is required."
  }

  const ALLOWED_SCHOOL_CODES = SCHOOL_CODES.map((sc) => sc.value)
  const schoolCodeInput = getKey("school_code", "school", "code")
  const schoolCode = schoolCodeInput ? schoolCodeInput.toUpperCase() : defaultSchoolCode

  if (schoolCode && !ALLOWED_SCHOOL_CODES.includes(schoolCode as any)) {
    const msg = `Invalid school_code '${schoolCode}'. Allowed options: ${ALLOWED_SCHOOL_CODES.join(", ")}`
    errors.push(msg)
    fieldErrors.school_code = msg
  }

  if (entityType === "student") {
    const dob = normalizeDate(getKey("dob", "date_of_birth", "birth_date"))
    const enrollmentDate = normalizeDate(getKey("enrollment_date", "enrollment", "join_date"))
    const contact = getKey("contact", "phone", "email", "contact_info")
    const examCandidateNumber = getKey("exam_candidate_number", "exam_no", "candidate_no")

    const payload: StudentPayload = {
      name,
      school_code: schoolCode,
    }
    if (dob) payload.dob = dob
    if (enrollmentDate) payload.enrollment_date = enrollmentDate
    if (contact) payload.contact = contact
    if (examCandidateNumber) payload.exam_candidate_number = examCandidateNumber

    return { payload, errors, fieldErrors }
  } else {
    const employmentTypeInput = getKey("employment_type", "type", "employment")
    let employment_type: TeacherPayload["employment_type"] = null
    if (employmentTypeInput) {
      const lower = employmentTypeInput.toLowerCase()
      if (lower.includes("full")) employment_type = "full_time"
      else if (lower.includes("tutor") || lower.includes("part")) employment_type = "tutor"
    }

    const joinDate = normalizeDate(getKey("join_date", "join", "start_date"))
    const contact = getKey("contact", "phone", "email")

    const payload: TeacherPayload = {
      name,
      school_code: schoolCode,
      employment_type,
      join_date: joinDate || null,
      contact: contact || null,
    }

    return { payload, errors, fieldErrors }
  }
}

export function BulkImportModal({
  open,
  onClose,
  entityType,
  onImport,
  onSuccess,
}: BulkImportModalProps) {
  const [defaultSchoolCode, setDefaultSchoolCode] = React.useState<string>("HIS")
  const [file, setFile] = React.useState<File | null>(null)
  const [parsedItems, setParsedItems] = React.useState<ParsedItem[]>([])
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!open) {
      setFile(null)
      setParsedItems([])
      setSubmitError(null)
      setSubmitting(false)
    }
  }, [open])

  // Download Sample CSV
  const handleDownloadTemplate = () => {
    let csvRows: string[][] = []

    if (entityType === "student") {
      csvRows = [
        ["name", "school_code", "dob", "enrollment_date", "contact", "exam_candidate_number"],
        ["John Doe", "HIS", "2005-04-12", "2024-09-01", "+95912345678", "EXAM-1001"],
        ["Jane Smith", "SPD", "2006-08-15", "2024-09-01", "+95998765432", "EXAM-1002"],
        ["Aung Aung", "SPN", "2005-11-20", "2024-09-01", "+95944455566", "EXAM-1003"],
        ["Kyaw Kyaw", "YWM", "2006-01-30", "2024-09-01", "+95977788899", "EXAM-1004"],
      ]
    } else {
      csvRows = [
        ["name", "school_code", "employment_type", "join_date", "contact"],
        ["Jane Smith", "HIS", "full_time", "2023-01-15", "jane@example.com"],
        ["Aung Kyaw", "SPD", "tutor", "2023-03-10", "aung@example.com"],
        ["Su Su", "SPN", "full_time", "2023-05-01", "susu@example.com"],
        ["Mya Mya", "YWM", "tutor", "2023-07-20", "mya@example.com"],
      ]
    }

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((row) => row.join(",")).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `sample_${entityType}s_import.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Handle File Upload & Parse
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    setFile(selectedFile)
    setSubmitError(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      if (!text) return
      const rawRows = parseCSV(text)

      const items: ParsedItem[] = rawRows.map((row, idx) => {
        const { payload, errors, fieldErrors } = normalizeRow(row, entityType, defaultSchoolCode)
        const valid = errors.length === 0
        return {
          id: `row-${idx}`,
          selected: valid,
          valid,
          errors,
          fieldErrors: fieldErrors || {},
          data: payload,
        }
      })

      setParsedItems(items)
    }
    reader.readAsText(selectedFile)
  }

  // Re-normalize items when defaultSchoolCode changes
  React.useEffect(() => {
    if (parsedItems.length === 0) return
    setParsedItems((prev) =>
      prev.map((item) => {
        const payload = { ...item.data, school_code: item.data.school_code || defaultSchoolCode }
        return { ...item, data: payload }
      })
    )
  }, [defaultSchoolCode])

  const toggleSelectAll = () => {
    const allSelected = parsedItems.every((item) => item.selected)
    setParsedItems((prev) => prev.map((item) => ({ ...item, selected: !allSelected })))
  }

  const toggleSelectItem = (id: string) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    )
  }

  const removeItem = (id: string) => {
    setParsedItems((prev) => prev.filter((item) => item.id !== id))
  }

  const selectedCount = parsedItems.filter((i) => i.selected).length
  const validCount = parsedItems.filter((i) => i.valid).length

  const handleSubmit = async () => {
    const itemsToSubmit = parsedItems.filter((i) => i.selected && i.valid).map((i) => i.data)
    if (itemsToSubmit.length === 0) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await onImport(itemsToSubmit)
      onSuccess(res.created_count)
      onClose()
    } catch (err: any) {
      setSubmitError(err?.userMessage || err?.message || "Failed to import items")
    } finally {
  setSubmitting(false)
    }
  }

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
        <DialogContent onClose={onClose} className="sm:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col p-6">
          <DialogHeader className="shrink-0 pr-8">
            <div className="flex items-center gap-2 flex-wrap">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Upload className="size-5 text-primary" />
                Bulk Import {entityType === "student" ? "Students" : "Teachers"}
              </DialogTitle>
              <Badge variant="secondary" className="capitalize">
                {entityType}
              </Badge>
            </div>
            <DialogDescription className="mt-1">
              Upload a CSV file to bulk create {entityType} records. Preview and validate data before importing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 overflow-y-auto pr-1 flex-1">
            {/* Controls bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl border bg-muted/30">
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Default School Code:
                </label>
                <Select value={defaultSchoolCode} onValueChange={(val) => val && setDefaultSchoolCode(val)}>
                  <SelectTrigger className="w-36 h-9 bg-card">
                    <SelectValue placeholder="School Code" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHOOL_CODES.map((sc) => (
                      <SelectItem key={sc.value} value={sc.value}>
                        {sc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-2 shrink-0">
                <Download className="size-4" />
                Download CSV Template
              </Button>
            </div>

            {/* Upload Area */}
            {!file && (
              <div className="border-2 border-dashed border-border/80 hover:border-primary/50 transition-colors rounded-xl p-8 text-center flex flex-col items-center justify-center bg-card">
                <FileText className="size-10 text-muted-foreground/60 mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">
                  Select a CSV file to upload
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Supported file format: .csv
                </p>
                <div>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse File
                  </Button>
                </div>
              </div>
            )}

            {/* File Selected Banner & Preview */}
            {file && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card text-sm">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="size-4 text-primary shrink-0" />
                    <span className="font-medium truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      setFile(null)
                      setParsedItems([])
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                    Change File
                  </Button>
                </div>

                {/* Error banner */}
                {submitError && (
                  <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-sm text-destructive flex items-center justify-between">
                    <span>{submitError}</span>
                    <Button size="xs" variant="ghost" onClick={() => setSubmitError(null)}>
                      Dismiss
                    </Button>
                  </div>
                )}

                {/* Data Table Preview */}
                <div className="rounded-xl border border-border/80 bg-card overflow-hidden">
                  <div className="p-3 border-b bg-muted/20 flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground">
                      Parsed {parsedItems.length} rows ({validCount} valid, {selectedCount} selected)
                    </span>
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10 text-center">
                            <Checkbox
                              checked={parsedItems.length > 0 && parsedItems.every((i) => i.selected)}
                              onCheckedChange={toggleSelectAll}
                            />
                          </TableHead>
                          <TableHead className="w-24">Status</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>School Code</TableHead>
                          {entityType === "student" ? (
                            <>
                              <TableHead>DOB</TableHead>
                              <TableHead>Contact</TableHead>
                            </>
                          ) : (
                            <>
                              <TableHead>Type</TableHead>
                              <TableHead>Contact</TableHead>
                            </>
                          )}
                          <TableHead className="w-10 text-right"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence mode="popLayout">
                          {parsedItems.map((item, index) => (
                            <motion.tr
                              key={item.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              transition={{ duration: 0.2, delay: index * 0.02 }}
                              className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                              data-state={item.selected ? "selected" : undefined}
                            >
                            <TableCell className="text-center">
                              <Checkbox
                                checked={item.selected}
                                onCheckedChange={() => toggleSelectItem(item.id)}
                              />
                            </TableCell>
                            <TableCell>
                              {item.valid ? (
                                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 gap-1 font-normal">
                                  <CheckCircle2 className="size-3" /> Valid
                                </Badge>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="destructive" className="gap-1 font-normal cursor-help">
                                      <AlertCircle className="size-3" /> Error
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-xs p-2.5 bg-destructive text-destructive-foreground border-none">
                                    <div className="space-y-1">
                                      <p className="font-semibold text-xs border-b border-destructive-foreground/20 pb-1">
                                        Row Validation Errors:
                                      </p>
                                      {item.errors.map((err, idx) => (
                                        <p key={idx} className="text-[11px] leading-tight flex items-start gap-1">
                                          <span>•</span>
                                          <span>{err}</span>
                                        </p>
                                      ))}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {item.fieldErrors?.name ? (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <span className="inline-flex items-center gap-1 text-destructive font-semibold cursor-help underline decoration-dashed decoration-destructive">
                                      <AlertCircle className="size-3.5" />
                                      {item.data.name || "Missing Name"}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="bg-destructive text-destructive-foreground text-xs">
                                    {item.fieldErrors.name}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                item.data.name || "—"
                              )}
                            </TableCell>
                            <TableCell>
                              {item.fieldErrors?.school_code ? (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <span className="inline-flex items-center gap-1 text-destructive font-semibold cursor-help underline decoration-dashed decoration-destructive">
                                      <AlertCircle className="size-3.5" />
                                      {item.data.school_code || "Invalid"}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="bg-destructive text-destructive-foreground text-xs max-w-xs">
                                    {item.fieldErrors.school_code}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                item.data.school_code
                              )}
                            </TableCell>
                            {entityType === "student" ? (
                              <>
                                <TableCell className="text-muted-foreground">{item.data.dob || "—"}</TableCell>
                                <TableCell className="text-muted-foreground">{item.data.contact || "—"}</TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell className="text-muted-foreground">{item.data.employment_type || "—"}</TableCell>
                                <TableCell className="text-muted-foreground">{item.data.contact || "—"}</TableCell>
                              </>
                            )}
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => removeItem(item.id)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t shrink-0">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || selectedCount === 0 || !parsedItems.some((i) => i.selected && i.valid)}
            >
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Import {selectedCount} Record{selectedCount !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
