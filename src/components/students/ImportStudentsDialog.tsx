'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface ParsedRow {
  firstName: string
  lastName: string
  gender: string
  dateOfBirth: string
  className: string
  parentName: string
  parentPhone: string
  parentEmail: string
  valid: boolean
  error: string
}

interface ImportError {
  row: number
  error: string
  data: Record<string, string>
}

interface ImportStudentsDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const CSV_TEMPLATE = `firstName,lastName,gender,dateOfBirth,class,parentName,parentPhone,parentEmail
John,Kamau,MALE,2015-03-15,Grade 4,James Kamau,0712345678,james@email.com
Mary,Wanjiku,FEMALE,2016-07-20,Grade 4,Jane Wanjiku,0723456789,jane@email.com`

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'student_import_template.csv'
  link.click()
  URL.revokeObjectURL(link.href)
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
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
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function validateRow(row: Record<string, string>): { valid: boolean; error: string } {
  if (!row.firstName || !row.lastName) {
    return { valid: false, error: 'First name and last name are required' }
  }
  if (row.gender !== 'MALE' && row.gender !== 'FEMALE') {
    return { valid: false, error: 'Gender must be MALE or FEMALE' }
  }
  if (!row.className) {
    return { valid: false, error: 'Class is required' }
  }
  if (row.parentEmail) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!re.test(row.parentEmail)) {
      return { valid: false, error: 'Invalid email format' }
    }
  }
  return { valid: true, error: '' }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ImportStudentsDialog({ open, onClose, onSuccess }: ImportStudentsDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<{ imported: number; failed: number; errors: ImportError[] } | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setStep(1)
    setFile(null)
    setRows([])
    setTotalRows(0)
    setImporting(false)
    setImportProgress(0)
    setImportResult(null)
  }, [])

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file')
      return
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit')
      return
    }

    setFile(selectedFile)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split(/\r?\n/).filter(line => line.trim())

      if (lines.length < 2) {
        toast.error('CSV file is empty or has no data rows')
        return
      }

      const header = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z]/g, ''))

      const headerMap: Record<string, number> = {}
      const columns = ['firstname', 'lastname', 'gender', 'dateofbirth', 'class', 'parentname', 'parentphone', 'parentemail']

      for (const col of columns) {
        const idx = header.findIndex(h => h.includes(col))
        if (idx >= 0) headerMap[col] = idx
      }

      const dataLines = lines.slice(1)
      setTotalRows(dataLines.length)

      const parsedRows: ParsedRow[] = []
      for (let i = 0; i < Math.min(dataLines.length, 500); i++) {
        const cols = parseCsvLine(dataLines[i])
        const row: Record<string, string> = {
          firstName: headerMap['firstname'] !== undefined ? cols[headerMap['firstname']] || '' : '',
          lastName: headerMap['lastname'] !== undefined ? cols[headerMap['lastname']] || '' : '',
          gender: headerMap['gender'] !== undefined ? (cols[headerMap['gender']] || '').toUpperCase().trim() : '',
          dateOfBirth: headerMap['dateofbirth'] !== undefined ? cols[headerMap['dateofbirth']] || '' : '',
          className: headerMap['class'] !== undefined ? cols[headerMap['class']] || '' : '',
          parentName: headerMap['parentname'] !== undefined ? cols[headerMap['parentname']] || '' : '',
          parentPhone: headerMap['parentphone'] !== undefined ? cols[headerMap['parentphone']] || '' : '',
          parentEmail: headerMap['parentemail'] !== undefined ? cols[headerMap['parentemail']] || '' : '',
        }

        const { valid, error } = validateRow(row)
        parsedRows.push({ ...row, valid, error })
      }

      setRows(parsedRows)
      setStep(2)
    }
    reader.readAsText(selectedFile)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = () => {
    setDragActive(false)
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    setImportProgress(0)
    setStep(3)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Simulate progress
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + Math.random() * 15, 90))
      }, 300)

      const res = await fetch('/api/students/import', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setImportProgress(100)

      const data = await res.json()

      if (data.success) {
        setImportResult({
          imported: data.imported,
          failed: data.failed,
          errors: data.errors || [],
        })
        if (data.imported > 0) {
          toast.success(`Successfully imported ${data.imported} students`)
        }
        if (data.failed > 0) {
          toast.warning(`${data.failed} rows failed to import`)
        }
      } else {
        toast.error(data.error || 'Import failed')
        setImportResult({ imported: 0, failed: 0, errors: [] })
      }
    } catch {
      toast.error('Network error during import')
      setImportResult({ imported: 0, failed: 0, errors: [] })
    } finally {
      setImporting(false)
    }
  }

  const validCount = rows.filter(r => r.valid).length
  const invalidCount = rows.filter(r => !r.valid).length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Students
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step >= s
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>
                {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${
                step >= s ? 'text-teal-700 dark:text-teal-400' : 'text-slate-400'
              }`}>
                {s === 1 ? 'Upload' : s === 2 ? 'Preview' : 'Import'}
              </span>
              {s < 3 && <div className={`w-6 h-0.5 ${step > s ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-700'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                dragActive
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                  : 'border-slate-300 dark:border-slate-600 hover:border-teal-400 dark:hover:border-teal-500'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFile(e.target.files[0])
                }}
              />
              <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Drag & drop your CSV file here
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                or click to browse
              </p>
              <p className="text-xs text-slate-400 mt-3">
                Max 5MB, up to 500 rows
              </p>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 font-medium"
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 2 && (
          <div className="space-y-4">
            {/* File info */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <FileSpreadsheet className="w-8 h-8 text-teal-600" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{file?.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {file && formatFileSize(file.size)} &middot; {totalRows} rows
                </p>
              </div>
            </div>

            {/* Summary */}
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-green-700 dark:text-green-400 font-medium">{validCount} valid</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-red-700 dark:text-red-400 font-medium">{invalidCount} invalid</span>
              </div>
            </div>

            {/* Preview table (first 5 rows) */}
            <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-400 w-6">#</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">Name</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">Gender</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-400 hidden sm:table-cell">Class</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-400 w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t border-slate-100 dark:border-slate-700">
                      <td className="px-3 py-2 text-slate-400 font-mono">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{row.firstName} {row.lastName}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{row.gender}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400 hidden sm:table-cell">{row.className}</td>
                      <td className="px-3 py-2">
                        {row.valid ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" title={row.error} />
                        )}
                      </td>
                    </tr>
                  ))}
                  {rows.length > 5 && (
                    <tr className="border-t border-slate-100 dark:border-slate-700">
                      <td colSpan={5} className="px-3 py-2 text-center text-slate-400 text-xs">
                        ...and {rows.length - 5} more rows
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Invalid rows errors */}
            {invalidCount > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {rows.filter(r => !r.valid).slice(0, 5).map((row, i) => (
                      <p key={i} className="text-xs text-amber-700 dark:text-amber-400">
                        Row {i + 2}: {row.error} ({row.firstName} {row.lastName})
                      </p>
                    ))}
                    {invalidCount > 5 && (
                      <p className="text-xs text-amber-600 dark:text-amber-500">
                        ...and {invalidCount - 5} more errors
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setStep(1); setRows([]); setFile(null) }}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white"
                size="sm"
                disabled={validCount === 0}
                onClick={() => setStep(3)}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Import */}
        {step === 3 && (
          <div className="space-y-4">
            {!importResult ? (
              <>
                {/* Importing state */}
                <div className="text-center space-y-3 py-4">
                  {importing ? (
                    <>
                      <Loader2 className="w-10 h-10 text-teal-600 animate-spin mx-auto" />
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Importing students...</p>
                      <Progress value={importProgress} className="h-2 max-w-xs mx-auto" />
                      <p className="text-xs text-slate-400">{Math.round(importProgress)}%</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Ready to import <strong className="text-teal-600">{validCount}</strong> students.
                        {invalidCount > 0 && (
                          <span> <strong className="text-amber-600">{invalidCount}</strong> rows will be skipped.</span>
                        )}
                      </p>
                    </>
                  )}
                </div>

                <div className="flex justify-between pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep(2)}
                    disabled={importing}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                  <Button
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                    size="sm"
                    onClick={handleImport}
                    disabled={importing}
                  >
                    {importing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        Import {validCount} Students
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Result state */}
                <div className="text-center space-y-4 py-4">
                  <div className="flex justify-center gap-6">
                    <div className="text-center">
                      <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                      </div>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-400 mt-2">{importResult.imported}</p>
                      <p className="text-xs text-slate-500">Imported</p>
                    </div>
                    {importResult.failed > 0 && (
                      <div className="text-center">
                        <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
                          <XCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <p className="text-2xl font-bold text-red-700 dark:text-red-400 mt-2">{importResult.failed}</p>
                        <p className="text-xs text-slate-500">Failed</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Failed rows */}
                {importResult.errors.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/10">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-red-100 dark:bg-red-900/30">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold text-red-700 dark:text-red-400">Error</th>
                          <th className="text-left px-3 py-2 font-semibold text-red-700 dark:text-red-400 hidden sm:table-cell">Student</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.errors.map((err, i) => (
                          <tr key={i} className="border-t border-red-200/50 dark:border-red-800/30">
                            <td className="px-3 py-2 text-red-700 dark:text-red-400">{err.error}</td>
                            <td className="px-3 py-2 text-red-600 dark:text-red-500 hidden sm:table-cell">
                              {err.data?.firstName} {err.data?.lastName}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClose}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Close
                  </Button>
                  {importResult.imported > 0 && (
                    <Button
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                      size="sm"
                      onClick={() => {
                        reset()
                        onSuccess()
                        onClose()
                      }}
                    >
                      Done
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
