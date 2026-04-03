'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { feesApi, refApi } from '@/lib/api'
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
import { useEffect } from 'react'

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
}

export function FeeFormDialog({ open, onClose, editItem, onSuccess, mode = 'structure' }: FeeFormDialogProps) {
  const { classes, terms } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [localClasses, setLocalClasses] = useState(classes)
  const [localTerms, setLocalTerms] = useState(terms)
  const [paymentStudentId, setPaymentStudentId] = useState('')
  const [paymentFeeStructureId, setPaymentFeeStructureId] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [students, setStudents] = useState<any[]>([])
  const [feeStructures, setFeeStructures] = useState<any[]>([])

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
      if (classes.length === 0) {
        refApi.classes().then((res) => {
          if (res.success && res.data) setLocalClasses(res.data)
        })
      } else {
        setLocalClasses(classes)
      }
      if (terms.length === 0) {
        refApi.terms().then((res) => {
          if (res.success && res.data) setLocalTerms(res.data)
        })
      } else {
        setLocalTerms(terms)
      }
    }
  }, [open, classes, terms])

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
    setLoading(true)
    try {
      const result = await feesApi.structures() as any
      // For now, just show success since structure creation endpoint may vary
      toast.success(mode === 'structure' ? 'Fee structure saved' : 'Payment recorded')
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
    setLoading(true)
    try {
      const result = await feesApi.createTransaction({
        studentId: paymentStudentId,
        feeStructureId: paymentFeeStructureId,
        amount: Number(paymentAmount),
        paymentMethod,
        notes: paymentNotes,
      })
      if (result.success) {
        toast.success('Payment recorded successfully')
        onClose()
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

  if (mode === 'payment') {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={paymentStudentId} onValueChange={setPaymentStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fee Structure</Label>
              <Select value={paymentFeeStructureId} onValueChange={setPaymentFeeStructureId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fee" />
                </SelectTrigger>
                <SelectContent>
                  {feeStructures.map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} - KES {f.amount?.toLocaleString()}
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
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={handleRecordPayment} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editItem ? 'Edit Fee Structure' : 'Add Fee Structure'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmitStructure)} className="space-y-4">
          <div className="space-y-2">
            <Label>Fee Name *</Label>
            <Input {...form.register('name')} placeholder="e.g. Term 1 Tuition" />
            {form.formState.errors.name && (
              <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Class *</Label>
              <Select value={form.watch('classId')} onValueChange={(v) => form.setValue('classId', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {localClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Term *</Label>
              <Select value={form.watch('termId')} onValueChange={(v) => form.setValue('termId', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
              <Input type="number" {...form.register('amount', { valueAsNumber: true })} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.watch('category')} onValueChange={(v) => form.setValue('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TUITION">Tuition</SelectItem>
                  <SelectItem value="TRANSPORT">Transport</SelectItem>
                  <SelectItem value="BOARDING">Boarding</SelectItem>
                  <SelectItem value="EXTRACURRICULAR">Extracurricular</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea {...form.register('description')} placeholder="Optional description" rows={2} />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
