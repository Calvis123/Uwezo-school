'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Bus, Loader2 } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { studentsApi, refApi, transportApi } from '@/lib/api'
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

interface TransportBusOption {
  id: string
  busNumber: string
  routeName: string
  capacity: number
  currentStudents: number
  status: string
}

const transportModeOptions = [
  { value: 'TWO_WAY_WITHIN_KAPSOYA', label: 'Two way - Within Kapsoya' },
  { value: 'TWO_WAY_OUTSIDE_KAPSOYA', label: 'Two way - Outside Kapsoya' },
  { value: 'ONE_WAY_MORNING', label: 'One way morning - half of Within Kapsoya' },
  { value: 'ONE_WAY_EVENING', label: 'One way evening - half of Within Kapsoya' },
]

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
  const [transportBuses, setTransportBuses] = useState<TransportBusOption[]>([])
  const [transportLoading, setTransportLoading] = useState(false)
  const [selectedBusId, setSelectedBusId] = useState('')
  const [selectedTransportMode, setSelectedTransportMode] = useState('TWO_WAY_WITHIN_KAPSOYA')

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
    if (!open) return
    setTransportLoading(true)
    transportApi.list({ status: 'ACTIVE' })
      .then((res) => {
        if (res.success && res.data) {
          setTransportBuses(res.data || [])
        } else {
          setTransportBuses([])
        }
      })
      .catch(() => setTransportBuses([]))
      .finally(() => setTransportLoading(false))
  }, [open])

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
      setSelectedBusId(editStudent.transportInfo?.bus?.id || '')
      setSelectedTransportMode(editStudent.transportInfo?.transportMode || 'TWO_WAY_WITHIN_KAPSOYA')
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
      setSelectedBusId('')
      setSelectedTransportMode('TWO_WAY_WITHIN_KAPSOYA')
    }
  }, [editStudent, form, open])

  const studentType = form.watch('studentType')
  const usesTransport = form.watch('usesTransport')

  useEffect(() => {
    if (studentType === 'BOARDING' && form.getValues('usesTransport')) {
      form.setValue('usesTransport', false)
      setSelectedBusId('')
    }
  }, [studentType, form])

  useEffect(() => {
    if (!usesTransport) {
      setSelectedBusId('')
      setSelectedTransportMode('TWO_WAY_WITHIN_KAPSOYA')
    }
  }, [usesTransport])

  const onSubmit = async (data: StudentFormData) => {
    if (data.studentType === 'DAY' && data.usesTransport && !selectedBusId) {
      toast.error('Select the student bus route')
      return
    }

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
        const studentId = editStudent?.id || result.data?.id
        if (studentId && data.studentType === 'DAY' && data.usesTransport) {
          if (!selectedBusId) {
            toast.error('Select the student bus route')
            setLoading(false)
            return
          }
          const assignmentResult = await transportApi.assignStudent({
            studentId,
            busId: selectedBusId,
            transportMode: selectedTransportMode,
          })
          if (!assignmentResult.success) {
            toast.error(assignmentResult.error || 'Student saved, but route assignment failed')
            setLoading(false)
            return
          }
        } else if (editStudent?.transportInfo?.assignmentId) {
          await transportApi.removeAssignment(editStudent.transportInfo.assignmentId)
        }

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

          {studentType === 'DAY' && usesTransport && (
            <div className="rounded-lg border border-teal-100 bg-teal-50/50 p-3.5 space-y-3 dark:border-teal-900/40 dark:bg-teal-950/20">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-md bg-white flex items-center justify-center text-teal-700 dark:bg-slate-900 dark:text-teal-300">
                  <Bus className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">School Bus Route</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Choose the assigned route and fee group for this transport student.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Bus / Route *</Label>
                  <Select value={selectedBusId} onValueChange={setSelectedBusId}>
                    <SelectTrigger className="bg-white dark:bg-slate-900">
                      <SelectValue placeholder={transportLoading ? 'Loading routes...' : 'Select bus route'} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {transportBuses.map((bus) => (
                        <SelectItem key={bus.id} value={bus.id}>
                          {bus.busNumber} - {bus.routeName} ({bus.currentStudents}/{bus.capacity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!transportLoading && transportBuses.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">No active bus routes found.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Transport Use *</Label>
                  <Select value={selectedTransportMode} onValueChange={setSelectedTransportMode}>
                    <SelectTrigger className="bg-white dark:bg-slate-900">
                      <SelectValue placeholder="Select transport use" />
                    </SelectTrigger>
                    <SelectContent>
                      {transportModeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
