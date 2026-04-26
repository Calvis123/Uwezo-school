'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { studentsApi, refApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
import { Textarea } from '@/components/ui/textarea'
import { useEffect } from 'react'

const studentSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  gender: z.enum(['MALE', 'FEMALE']),
  studentType: z.enum(['DAY', 'BOARDING']),
  usesTransport: z.boolean(),
  dateOfBirth: z.string().optional(),
  classId: z.string().min(1, 'Class is required'),
  stream: z.string().optional(),
  address: z.string().optional(),
  medicalNotes: z.string().optional(),
  allergies: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  guardianRelationship: z.string().optional(),
})

type StudentFormData = z.infer<typeof studentSchema>

interface StudentFormProps {
  open: boolean
  onClose: () => void
  editStudent?: any | null
  onSuccess?: () => void
}

export function StudentForm({ open, onClose, editStudent, onSuccess }: StudentFormProps) {
  const { classes } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [localClasses, setLocalClasses] = useState(classes)

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      gender: 'MALE',
      studentType: 'DAY',
      usesTransport: false,
      dateOfBirth: '',
      classId: '',
      stream: '',
      address: '',
      medicalNotes: '',
      allergies: '',
      guardianName: '',
      guardianPhone: '',
      guardianRelationship: 'FATHER',
    },
  })

  useEffect(() => {
    if (open && classes.length === 0) {
      refApi.classes().then((res) => {
        if (res.success && res.data) {
          setLocalClasses(res.data)
        }
      })
    }
  }, [open, classes])

  useEffect(() => {
    if (editStudent) {
      form.reset({
        firstName: editStudent.firstName || '',
        lastName: editStudent.lastName || '',
        gender: editStudent.gender || 'MALE',
        studentType: editStudent.studentType || 'DAY',
        usesTransport: Boolean(editStudent.usesTransport),
        dateOfBirth: editStudent.dateOfBirth ? editStudent.dateOfBirth.split('T')[0] : '',
        classId: editStudent.classId || '',
        stream: editStudent.stream || '',
        address: editStudent.address || '',
        medicalNotes: editStudent.medicalNotes || '',
        allergies: editStudent.allergies || '',
        guardianName: editStudent.guardians?.[0]?.guardian?.name || '',
        guardianPhone: editStudent.guardians?.[0]?.guardian?.phone || '',
        guardianRelationship: editStudent.guardians?.[0]?.relationship || 'FATHER',
      })
    } else {
      form.reset({
        firstName: '',
        lastName: '',
        gender: 'MALE',
        studentType: 'DAY',
        usesTransport: false,
        dateOfBirth: '',
        classId: '',
        stream: '',
        address: '',
        medicalNotes: '',
        allergies: '',
        guardianName: '',
        guardianPhone: '',
        guardianRelationship: 'FATHER',
      })
    }
  }, [editStudent, form, open])

  const studentType = form.watch('studentType')

  useEffect(() => {
    if (studentType === 'BOARDING' && form.getValues('usesTransport')) {
      form.setValue('usesTransport', false)
    }
  }, [studentType, form])

  const onSubmit = async (data: StudentFormData) => {
    setLoading(true)
    try {
      const payload = {
        ...data,
        dateOfBirth: data.dateOfBirth || undefined,
      }

      let result
      if (editStudent?.id) {
        result = await studentsApi.update(editStudent.id, payload)
      } else {
        result = await studentsApi.create(payload)
      }

      if (result.success) {
        if (!editStudent && result.data?.parentPortalCredentials?.phone) {
          const creds = result.data.parentPortalCredentials
          toast.success('Student added + parent portal linked', {
            description: creds.isNewAccount
              ? `Parent login phone: ${creds.phone}. Default password: ${creds.password}`
              : `Parent account already exists. Login phone: ${creds.phone}`,
          })
        } else {
          toast.success(editStudent ? 'Student updated successfully' : 'Student added successfully')
        }
        onClose()
        form.reset()
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to save student')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>First Name *</Label>
              <Input {...form.register('firstName')} placeholder="John" />
              {form.formState.errors.firstName && (
                <p className="text-xs text-red-500">{form.formState.errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Last Name *</Label>
              <Input {...form.register('lastName')} placeholder="Doe" />
              {form.formState.errors.lastName && (
                <p className="text-xs text-red-500">{form.formState.errors.lastName.message}</p>
              )}
            </div>
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label>Gender *</Label>
            <RadioGroup
              value={form.watch('gender')}
              onValueChange={(v) => form.setValue('gender', v as 'MALE' | 'FEMALE')}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="MALE" id="male" />
                <Label htmlFor="male" className="cursor-pointer">Male</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="FEMALE" id="female" />
                <Label htmlFor="female" className="cursor-pointer">Female</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Student Type *</Label>
            <Select
              value={studentType}
              onValueChange={(v) => form.setValue('studentType', v as 'DAY' | 'BOARDING')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAY">Day Scholar</SelectItem>
                <SelectItem value="BOARDING">Boarding</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {studentType === 'DAY' && (
            <div className="space-y-2">
              <Label>Uses School Transport? *</Label>
              <Select
                value={form.watch('usesTransport') ? 'YES' : 'NO'}
                onValueChange={(v) => form.setValue('usesTransport', v === 'YES')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YES">Yes, uses school bus</SelectItem>
                  <SelectItem value="NO">No, not using school bus</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date of Birth & Class */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input type="date" {...form.register('dateOfBirth')} />
            </div>
            <div className="space-y-2">
              <Label>Class *</Label>
              <Select
                value={form.watch('classId')}
                onValueChange={(v) => form.setValue('classId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {localClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.classId && (
                <p className="text-xs text-red-500">{form.formState.errors.classId.message}</p>
              )}
            </div>
          </div>

          {/* Stream */}
          <div className="space-y-2">
            <Label>Stream</Label>
            <Input {...form.register('stream')} placeholder="A, B, C" />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea {...form.register('address')} placeholder="Home address" rows={2} />
          </div>

          {/* Medical */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Medical Notes</Label>
              <Input {...form.register('medicalNotes')} placeholder="Any conditions" />
            </div>
            <div className="space-y-2">
              <Label>Allergies</Label>
              <Input {...form.register('allergies')} placeholder="Known allergies" />
            </div>
          </div>

          {/* Guardian Info */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Guardian Information</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 col-span-2">
                <Label>Guardian Name</Label>
                <Input {...form.register('guardianName')} placeholder="Parent name" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input {...form.register('guardianPhone')} placeholder="0712345678" />
              </div>
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Select
                  value={form.watch('guardianRelationship')}
                  onValueChange={(v) => form.setValue('guardianRelationship', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FATHER">Father</SelectItem>
                    <SelectItem value="MOTHER">Mother</SelectItem>
                    <SelectItem value="GUARDIAN">Guardian</SelectItem>
                    <SelectItem value="UNCLE">Uncle</SelectItem>
                    <SelectItem value="AUNT">Aunt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-teal-600 hover:bg-teal-700"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editStudent ? 'Update Student' : 'Add Student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
