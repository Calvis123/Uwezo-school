'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { Plus, Search, FileText, ChevronLeft, ChevronRight, GraduationCap, Bus, Bed, Trophy, Settings2, Pencil, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { feesApi, refApi } from '@/lib/api'
import { FeeFormDialog } from './FeeFormDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { sortClassesByLevelAndStream } from '@/lib/class-sort'

interface FeeStructureRow {
  id: string
  name: string
  classId: string
  class?: { name: string }
  appliesToAllClasses?: boolean
  classScope?: string | null
  classScopeLabel?: string | null
  term?: { name: string; year: number }
  amount: number
  category: string
  status: string
  _count?: { transactions: number }
}

const FEE_SCOPE_OPTIONS = [
  { value: 'SCOPE_PLAYGROUP', label: 'Playgroup' },
  { value: 'SCOPE_PP1_PP2', label: 'PP1 - PP2' },
  { value: 'SCOPE_GRADE_1_4', label: 'Grade 1 - Grade 4' },
  { value: 'SCOPE_GRADE_5_6', label: 'Grade 5 - Grade 6' },
  { value: 'SCOPE_JSS', label: 'JSS' },
]

function sortTermsBySequence(a: any, b: any) {
  const aNum = Number(String(a.name).match(/\d+/)?.[0] || '99')
  const bNum = Number(String(b.name).match(/\d+/)?.[0] || '99')
  return aNum - bNum
}

function pickLatestYearTerm(terms: any[]) {
  if (!terms.length) return null
  const currentYear = new Date().getFullYear()
  const years = terms.map((term: any) => Number(term.year) || 0).filter((year: number) => year > 0)
  const latestYear = years.includes(currentYear) ? currentYear : Math.max(...years)
  const inLatestYear = terms
    .filter((term: any) => Number(term.year) === latestYear)
    .sort(sortTermsBySequence)
  return inLatestYear.find((term: any) => term.status === 'ACTIVE') || inLatestYear[0] || null
}

export function FeeStructures({
  termId,
  initialStructureTermId,
}: {
  termId?: string
  initialStructureTermId?: string
}) {
  const { classes, setClasses, terms, setTerms, user } = useAppStore()
  const [structures, setStructures] = useState<FeeStructureRow[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [deleteItem, setDeleteItem] = useState<FeeStructureRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [filterClass, setFilterClass] = useState('')
  const [filterTerm, setFilterTerm] = useState(termId || '')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [localClasses, setLocalClasses] = useState(classes)
  const [localTerms, setLocalTerms] = useState(terms)
  const classFilterOptions = useMemo(() => sortClassesByLevelAndStream(localClasses), [localClasses])

  const loadStructures = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page, limit: 20 }
      if (filterClass) params.classId = filterClass
      if (filterTerm) params.termId = filterTerm
      if (!filterTerm) params.allTerms = true
      const res = await feesApi.structures(params)
      if (res.success && res.data) {
        setStructures((res.data || []).map((item: FeeStructureRow) => ({
          ...item,
          class: item.classScopeLabel ? { ...(item.class || {}), name: item.classScopeLabel } : item.class,
        })))
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages)
          setTotal(res.pagination.total)
        }
      } else {
        setStructures([])
      }
    } catch {
      setStructures([])
    } finally {
      setLoading(false)
    }
  }, [filterClass, filterTerm, page])

  useEffect(() => {
    if (classes.length === 0) {
      refApi.classes().then((res) => {
        if (res.success && res.data) {
          setClasses(res.data)
          setLocalClasses(res.data)
        }
      })
    } else {
      setLocalClasses(classes)
    }
  }, [classes, setClasses])

  useEffect(() => {
    if (termId !== undefined) {
      setFilterTerm(termId)
      setPage(1)
    }
  }, [termId])

  useEffect(() => {
    if (terms.length === 0) {
      refApi.terms().then((res) => {
        if (res.success && res.data) {
          setTerms(res.data)
          setLocalTerms(res.data)
        }
      })
    } else {
      setLocalTerms(terms)
    }
  }, [terms, setTerms, termId, filterTerm])

  useEffect(() => {
    if (localTerms.length > 0) loadStructures()
  }, [loadStructures, localTerms.length])

  const categoryColors: Record<string, string> = {
    TUITION: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    TRANSPORT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    BOARDING: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    EXTRACURRICULAR: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    OTHER: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  }

  const categoryIcons: Record<string, React.ReactNode> = {
    TUITION: <GraduationCap className="w-3 h-3" />,
    TRANSPORT: <Bus className="w-3 h-3" />,
    BOARDING: <Bed className="w-3 h-3" />,
    EXTRACURRICULAR: <Trophy className="w-3 h-3" />,
    OTHER: <Settings2 className="w-3 h-3" />,
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)

  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  const handleDeleteStructure = async () => {
    if (!deleteItem) return
    setDeleting(true)
    try {
      const res = await feesApi.deleteStructure(deleteItem.id) as any
      if (res.success) {
        toast.success('Fee structure deleted')
        setDeleteItem(null)
        await loadStructures()
      } else {
        toast.error(res.error || 'Failed to delete fee structure')
      }
    } catch {
      toast.error('Failed to delete fee structure')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {!termId && (
            <Select value={filterTerm || ''} onValueChange={(v) => { setFilterTerm(v === 'all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="All Terms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                {localTerms.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} {t.year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={filterClass} onValueChange={(v) => { setFilterClass(v === 'all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {FEE_SCOPE_OPTIONS.map((scope) => (
                <SelectItem key={scope.value} value={scope.value}>{scope.label}</SelectItem>
              ))}
              {classFilterOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          className="bg-teal-600 hover:bg-teal-700 text-white"
          onClick={() => { setEditItem(null); setFormOpen(true) }}
        >
          <Plus className="w-4 h-4 mr-2" /> Add Structure
        </Button>
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 px-1">
        <span>{total} fee structure{total !== 1 ? 's' : ''} found</span>
        {totalPages > 1 && (
          <span>Page {page} of {totalPages}</span>
        )}
      </div>

      {/* Table */}
      <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/80">
                  <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Name</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden sm:table-cell">Class</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden md:table-cell">Term</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Category</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Amount</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden sm:table-cell">Status</TableHead>
                  {isSuperAdmin && (
                    <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(10)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                      {isSuperAdmin && <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>}
                    </TableRow>
                  ))
                ) : structures.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isSuperAdmin ? 7 : 6} className="text-center py-12">
                      <div className="flex flex-col items-center">
                        <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No fee structures found</p>
                        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Try selecting a different term or class</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  structures.map((s, idx) => (
                    <TableRow key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 group">
                      <TableCell className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        <span className="text-slate-400 dark:text-slate-500 text-xs mr-2">#{(page - 1) * 20 + idx + 1}</span>
                        {s.name}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-slate-600 dark:text-slate-400">
                        {s.appliesToAllClasses ? 'All Classes' : (s.class?.name || '—')}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-slate-500 dark:text-slate-400">
                        {s.term?.name || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn('text-[10px] gap-1', categoryColors[s.category] || '')}>
                          {categoryIcons[s.category]} {s.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(s.amount)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary" className={cn(
                          'text-[10px]',
                          s.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        )}>
                          {s.status}
                        </Badge>
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-slate-500 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                              onClick={() => { setEditItem(s); setFormOpen(true) }}
                              aria-label={`Edit ${s.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-slate-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => setDeleteItem(s)}
                              aria-label={`Delete ${s.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (page <= 3) {
                pageNum = i + 1
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = page - 2 + i
              }
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'w-8 h-8 p-0 text-xs',
                    pageNum === page && 'bg-teal-600 hover:bg-teal-700'
                  )}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      <FeeFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(null) }}
        editItem={editItem}
        onSuccess={loadStructures}
        mode="structure"
        initialStructureTermId={initialStructureTermId || termId || filterTerm || undefined}
      />

      <AlertDialog open={!!deleteItem} onOpenChange={(open) => { if (!open) setDeleteItem(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fee Structure</AlertDialogTitle>
            <AlertDialogDescription>
              Delete {deleteItem?.name || 'this fee structure'}? This is only allowed when no payments have been recorded against it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStructure}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
