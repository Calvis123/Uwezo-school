'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Smartphone, FileDown, Landmark, ChevronsUpDown, Check } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { feesApi, refApi, studentsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { MpesaPaymentDialog } from './MpesaPaymentDialog'
import { cn } from '@/lib/utils'

const feeSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  classId: z.string().min(1, 'Class is required'),
  termId: z.string().min(1, 'Term is required'),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  category: z.string().default('TUITION'),
  description: z.string().optional(),
})

type FeeFormData = z.infer<typeof feeSchema>

interface FeeFormDialogProps {
  open: boolean
  onClose: () => void
  editItem?: any | null
  onSuccess?: () => void
  mode?: 'structure' | 'payment'
  initialStructureTermId?: string
  paymentCategory?: string
  initialPayment?: {
    studentId?: string
    classId?: string
    feeStructureId?: string
    termId?: string
    amount?: number
  } | null
}

const ALL_CLASSES_VALUE = 'ALL'
const FEE_SCOPE_OPTIONS = [
  { value: 'SCOPE_PLAYGROUP', label: 'Playgroup', description: 'Playgroup only' },
  { value: 'SCOPE_PP1_PP2', label: 'PP1 - PP2', description: 'PP1, PP2' },
  { value: 'SCOPE_GRADE_1_4', label: 'Grade 1 - Grade 4', description: 'Grade 1, Grade 2, Grade 3, Grade 4' },
  { value: 'SCOPE_GRADE_5_6', label: 'Grade 5 - Grade 6', description: 'Grade 5, Grade 6' },
  { value: 'SCOPE_JSS', label: 'JSS', description: 'Grade 7, Grade 8, Grade 9' },
]

const getSelectedScope = (value: string) => FEE_SCOPE_OPTIONS.find((scope) => scope.value === value)

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

function getApplicablePaymentCategories(student: any): string[] {
  if (!student) return []
  const studentType = student.studentType === 'BOARDING' ? 'BOARDING' : 'DAY'
  if (studentType === 'BOARDING') {
    return ['BOARDING', 'EXTRACURRICULAR', 'OTHER']
  }
  return student.usesTransport
    ? ['TUITION', 'TRANSPORT', 'EXTRACURRICULAR', 'OTHER']
    : ['TUITION', 'EXTRACURRICULAR', 'OTHER']
}

const isOneWayTransportStudent = (student?: any) =>
  String(student?.transportInfo?.transportMode || student?.transportMode || '').startsWith('ONE_WAY')

const getStudentTransportFeeAmount = (fee: any, student?: any) => {
  const amount = Number(fee?.amount || 0)
  return fee?.category === 'TRANSPORT' && isOneWayTransportStudent(student) ? amount / 2 : amount
}

export function FeeFormDialog({
  open,
  onClose,
  editItem,
  onSuccess,
  mode = 'structure',
  initialStructureTermId,
  paymentCategory,
  initialPayment,
}: FeeFormDialogProps) {
  const { classes, terms } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [localClasses, setLocalClasses] = useState(classes)
  const [localTerms, setLocalTerms] = useState(terms)
  const [paymentStudentId, setPaymentStudentId] = useState('')
  const [paymentClassId, setPaymentClassId] = useState('')
  const [paymentFeeStructureId, setPaymentFeeStructureId] = useState('')
  const [paymentTermId, setPaymentTermId] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [students, setStudents] = useState<any[]>([])
  const [feeStructures, setFeeStructures] = useState<any[]>([])
  const [studentOptionsLoading, setStudentOptionsLoading] = useState(false)
  const [studentPickerOpen, setStudentPickerOpen] = useState(false)
  const [feePickerOpen, setFeePickerOpen] = useState(false)

  // Bank transfer fields
  const [bankName, setBankName] = useState('')
  const [bankReference, setBankReference] = useState('')
  const [bankTransferDate, setBankTransferDate] = useState('')

  // M-Pesa dialog state
  const [mpesaDialogOpen, setMpesaDialogOpen] = useState(false)
  const [mpesaResetKey, setMpesaResetKey] = useState(0)
  const wasOpenRef = useRef(false)

  const openMpesaDialog = useCallback(() => {
    setMpesaResetKey((prev) => prev + 1)
    setMpesaDialogOpen(true)
  }, [])

  // Success state after recording payment
  const [successReceiptNumber, setSuccessReceiptNumber] = useState('')

  const form = useForm<FeeFormData>({
    resolver: zodResolver(feeSchema),
    defaultValues: {
      name: '',
      classId: '',
      termId: '',
      amount: 0,
      category: 'TUITION',
      description: '',
    },
  })

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false
      return
    }
    if (wasOpenRef.current) return
    wasOpenRef.current = true

    // Reset success state
    setSuccessReceiptNumber('')
    setBankName('')
    setBankReference('')
    setBankTransferDate('')
    setPaymentStudentId('')
    setPaymentClassId('')
    setPaymentFeeStructureId('')
    setPaymentTermId('')
    setPaymentAmount('')
    setPaymentMethod('CASH')
    setPaymentNotes('')

    if (classes.length === 0) {
      refApi.classes().then((res) => {
        if (res.success && res.data) setLocalClasses(res.data)
      })
    } else {
      setLocalClasses(classes)
    }

    if (terms.length === 0) {
      refApi.terms().then((res) => {
        if (res.success && res.data) {
          setLocalTerms(res.data)
          const preferredTerm = initialStructureTermId
            ? res.data.find((t: any) => t.id === initialStructureTermId)
            : pickLatestYearTerm(res.data)
          if (mode === 'structure' && preferredTerm && !form.getValues('termId')) {
            form.setValue('termId', preferredTerm.id)
          }
          if (mode === 'payment' && preferredTerm) {
            setPaymentTermId(preferredTerm.id)
          }
        }
      })
    } else {
      setLocalTerms(terms)
      const preferredTerm = initialStructureTermId
        ? terms.find((t: any) => t.id === initialStructureTermId)
        : pickLatestYearTerm(terms)
      if (mode === 'structure' && preferredTerm && !form.getValues('termId')) {
        form.setValue('termId', preferredTerm.id)
      }
      if (mode === 'payment' && preferredTerm) {
        setPaymentTermId(preferredTerm.id)
      }
    }

    if (mode === 'payment') {
      setStudents([])
      feesApi.structures({ limit: 500, allTerms: true, ...(paymentCategory ? { category: paymentCategory } : {}) }).then((res) => {
        if (res.success && res.data) {
          const items = res.data.items || res.data || []
          setFeeStructures(items)
        }
      })
    }
  }, [open, classes, terms, mode, paymentCategory, form, initialStructureTermId])

  useEffect(() => {
    if (!open || mode !== 'payment' || !initialPayment) return
    if (initialPayment.studentId) setPaymentStudentId(initialPayment.studentId)
    if (initialPayment.classId) setPaymentClassId(initialPayment.classId)
    if (initialPayment.feeStructureId) setPaymentFeeStructureId(initialPayment.feeStructureId)
    if (initialPayment.termId) setPaymentTermId(initialPayment.termId)
    if (initialPayment.amount && initialPayment.amount > 0) setPaymentAmount(String(initialPayment.amount))
  }, [open, mode, initialPayment])

  useEffect(() => {
    if (editItem) {
      form.reset({
        name: editItem.name || '',
        classId: editItem.classId || '',
        termId: editItem.termId || '',
        amount: editItem.amount || 0,
        category: editItem.category || 'TUITION',
        description: editItem.description || '',
      })
    } else {
      form.reset({
        name: '',
        classId: '',
        termId: '',
        amount: 0,
        category: 'TUITION',
        description: '',
      })
    }
  }, [editItem, form, open])

  const onSubmitStructure = async (data: FeeFormData) => {
    if (String(data.category || '').toUpperCase() === 'TRANSPORT') {
      toast.error('Transport fee structures are managed in the Transport page')
      return
    }
    setLoading(true)
    try {
      const payload = {
        name: String(data.name || '').trim(),
        classId: data.classId,
        termId: data.termId,
        amount: Number(data.amount),
        category: String(data.category || 'TUITION').toUpperCase(),
        description: data.description?.trim() || undefined,
      }
      const result = editItem
        ? await feesApi.updateStructure(editItem.id, payload) as any
        : await feesApi.createStructure(payload) as any
      if (!result.success) {
        toast.error(result.error || `Failed to ${editItem ? 'update' : 'create'} fee structure`)
        return
      }

      const createdCount = result?.data?.createdCount
      const skippedCount = result?.data?.skippedCount
      if (typeof createdCount === 'number') {
        toast.success(
          skippedCount > 0
            ? `Created ${createdCount} structure(s), skipped ${skippedCount}`
            : `Created ${createdCount} structure(s) for all classes`
        )
      } else {
        toast.success(editItem ? 'Fee structure updated' : 'Fee structure saved')
      }
      onClose()
      onSuccess?.()
    } catch {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleRecordPayment = async () => {
    if (!paymentStudentId || !paymentAmount) {
      toast.error('Please fill in all required fields')
      return
    }
    if (paymentCategory === 'TRANSPORT') {
      if (!paymentClassId) {
        toast.error('Please select class for transport payment')
        return
      }
      if (!paymentTermId) {
        toast.error('Please select term for transport payment')
        return
      }
      if (!paymentFeeStructureId) {
        toast.error('Please select transport fee structure')
        return
      }
      const fee = feeStructures.find((item: any) => item.id === paymentFeeStructureId)
      if (!fee || fee.category !== 'TRANSPORT') {
        toast.error('Selected fee must be a transport fee structure')
        return
      }
    }

    // Bank transfer validation
    if (paymentMethod === 'BANK') {
      if (!bankName) {
        toast.error('Please select a bank name')
        return
      }
      if (!bankReference) {
        toast.error('Please enter the reference/check number')
        return
      }
      if (!bankTransferDate) {
        toast.error('Please enter the transfer date')
        return
      }
    }

    setLoading(true)
    try {
      const chosenTerm = localTerms.find((t: any) => t.id === paymentTermId) || selectedFee?.term
      const termNumber = Number(String(chosenTerm?.name || '').match(/\d+/)?.[0] || '1')
      const termCode = chosenTerm ? `${chosenTerm.year}-${termNumber}` : `${new Date().getFullYear()}-1`

      const result = await feesApi.createTransaction({
        studentId: paymentStudentId,
        feeStructureId: paymentFeeStructureId,
        amount: Number(paymentAmount),
        paymentMethod,
        transactionRef: paymentMethod === 'BANK' ? bankReference : undefined,
        term: termCode,
        notes: paymentMethod === 'BANK'
          ? `Bank transfer via ${bankName}. Ref: ${bankReference}. Date: ${bankTransferDate}. ${paymentNotes}`
          : paymentNotes,
      })
      if (result.success) {
        setSuccessReceiptNumber(result.data?.receiptNumber || '')
        toast.success('Payment recorded successfully')
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to record payment')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleMpesaPaymentSuccess = () => {
    toast.success('M-Pesa payment recorded successfully')
    onSuccess?.()
  }

  const selectedStudent = students.find((s: any) => s.id === paymentStudentId)
  const selectedFee = feeStructures.find((f: any) => f.id === paymentFeeStructureId)
  const selectedClass = localClasses.find((c: any) => c.id === paymentClassId)
  const filteredStudents = useMemo(
    () => students.filter((student: any) => !paymentClassId || student.classId === paymentClassId),
    [students, paymentClassId]
  )
  const applicableCategories = getApplicablePaymentCategories(selectedStudent)
  const filteredFeeStructures = feeStructures.filter((fee: any) => {
    const selectedClassId = paymentClassId || selectedStudent?.classId
    const appliesToAllClasses = Boolean(fee.appliesToAllClasses)
    const applicableClassIds = Array.isArray(fee.applicableClassIds) ? fee.applicableClassIds : []
    const matchesStudentClass =
      !selectedClassId ||
      appliesToAllClasses ||
      fee.classId === selectedClassId ||
      applicableClassIds.includes(selectedClassId)
    const matchesTerm = !paymentTermId || fee.termId === paymentTermId
    const matchesCategory = !paymentCategory || fee.category === paymentCategory
    const matchesStudentProfile = !selectedStudent || applicableCategories.includes(String(fee.category || '').toUpperCase())
    return matchesStudentClass && matchesTerm && matchesCategory && matchesStudentProfile
  })
  const selectedStudentLabel = selectedStudent
    ? `${selectedStudent.firstName} ${selectedStudent.lastName}${selectedStudent.admissionNumber ? ` (${selectedStudent.admissionNumber})` : ''}`
    : ''
  const selectedFeeLabel = selectedFee
    ? `${selectedFee.name} (${selectedFee.term?.name || 'Term'}) - KES ${getStudentTransportFeeAmount(selectedFee, selectedStudent).toLocaleString()}`
    : ''

  useEffect(() => {
    if (!open || mode !== 'payment' || paymentCategory !== 'TRANSPORT') return
    if (!selectedFee || !selectedStudent || initialPayment?.amount) return
    const payableAmount = getStudentTransportFeeAmount(selectedFee, selectedStudent)
    if (payableAmount) setPaymentAmount(String(payableAmount))
  }, [open, mode, paymentCategory, selectedFee, selectedStudent, initialPayment?.amount])

  useEffect(() => {
    if (mode !== 'payment' || paymentCategory !== 'TRANSPORT') return
    if (!paymentClassId || !paymentTermId || paymentFeeStructureId) return
    const preferred = feeStructures.find((fee: any) =>
      fee.category === 'TRANSPORT' &&
      fee.classId === paymentClassId &&
      fee.termId === paymentTermId
    )
    if (preferred) {
      setPaymentFeeStructureId(preferred.id)
      const payableAmount = getStudentTransportFeeAmount(preferred, selectedStudent)
      if (!paymentAmount && payableAmount) {
        setPaymentAmount(String(payableAmount))
      }
    }
  }, [mode, paymentCategory, paymentClassId, paymentTermId, paymentFeeStructureId, feeStructures, paymentAmount, selectedStudent])

  useEffect(() => {
    if (!open || mode !== 'payment' || paymentCategory === 'TRANSPORT') return
    if (!selectedStudent || !paymentTermId) return

    const currentFeeStillValid = filteredFeeStructures.some((fee: any) => fee.id === paymentFeeStructureId)
    if (currentFeeStillValid) return

    const preferredCategories = selectedStudent.studentType === 'BOARDING'
      ? ['BOARDING', 'OTHER', 'EXTRACURRICULAR']
      : ['TUITION', 'TRANSPORT', 'OTHER', 'EXTRACURRICULAR']

    const preferred = preferredCategories
      .map((category) => filteredFeeStructures.find((fee: any) => fee.category === category))
      .find(Boolean)

    if (preferred) {
      setPaymentFeeStructureId(preferred.id)
      const payableAmount = getStudentTransportFeeAmount(preferred, selectedStudent)
      if (payableAmount) {
        setPaymentAmount(String(payableAmount))
      }
    } else if (paymentFeeStructureId) {
      setPaymentFeeStructureId('')
    }
  }, [open, mode, paymentCategory, selectedStudent, paymentTermId, filteredFeeStructures, paymentFeeStructureId])

  useEffect(() => {
    if (!open || mode !== 'payment') return
    if (!paymentClassId) {
      if (students.length > 0) {
        setStudents([])
      }
      if (paymentStudentId) {
        setPaymentStudentId('')
      }
      setStudentPickerOpen(false)
      return
    }

    let cancelled = false
    setStudentOptionsLoading(true)
    studentsApi.list({ classId: paymentClassId, status: 'ACTIVE', limit: 500 }).then((res) => {
      if (cancelled) return
      if (res.success && res.data) {
        const items = res.data.items || res.data || []
        setStudents(items)
        if (paymentStudentId && !items.some((student: any) => student.id === paymentStudentId)) {
          setPaymentStudentId('')
        }
      } else {
        setStudents([])
        if (paymentStudentId) setPaymentStudentId('')
      }
    }).catch(() => {
      if (cancelled) return
      setStudents([])
      if (paymentStudentId) setPaymentStudentId('')
    }).finally(() => {
      if (!cancelled) {
        setStudentOptionsLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [open, mode, paymentClassId])

  if (mode === 'payment') {
    return (
      <>
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
          <DialogContent className="flex max-h-[calc(100vh-2rem)] max-w-2xl flex-col p-0 overflow-hidden sm:max-h-[calc(100vh-3rem)]">
            <DialogHeader className="shrink-0">
              <div className="border-b border-slate-200/70 bg-slate-50/80 px-6 py-5 dark:border-slate-700/70 dark:bg-slate-800/50">
                <DialogTitle className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Record Payment</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Capture a school fee payment for the selected student and term.
                </DialogDescription>
              </div>
            </DialogHeader>

            {/* Success State */}
            {successReceiptNumber ? (
              <div className="flex flex-col items-center space-y-4 overflow-y-auto px-6 py-6">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">Payment Recorded!</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Receipt: <span className="font-mono font-semibold">{successReceiptNumber}</span>
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.open(`/api/fees/receipt/${successReceiptNumber}`, '_blank')
                    }}
                    className="w-full"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Download Receipt
                  </Button>
                  <Button onClick={onClose} className="w-full bg-teal-600 hover:bg-teal-700">
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-6 px-6 py-6">
                  <div className="grid gap-5 rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.35)] dark:border-slate-700/70 dark:bg-slate-900/70 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Class</Label>
                      <Select value={paymentClassId} onValueChange={(val) => {
                        setPaymentClassId(val)
                        setPaymentStudentId('')
                        setStudentPickerOpen(false)
                        if (paymentFeeStructureId) {
                          const fee = feeStructures.find((f: any) => f.id === paymentFeeStructureId)
                          const applicableClassIds = Array.isArray(fee?.applicableClassIds) ? fee.applicableClassIds : []
                          if (fee && !fee.appliesToAllClasses && fee.classId !== val && !applicableClassIds.includes(val)) setPaymentFeeStructureId('')
                        }
                      }}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900">
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          {localClasses.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}{c.stream ? ` ${c.stream}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {localClasses.length} class{localClasses.length === 1 ? '' : 'es'} available in your school.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Student</Label>
                      <Popover open={studentPickerOpen} onOpenChange={setStudentPickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={studentPickerOpen}
                            disabled={!paymentClassId || studentOptionsLoading}
                            className="h-12 w-full justify-between rounded-xl border-slate-200 bg-white px-3 font-normal shadow-sm transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                          >
                            <span className="truncate text-left">
                              {paymentClassId
                                ? studentOptionsLoading
                                  ? 'Loading students...'
                                  : selectedStudentLabel || 'Search and select student'
                                : 'Select class first'}
                            </span>
                            {studentOptionsLoading ? (
                              <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-60" />
                            ) : (
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command shouldFilter>
                            <CommandInput placeholder="Search student..." />
                            <CommandList>
                              <CommandEmpty>
                                {paymentClassId ? 'No matching student found.' : 'Select class first.'}
                              </CommandEmpty>
                              {filteredStudents.map((s: any) => {
                                const label = `${s.firstName} ${s.lastName}${s.admissionNumber ? ` (${s.admissionNumber})` : ''}`
                                return (
                                  <CommandItem
                                    key={s.id}
                                    value={`${label} ${s.class?.name || ''}`}
                                    onSelect={() => {
                                      setPaymentStudentId(s.id)
                                      if (s.classId) setPaymentClassId(s.classId)
                                      setStudentPickerOpen(false)
                                    }}
                                  >
                                    <Check className={cn('h-4 w-4', paymentStudentId === s.id ? 'opacity-100' : 'opacity-0')} />
                                    <div className="flex min-w-0 flex-col">
                                      <span className="truncate">{label}</span>
                                      <span className="text-xs text-slate-500 dark:text-slate-400">
                                        {selectedClass?.name || s.class?.name || 'Selected class'}
                                      </span>
                                    </div>
                                  </CommandItem>
                                )
                              })}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {paymentClassId
                          ? studentOptionsLoading
                            ? 'Refreshing class student list...'
                            : `${filteredStudents.length} active student${filteredStudents.length === 1 ? '' : 's'} in ${selectedClass?.name || 'selected class'}.`
                          : 'Student options will appear after class selection.'}
                      </p>
                    </div>
                  </div>

                  {selectedStudent && paymentCategory !== 'TRANSPORT' && (
                    <div className="rounded-2xl border border-teal-200/70 bg-gradient-to-r from-teal-50 via-cyan-50 to-white px-5 py-4 text-sm shadow-[0_20px_45px_-35px_rgba(13,148,136,0.55)] dark:border-teal-800/50 dark:from-teal-950/40 dark:via-cyan-950/20 dark:to-slate-900">
                      <p className="font-semibold text-teal-800 dark:text-teal-200">
                        Applicable fee structures for {selectedStudent.firstName} {selectedStudent.lastName}
                      </p>
                      <p className="mt-1.5 text-sm leading-6 text-teal-700 dark:text-teal-300">
                        {selectedStudent.studentType === 'BOARDING'
                          ? 'This student is registered as boarding, so boarding-related fee structures are shown automatically.'
                          : selectedStudent.usesTransport
                            ? 'This student is a day scholar using transport, so tuition and transport fee structures are both available.'
                            : 'This student is a day scholar, so tuition-related fee structures are shown automatically.'}
                      </p>
                    </div>
                  )}

                  <div className="grid gap-5 rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.35)] dark:border-slate-700/70 dark:bg-slate-900/70 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        {paymentCategory === 'TRANSPORT' ? 'Transport Fee Structure' : 'Fee Structure'}
                      </Label>
                      <Popover open={feePickerOpen} onOpenChange={setFeePickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={feePickerOpen}
                            disabled={!paymentClassId}
                            className="h-12 w-full justify-between rounded-xl border-slate-200 bg-white px-3 font-normal shadow-sm transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                          >
                            <span className="truncate text-left">
                              {selectedFeeLabel || 'Search and select fee structure'}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command shouldFilter>
                            <CommandInput placeholder="Search fee structure..." />
                            <CommandList>
                              <CommandEmpty>No matching fee structure found.</CommandEmpty>
                              {filteredFeeStructures.map((f: any) => {
                                const label = `${f.name} (${f.term?.name || 'Term'}) - KES ${getStudentTransportFeeAmount(f, selectedStudent).toLocaleString()}`
                                return (
                                  <CommandItem
                                    key={f.id}
                                    value={`${label} ${f.category || ''} ${f.class?.name || ''}`}
                                    onSelect={() => {
                                      setPaymentFeeStructureId(f.id)
                                      if (f?.termId) setPaymentTermId(f.termId)
                                      const payableAmount = getStudentTransportFeeAmount(f, selectedStudent)
                                      if (payableAmount) setPaymentAmount(String(payableAmount))
                                      setFeePickerOpen(false)
                                    }}
                                  >
                                    <Check className={cn('h-4 w-4', paymentFeeStructureId === f.id ? 'opacity-100' : 'opacity-0')} />
                                    <div className="flex min-w-0 flex-col">
                                      <span className="truncate">{label}</span>
                                      <span className="text-xs text-slate-500 dark:text-slate-400">
                                        {f.category || 'Fee'}{f.appliesToAllClasses ? ' - All Classes' : f.classScopeLabel ? ` - ${f.classScopeLabel}` : ''}
                                      </span>
                                    </div>
                                  </CommandItem>
                                )
                              })}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {paymentClassId ? 'Only matching fee structures are shown.' : 'Select class first to narrow fee structures.'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Term</Label>
                      <Select value={paymentTermId} onValueChange={(val) => {
                        setPaymentTermId(val)
                        if (paymentFeeStructureId) {
                          const fee = feeStructures.find((f: any) => f.id === paymentFeeStructureId)
                          if (fee?.termId !== val) setPaymentFeeStructureId('')
                        }
                      }}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900">
                          <SelectValue placeholder="Select term" />
                        </SelectTrigger>
                        <SelectContent>
                          {localTerms.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name} {t.year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-5 rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.35)] dark:border-slate-700/70 dark:bg-slate-900/70 md:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Amount (KES) *</Label>
                      <Input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="h-12 rounded-xl border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Payment Method</Label>
                      <Select value={paymentMethod} onValueChange={(val) => {
                        setPaymentMethod(val)
                        if (val !== 'BANK') {
                          setBankName('')
                          setBankReference('')
                          setBankTransferDate('')
                        }
                      }}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="MPESA">M-Pesa</SelectItem>
                          <SelectItem value="BANK">Bank Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Bank Transfer Fields */}
                  {paymentMethod === 'BANK' && (
                    <div className="space-y-4 rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-50 via-white to-cyan-50 p-4 shadow-[0_20px_45px_-35px_rgba(14,165,233,0.45)] dark:border-sky-800 dark:from-sky-950/30 dark:via-slate-900 dark:to-cyan-950/20">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
                        Bank Transfer Details
                      </p>
                      <div className="space-y-2">
                        <Label className="text-sm">Bank Name *</Label>
                        <Select value={bankName} onValueChange={setBankName}>
                          <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                            <SelectValue placeholder="Select bank" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="KCB">KCB (Kenya Commercial Bank)</SelectItem>
                            <SelectItem value="Equity">Equity Bank</SelectItem>
                            <SelectItem value="Co-op">Co-operative Bank</SelectItem>
                            <SelectItem value="NCBA">NCBA Bank</SelectItem>
                            <SelectItem value="Absa">Absa Bank</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Reference / Check Number *</Label>
                        <Input
                          value={bankReference}
                          onChange={(e) => setBankReference(e.target.value)}
                          placeholder="e.g. CHK-001234"
                          className="h-12 rounded-xl border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Transfer Date *</Label>
                        <Input
                          type="date"
                          value={bankTransferDate}
                          onChange={(e) => setBankTransferDate(e.target.value)}
                          className="h-12 rounded-xl border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Notes</Label>
                    <Textarea
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      rows={3}
                      className="min-h-[120px] rounded-2xl border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                </div>
                </div>
                <DialogFooter className="shrink-0 gap-2 border-t border-slate-200/70 bg-slate-50/70 px-6 py-4 dark:border-slate-700/70 dark:bg-slate-900/50">
                  <Button variant="outline" className="h-11 rounded-xl px-5" onClick={onClose}>Cancel</Button>
                  {paymentMethod === 'MPESA' ? (
                    <Button
                      className="h-11 rounded-xl bg-gradient-to-r from-green-600 to-green-500 px-5 text-white hover:from-green-700 hover:to-green-600"
                      onClick={openMpesaDialog}
                      disabled={!paymentStudentId || !paymentAmount}
                    >
                      <Smartphone className="w-4 h-4 mr-2" />
                      Pay with M-Pesa
                    </Button>
                  ) : (
                    <Button
                      className="h-11 rounded-xl bg-teal-600 px-5 hover:bg-teal-700"
                      onClick={handleRecordPayment}
                      disabled={
                        loading ||
                        !paymentStudentId ||
                        !paymentAmount ||
                        (paymentCategory === 'TRANSPORT' && (!paymentClassId || !paymentTermId || !paymentFeeStructureId))
                      }
                    >
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Record Payment
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* M-Pesa Payment Dialog */}
        <MpesaPaymentDialog
          open={mpesaDialogOpen}
          onClose={() => setMpesaDialogOpen(false)}
          resetKey={mpesaResetKey}
          amount={Number(paymentAmount) || 0}
          feeDescription={selectedFee?.name || 'School Fees'}
          studentName={selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : 'Student'}
          studentId={paymentStudentId}
          feeStructureId={paymentFeeStructureId}
          term={(() => {
            const term = localTerms.find((t) => t.id === paymentTermId) || selectedFee?.term
            const number = Number(String(term?.name || '').match(/\d+/)?.[0] || '1')
            return term ? `${term.year}-${number}` : `${new Date().getFullYear()}-1`
          })()}
          onSuccess={handleMpesaPaymentSuccess}
        />
      </>
    )
  }

  const classSelection = form.watch('classId')
  const isAllClassesSelected = classSelection === ALL_CLASSES_VALUE
  const selectedScope = getSelectedScope(classSelection)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200/70 dark:border-slate-700/70 bg-slate-50/70 dark:bg-slate-800/40">
          <DialogTitle className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {editItem ? 'Edit Fee Structure' : 'Add Fee Structure'}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
            Configure the fee structure details for the selected class and term.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmitStructure)} className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <Label>Fee Name *</Label>
            <Input {...form.register('name')} placeholder="e.g. Term 1 Tuition" className="h-11" />
            {form.formState.errors.name && (
              <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>
          {!editItem && (
            <div className="space-y-2">
              <Label>Shared Fee Group *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FEE_SCOPE_OPTIONS.map((scope) => {
                  const active = classSelection === scope.value
                  return (
                    <button
                      key={scope.value}
                      type="button"
                      onClick={() => form.setValue('classId', scope.value, { shouldValidate: true })}
                      className={cn(
                        'text-left rounded-lg border px-3 py-2.5 transition-colors',
                        active
                          ? 'border-teal-500 bg-teal-50 text-teal-900 dark:border-teal-400 dark:bg-teal-900/25 dark:text-teal-100'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                      )}
                    >
                      <span className="block text-sm font-semibold">{scope.label}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{scope.description}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Select one group to apply the same structure to all classes in that band.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {editItem && (
              <div className="space-y-2">
                <Label>Class *</Label>
                <Select value={form.watch('classId')} onValueChange={(v) => form.setValue('classId', v, { shouldValidate: true })}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {localClasses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Term *</Label>
              <Select value={form.watch('termId')} onValueChange={(v) => form.setValue('termId', v)}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {localTerms.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} {t.year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount (KES) *</Label>
              <Input type="number" {...form.register('amount', { valueAsNumber: true })} placeholder="0" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.watch('category')} onValueChange={(v) => form.setValue('category', v)}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TUITION">Tuition</SelectItem>
                  <SelectItem value="BOARDING">Boarding</SelectItem>
                  <SelectItem value="EXTRACURRICULAR">Extracurricular</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Transport fees are configured from the Transport page.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea {...form.register('description')} placeholder="Optional description" rows={2} />
          </div>
          {isAllClassesSelected && (
            <div className="rounded-lg border border-blue-200/70 bg-blue-50/70 px-3 py-2 text-xs text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300">
              This fee structure will apply to all active classes for the selected term.
            </div>
          )}
          {selectedScope && (
            <div className="rounded-lg border border-teal-200/70 bg-teal-50/70 px-3 py-2 text-xs text-teal-700 dark:border-teal-900/50 dark:bg-teal-900/20 dark:text-teal-300">
              {selectedScope.label} shares this fee structure: {selectedScope.description}.
            </div>
          )}
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 min-w-28" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editItem ? 'Update' : isAllClassesSelected ? 'Create for All' : selectedScope ? `Create for ${selectedScope.label}` : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
