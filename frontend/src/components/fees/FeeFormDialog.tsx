'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Smartphone, FileDown } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { feesApi, refApi, studentsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
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
import { MpesaPaymentDialog } from './MpesaPaymentDialog'

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

  // Bank transfer fields
  const [bankName, setBankName] = useState('')
  const [bankReference, setBankReference] = useState('')
  const [bankTransferDate, setBankTransferDate] = useState('')

  // M-Pesa dialog state
  const [mpesaDialogOpen, setMpesaDialogOpen] = useState(false)
  const [mpesaResetKey, setMpesaResetKey] = useState(0)

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
    if (open) {
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
            if (mode === 'payment' && preferredTerm && !paymentTermId) {
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
        if (mode === 'payment' && preferredTerm && !paymentTermId) {
          setPaymentTermId(preferredTerm.id)
        }
      }

      // Load students and fee structures for payment mode
      if (mode === 'payment') {
        if (students.length === 0) {
          studentsApi.list({ limit: 500, status: 'ACTIVE' }).then((res) => {
            if (res.success && res.data) {
              const items = res.data.items || res.data || []
              setStudents(items)
            }
          })
        }
        feesApi.structures({ limit: 500, allTerms: true, ...(paymentCategory ? { category: paymentCategory } : {}) }).then((res) => {
          if (res.success && res.data) {
            const items = res.data.items || res.data || []
            setFeeStructures(items)
          }
        })
      }
    }
  }, [open, classes, terms, mode, paymentCategory, students.length, form, paymentTermId, initialStructureTermId])

  useEffect(() => {
    if (!open || mode !== 'payment' || !initialPayment) return
    if (initialPayment.studentId) setPaymentStudentId(initialPayment.studentId)
    if (initialPayment.classId) setPaymentClassId(initialPayment.classId)
    if (initialPayment.feeStructureId) setPaymentFeeStructureId(initialPayment.feeStructureId)
    if (initialPayment.termId) setPaymentTermId(initialPayment.termId)
    if (initialPayment.amount && initialPayment.amount > 0) setPaymentAmount(String(initialPayment.amount))
  }, [open, mode, initialPayment])

  useEffect(() => {
    if (!paymentStudentId) return
    const selected = students.find((s: any) => s.id === paymentStudentId)
    if (selected?.classId && paymentClassId !== selected.classId) {
      setPaymentClassId(selected.classId)
    }
  }, [paymentStudentId, students, paymentClassId])

  useEffect(() => {
    if (!paymentFeeStructureId) return
    const selected = feeStructures.find((f: any) => f.id === paymentFeeStructureId)
    if (selected?.classId && paymentClassId !== selected.classId) {
      setPaymentClassId(selected.classId)
    }
  }, [paymentFeeStructureId, feeStructures, paymentClassId])

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
      const result = await feesApi.createStructure(payload) as any
      if (!result.success) {
        toast.error(result.error || 'Failed to create fee structure')
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
        toast.success('Fee structure saved')
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
  const filteredStudents = students.filter((student: any) => !paymentClassId || student.classId === paymentClassId)
  const filteredFeeStructures = feeStructures.filter((fee: any) => {
    const selectedClassId = paymentClassId || selectedStudent?.classId
    const appliesToAllClasses = Boolean(fee.appliesToAllClasses)
    const matchesStudentClass = !selectedClassId || appliesToAllClasses || fee.classId === selectedClassId
    const matchesTerm = !paymentTermId || fee.termId === paymentTermId
    const matchesCategory = !paymentCategory || fee.category === paymentCategory
    return matchesStudentClass && matchesTerm && matchesCategory
  })

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
      if (!paymentAmount && preferred.amount) {
        setPaymentAmount(String(preferred.amount))
      }
    }
  }, [mode, paymentCategory, paymentClassId, paymentTermId, paymentFeeStructureId, feeStructures, paymentAmount])

  if (mode === 'payment') {
    return (
      <>
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>

            {/* Success State */}
            {successReceiptNumber ? (
              <div className="flex flex-col items-center py-4 space-y-4">
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
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select value={paymentClassId} onValueChange={(val) => {
                      setPaymentClassId(val)
                      const selected = students.find((s: any) => s.id === paymentStudentId)
                      if (selected && selected.classId !== val) {
                        setPaymentStudentId('')
                      }
                      if (paymentFeeStructureId) {
                        const fee = feeStructures.find((f: any) => f.id === paymentFeeStructureId)
                        if (fee && !fee.appliesToAllClasses && fee.classId !== val) setPaymentFeeStructureId('')
                      }
                    }}>
                      <SelectTrigger>
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
                  </div>
                  <div className="space-y-2">
                    <Label>Student</Label>
                    <Select value={paymentStudentId} onValueChange={(val) => {
                      setPaymentStudentId(val)
                      const student = students.find((s: any) => s.id === val)
                      if (student?.classId) setPaymentClassId(student.classId)
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredStudents.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.firstName} {s.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{paymentCategory === 'TRANSPORT' ? 'Transport Fee Structure' : 'Fee Structure'}</Label>
                    <Select value={paymentFeeStructureId} onValueChange={(val) => {
                      setPaymentFeeStructureId(val)
                      // Auto-fill amount when fee structure is selected
                      const fee = feeStructures.find((f: any) => f.id === val)
                      if (fee?.termId) setPaymentTermId(fee.termId)
                      if (fee?.amount) {
                        setPaymentAmount(String(fee.amount))
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select fee" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredFeeStructures.map((f: any) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name} ({f.term?.name || 'Term'}) - KES {f.amount?.toLocaleString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Term</Label>
                    <Select value={paymentTermId} onValueChange={(val) => {
                      setPaymentTermId(val)
                      if (paymentFeeStructureId) {
                        const fee = feeStructures.find((f: any) => f.id === paymentFeeStructureId)
                        if (fee?.termId !== val) setPaymentFeeStructureId('')
                      }
                    }}>
                      <SelectTrigger>
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
                  <div className="space-y-2">
                    <Label>Amount (KES) *</Label>
                    <Input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={(val) => {
                      setPaymentMethod(val)
                      // Reset bank fields when switching away from BANK
                      if (val !== 'BANK') {
                        setBankName('')
                        setBankReference('')
                        setBankTransferDate('')
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="MPESA">M-Pesa</SelectItem>
                        <SelectItem value="BANK">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Bank Transfer Fields */}
                  {paymentMethod === 'BANK' && (
                    <div className="space-y-3 rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20 p-3">
                      <p className="text-xs font-medium text-sky-700 dark:text-sky-300 uppercase tracking-wider">
                        Bank Transfer Details
                      </p>
                      <div className="space-y-2">
                        <Label className="text-sm">Bank Name *</Label>
                        <Select value={bankName} onValueChange={setBankName}>
                          <SelectTrigger>
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
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Transfer Date *</Label>
                        <Input
                          type="date"
                          value={bankTransferDate}
                          onChange={(e) => setBankTransferDate(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} rows={2} />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={onClose}>Cancel</Button>
                  {paymentMethod === 'MPESA' ? (
                    <Button
                      className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white"
                      onClick={openMpesaDialog}
                      disabled={!paymentStudentId || !paymentAmount}
                    >
                      <Smartphone className="w-4 h-4 mr-2" />
                      Pay with M-Pesa
                    </Button>
                  ) : (
                    <Button
                      className="bg-teal-600 hover:bg-teal-700"
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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200/70 dark:border-slate-700/70 bg-slate-50/70 dark:bg-slate-800/40">
          <DialogTitle className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {editItem ? 'Edit Fee Structure' : 'Add Fee Structure'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmitStructure)} className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <Label>Fee Name *</Label>
            <Input {...form.register('name')} placeholder="e.g. Term 1 Tuition" className="h-11" />
            {form.formState.errors.name && (
              <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Class *</Label>
              <Select value={form.watch('classId')} onValueChange={(v) => form.setValue('classId', v)}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {!editItem && (
                    <SelectItem value={ALL_CLASSES_VALUE}>All Classes</SelectItem>
                  )}
                  {localClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!editItem && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Choose <span className="font-medium">All Classes</span> to apply this structure to all active classes.
                </p>
              )}
            </div>
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
              This will create one fee structure per active class for the selected term.
            </div>
          )}
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 min-w-28" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editItem ? 'Update' : isAllClassesSelected ? 'Create for All' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
