'use client'

import { useMemo, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Loader2, Save, Building2, GraduationCap, Globe, CreditCard, Shield, School, Calendar, CheckCircle2, Palette, Bell, Lock, User, Check, MessageSquare, Plus, RefreshCw, Pencil, Trash2, Layers3, X } from 'lucide-react'
import { authApi, settingsApi, smsApi, termsApi, usersApi } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { readJson } from '@/lib/read-json'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  ADMIN: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  HEADTEACHER: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  TEACHER: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  PARENT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  HEADTEACHER: 'Headteacher',
  DOS: 'Director of Studies',
  TEACHER: 'Teacher',
  SECRETARY: 'Secretary',
  BURSAR: 'Bursar',
  PARENT: 'Parent',
}

const CLASS_LEVEL_OPTIONS = [
  { value: 'PP1', label: 'PP1' },
  { value: 'PP2', label: 'PP2' },
  { value: 'GRADE_1', label: 'Grade 1' },
  { value: 'GRADE_2', label: 'Grade 2' },
  { value: 'GRADE_3', label: 'Grade 3' },
  { value: 'GRADE_4', label: 'Grade 4' },
  { value: 'GRADE_5', label: 'Grade 5' },
  { value: 'GRADE_6', label: 'Grade 6' },
  { value: 'GRADE_7', label: 'Grade 7' },
  { value: 'GRADE_8', label: 'Grade 8' },
  { value: 'GRADE_9', label: 'Grade 9' },
]

const CLASS_STREAM_OPTIONS = ['A', 'B', 'C']

type SettingsClassItem = {
  id: string
  name: string
  level: string
  stream?: string | null
  teacherId?: string | null
  capacity?: number
  status: string
  studentCount: number
}

type SettingsClassGroup = {
  key: string
  name: string
  level: string
  classes: SettingsClassItem[]
}

type TeacherOption = {
  id: string
  name: string
  email?: string
}

type ClassFormState = {
  name: string
  level: string
  stream: string
  teacherId: string
  capacity: string
  status: string
}

const getBaseClassName = (item: SettingsClassItem) => {
  const stream = item.stream?.trim()
  if (!stream) return item.name

  return item.name.replace(new RegExp(`\\s+${stream}$`, 'i'), '')
}

const getClassStreamLabel = (item: SettingsClassItem) => {
  return item.stream || 'No stream'
}

const getClassLevelValue = (item: SettingsClassItem) => {
  const baseName = getBaseClassName(item).toLowerCase()
  if (baseName.includes('pp1') || baseName.includes('pre-primary 1')) return 'PP1'
  if (baseName.includes('pp2') || baseName.includes('pre-primary 2')) return 'PP2'

  const gradeMatch = baseName.match(/grade\s*([1-9])/)
  if (gradeMatch) return `GRADE_${gradeMatch[1]}`

  return item.level
}

const getClassLevelLabel = (item: SettingsClassItem) => {
  const levelValue = getClassLevelValue(item)
  return CLASS_LEVEL_OPTIONS.find((option) => option.value === levelValue)?.label || levelValue
}

export function SettingsPage() {
  const { user } = useAppStore()
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'HEADTEACHER'
  const canManageClasses = user?.role === 'SUPER_ADMIN'
  const [termRecords, setTermRecords] = useState<any[]>([])
  const [classRecords, setClassRecords] = useState<SettingsClassItem[]>([])
  const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([])
  const [termsLoading, setTermsLoading] = useState(false)
  const [classesLoading, setClassesLoading] = useState(false)
  const [termDialogOpen, setTermDialogOpen] = useState(false)
  const [classDialogOpen, setClassDialogOpen] = useState(false)
  const [savingTerm, setSavingTerm] = useState(false)
  const [savingClass, setSavingClass] = useState(false)
  const [inlineSavingId, setInlineSavingId] = useState<string | null>(null)
  const [generatingNextYear, setGeneratingNextYear] = useState(false)
  const [activatingTermId, setActivatingTermId] = useState<string | null>(null)
  const [editingClassId, setEditingClassId] = useState<string | null>(null)
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null)
  const [selectedClassByGroup, setSelectedClassByGroup] = useState<Record<string, string>>({})
  const [classSearch, setClassSearch] = useState('')
  const [newTerm, setNewTerm] = useState({
    name: 'Term 1',
    year: String(new Date().getFullYear()),
    startDate: '',
    endDate: '',
    status: 'UPCOMING',
  })
  const [classForm, setClassForm] = useState<ClassFormState>({
    name: '',
    level: 'GRADE_1',
    stream: '',
    teacherId: '',
    capacity: '40',
    status: 'ACTIVE',
  })
  const [inlineClassForm, setInlineClassForm] = useState<ClassFormState | null>(null)
  const [settings, setSettings] = useState({
    school_name: 'Uwezo School',
    school_motto: 'Nurturing Excellence, Building Futures',
    address: '123 School Road, Nairobi, Kenya',
    phone: '+254 700 123 456',
    email: 'info@uwezoschool.co.ke',
    academic_year: '2025',
    current_term: 'Term 1',
    currency: 'KES',
    notifications_enabled: 'true',
    email_alerts_enabled: 'false',
    sms_enabled: 'false',
    sms_provider: 'SIMULATED',
    sms_sender_id: 'UWEZOSCHOOL',
    sms_api_key: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [smsTestPhone, setSmsTestPhone] = useState('')
  const [smsTestMessage, setSmsTestMessage] = useState('Test SMS from Uwezo School Management System.')
  const [smsSending, setSmsSending] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    if (isAdmin) {
      loadSettings()
      loadTermRecords()
      if (canManageClasses) {
        loadTeacherOptions()
        loadClassRecords()
      }
    } else {
      setLoading(false)
    }
  }, [isAdmin, canManageClasses])

  const loadTermRecords = async () => {
    setTermsLoading(true)
    try {
      const res = await termsApi.list()
      if (res.success && res.data) {
        setTermRecords(Array.isArray(res.data) ? res.data : [])
      } else {
        setTermRecords([])
      }
    } catch {
      setTermRecords([])
    } finally {
      setTermsLoading(false)
    }
  }

  const loadClassRecords = async () => {
    setClassesLoading(true)
    try {
      const res = await fetch('/api/classes')
      const data = await readJson<any>(res)
      if (data.success && data.data) {
        setClassRecords(Array.isArray(data.data) ? data.data : [])
      } else {
        setClassRecords([])
      }
    } catch {
      setClassRecords([])
    } finally {
      setClassesLoading(false)
    }
  }

  const loadTeacherOptions = async () => {
    try {
      const res = await usersApi.list({ role: 'TEACHER', limit: 200, status: 'ACTIVE' })
      if (res.success && res.data) {
        setTeacherOptions((res.data.items || []).map((teacher: any) => ({
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
        })))
      } else {
        setTeacherOptions([])
      }
    } catch {
      setTeacherOptions([])
    }
  }

  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await settingsApi.get()
      if (res.success && res.data) {
        setSettings((prev) => ({
          school_name: res.data.school_name ?? prev.school_name,
          school_motto: res.data.school_motto ?? prev.school_motto,
          address: res.data.address ?? prev.address,
          phone: res.data.phone ?? prev.phone,
          email: res.data.email ?? prev.email,
          academic_year: res.data.academic_year ?? prev.academic_year,
          current_term: res.data.current_term ?? prev.current_term,
          currency: res.data.currency ?? prev.currency,
          notifications_enabled: res.data.notifications_enabled ?? prev.notifications_enabled,
          email_alerts_enabled: res.data.email_alerts_enabled ?? prev.email_alerts_enabled,
          sms_enabled: res.data.sms_enabled ?? prev.sms_enabled,
          sms_provider: res.data.sms_provider ?? prev.sms_provider,
          sms_sender_id: res.data.sms_sender_id ?? prev.sms_sender_id,
          sms_api_key: res.data.sms_api_key ?? prev.sms_api_key,
        }))
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!isAdmin) {
      toast.error('Only admins can update system settings')
      return
    }
    setSaving(true)
    try {
      const res = await settingsApi.update(settings)
      if (res.success) {
        toast.success('Settings saved successfully', {
          description: 'Your school configuration has been updated.',
        })
      } else {
        toast.error(res.error || 'Failed to save settings')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateTermRecord = async () => {
    if (!newTerm.name || !newTerm.year || !newTerm.startDate || !newTerm.endDate) {
      toast.error('Please fill all term fields')
      return
    }
    setSavingTerm(true)
    try {
      const res = await termsApi.create({
        name: newTerm.name,
        year: Number(newTerm.year),
        startDate: newTerm.startDate,
        endDate: newTerm.endDate,
        status: newTerm.status as 'UPCOMING' | 'ACTIVE' | 'COMPLETED',
      })
      if (res.success) {
        toast.success('Term record created')
        setTermDialogOpen(false)
        setNewTerm({
          name: 'Term 1',
          year: String(new Date().getFullYear()),
          startDate: '',
          endDate: '',
          status: 'UPCOMING',
        })
        await loadTermRecords()
      } else {
        toast.error(res.error || 'Failed to create term')
      }
    } catch {
      toast.error('Failed to create term')
    } finally {
      setSavingTerm(false)
    }
  }

  const handleGenerateNextYear = async () => {
    const latestYear = termRecords.length > 0
      ? Math.max(...termRecords.map((term: any) => Number(term.year) || 0))
      : new Date().getFullYear()
    setGeneratingNextYear(true)
    try {
      const res = await termsApi.create({
        mode: 'GENERATE_YEAR',
        year: latestYear + 1,
      })
      if (res.success) {
        toast.success(
          `Prepared ${res.data?.createdCount || 0} term(s) for ${res.data?.year || latestYear + 1}`
        )
        await loadTermRecords()
      } else {
        toast.error(res.error || 'Failed to generate next year terms')
      }
    } catch {
      toast.error('Failed to generate next year terms')
    } finally {
      setGeneratingNextYear(false)
    }
  }

  const handleActivateTerm = async (term: any) => {
    setActivatingTermId(term.id)
    try {
      const res = await termsApi.update(term.id, { status: 'ACTIVE' })
      if (res.success) {
        setSettings((prev) => ({
          ...prev,
          academic_year: String(term.year),
          current_term: String(term.name),
        }))
        toast.success(`${term.name} ${term.year} is now active`)
        await loadTermRecords()
      } else {
        toast.error(res.error || 'Failed to activate term')
      }
    } catch {
      toast.error('Failed to activate term')
    } finally {
      setActivatingTermId(null)
    }
  }

  const createEmptyClassForm = (): ClassFormState => ({
    name: '',
    level: 'GRADE_1',
    stream: '',
    teacherId: '',
    capacity: '40',
    status: 'ACTIVE',
  })

  const createClassFormFromRecord = (item: SettingsClassItem): ClassFormState => ({
    name: item.name,
    level: getClassLevelValue(item),
    stream: item.stream || '',
    teacherId: item.teacherId || '',
    capacity: String(item.capacity || 40),
    status: item.status || 'ACTIVE',
  })

  const openCreateClassDialog = () => {
    setEditingClassId(null)
    setClassForm({
      ...createEmptyClassForm(),
    })
    setClassDialogOpen(true)
  }

  const openInlineEdit = (item: SettingsClassItem) => {
    setEditingClassId(item.id)
    setInlineClassForm(createClassFormFromRecord(item))
  }

  const cancelInlineEdit = () => {
    setEditingClassId(null)
    setInlineClassForm(null)
  }

  const updateClassRecord = async (id: string | null, form: ClassFormState) => {
    const payload = {
      name: form.name.trim(),
      level: form.level,
      stream: form.stream.trim() || null,
      teacherId: form.teacherId || null,
      capacity: Number(form.capacity || 40),
      status: form.status,
    }

    const url = id ? `/api/classes/${id}` : '/api/classes'
    const method = id ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    return readJson<any>(res)
  }

  const handleSaveClass = async () => {
    if (!classForm.name.trim()) {
      toast.error('Class name is required')
      return
    }

    setSavingClass(true)
    try {
      const data = await updateClassRecord(null, classForm)
      if (data.success) {
        toast.success('Class created successfully')
        setClassDialogOpen(false)
        setClassForm(createEmptyClassForm())
        await loadClassRecords()
      } else {
        toast.error(data.error || 'Failed to save class')
      }
    } catch {
      toast.error('Failed to save class')
    } finally {
      setSavingClass(false)
    }
  }

  const handleSaveInlineClass = async (classId: string) => {
    if (!inlineClassForm?.name.trim()) {
      toast.error('Class name is required')
      return
    }

    setInlineSavingId(classId)
    try {
      const data = await updateClassRecord(classId, inlineClassForm)
      if (data.success) {
        toast.success('Class updated successfully')
        cancelInlineEdit()
        await loadClassRecords()
      } else {
        toast.error(data.error || 'Failed to update class')
      }
    } catch {
      toast.error('Failed to update class')
    } finally {
      setInlineSavingId(null)
    }
  }

  const handleDeleteClass = async () => {
    if (!deletingClassId) return
    try {
      const res = await fetch(`/api/classes/${deletingClassId}`, { method: 'DELETE' })
      const data = await readJson<any>(res)
      if (data.success) {
        toast.success('Class removed successfully')
        await loadClassRecords()
      } else {
        toast.error(data.error || 'Failed to remove class')
      }
    } catch {
      toast.error('Failed to remove class')
    } finally {
      setDeletingClassId(null)
    }
  }

  const formatDateInput = (value?: string) => {
    if (!value) return '—'
    return new Date(value).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const handleSendTestSms = async () => {
    if (!isAdmin) {
      toast.error('Only admins can send test SMS')
      return
    }
    if (settings.sms_enabled !== 'true') {
      toast.error('Enable SMS first', { description: 'Turn on SMS alerts in Settings before sending a test message.' })
      return
    }
    if (!smsTestPhone.trim() || !smsTestMessage.trim()) {
      toast.error('Phone and message required')
      return
    }

    setSmsSending(true)
    try {
      const res = await smsApi.sendTest(smsTestPhone.trim(), smsTestMessage.trim())
      if (res.success) {
        toast.success('Test SMS queued (simulated)', {
          description: `To: ${res.data?.to || smsTestPhone.trim()}`,
        })
      } else {
        toast.error(res.error || 'Failed to send test SMS')
      }
    } catch {
      toast.error('Failed to send test SMS')
    } finally {
      setSmsSending(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Current and new password are required')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }

    setChangingPassword(true)
    try {
      const res = await authApi.changePassword(currentPassword, newPassword)
      if (res.success) {
        toast.success('Password updated')
        setPasswordDialogOpen(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast.error(res.error || 'Failed to change password')
      }
    } catch {
      toast.error('Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  const userInitials = user?.name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  const availableStreamOptions = useMemo(() => {
    const streamSet = new Set(
      [...CLASS_STREAM_OPTIONS, ...classRecords.map((item) => item.stream || ''), classForm.stream, inlineClassForm?.stream || '']
        .map((stream) => stream.trim())
        .filter(Boolean)
    )
    return Array.from(streamSet).sort((a, b) => a.localeCompare(b))
  }, [classRecords, classForm.stream, inlineClassForm?.stream])

  const filteredClassRecords = useMemo(() => {
    const term = classSearch.trim().toLowerCase()
    if (!term) return classRecords
    return classRecords.filter((cls) => {
      const levelLabel = getClassLevelLabel(cls)
      return [
        cls.name,
        cls.stream || '',
        levelLabel,
      ].some((value) => value.toLowerCase().includes(term))
    })
  }, [classRecords, classSearch])

  const filteredClassGroups = useMemo<SettingsClassGroup[]>(() => {
    const grouped = new Map<string, SettingsClassGroup>()

    filteredClassRecords.forEach((cls) => {
      const baseName = getBaseClassName(cls)
      const levelValue = getClassLevelValue(cls)
      const key = `${levelValue}::${baseName.toLowerCase()}`
      const existing = grouped.get(key)

      if (existing) {
        existing.classes.push(cls)
      } else {
        grouped.set(key, {
          key,
          name: baseName,
          level: levelValue,
          classes: [cls],
        })
      }
    })

    return Array.from(grouped.values()).map((group) => ({
      ...group,
      classes: [...group.classes].sort((a, b) => {
        const aStream = a.stream || ''
        const bStream = b.stream || ''
        return aStream.localeCompare(bStream, undefined, { numeric: true, sensitivity: 'base' })
      }),
    }))
  }, [filteredClassRecords])

  const activeClassCount = classRecords.filter((cls) => cls.status === 'ACTIVE').length
  const activeStreamCount = new Set(classRecords.map((cls) => (cls.stream || '').trim()).filter(Boolean)).size
  const teacherLookup = useMemo(
    () => Object.fromEntries(teacherOptions.map((teacher) => [teacher.id, teacher.name])),
    [teacherOptions]
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-600 relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent)]" />
          </div>
          <CardContent className="px-6 pb-5 -mt-10 relative">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <Avatar className="h-20 w-20 ring-4 ring-white dark:ring-slate-800 shadow-lg">
                <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white text-xl font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 pb-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{user?.name || 'User'}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email || 'user@example.com'}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge
                    variant="secondary"
                    className={cn('text-[10px] font-medium', roleColors[user?.role || ''] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300')}
                  >
                    {roleLabels[user?.role || ''] || user?.role || 'User'}
                  </Badge>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">·</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Member
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                onClick={() => toast.info('Profile editing coming soon')}
              >
                <User className="w-3.5 h-3.5 mr-1.5" />
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="flex items-center gap-3"
      >
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-sm">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Settings</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage your school configuration and preferences</p>
        </div>
      </motion.div>

      {/* Settings Grid */}
      {isAdmin ? (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* School Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
          whileHover={{ y: -2 }}
          className="group"
        >
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 border-l-4 border-l-teal-500 hover:shadow-md transition-shadow duration-300 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </div>
                School Information
              </CardTitle>
              <p className="text-xs text-slate-400 dark:text-slate-500 ml-[2.5rem]">Basic details about your school</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-3 rounded-xl bg-gradient-to-br from-teal-50 to-sky-50 dark:from-teal-900/20 dark:to-sky-900/20 border border-teal-100 dark:border-teal-800/40">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-sm flex-shrink-0">
                  <School className="w-7 h-7 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{settings.school_name}</h4>
                  <p className="text-xs text-teal-600 dark:text-teal-400 italic truncate">{settings.school_motto}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {settings.address}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">School Name</Label>
                  <Input
                    value={settings.school_name}
                    onChange={(e) => setSettings({ ...settings, school_name: e.target.value })}
                    placeholder="School name"
                    className="h-9 text-sm bg-white dark:bg-slate-900/50 focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:border-teal-500 transition-all duration-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">School Motto</Label>
                  <Input
                    value={settings.school_motto}
                    onChange={(e) => setSettings({ ...settings, school_motto: e.target.value })}
                    placeholder="School motto"
                    className="h-9 text-sm bg-white dark:bg-slate-900/50 focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:border-teal-500 transition-all duration-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Phone</Label>
                    <Input
                      value={settings.phone}
                      onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                      placeholder="Phone number"
                      className="h-9 text-sm bg-white dark:bg-slate-900/50 focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:border-teal-500 transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Email</Label>
                    <Input
                      value={settings.email}
                      onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                      placeholder="School email"
                      type="email"
                      className="h-9 text-sm bg-white dark:bg-slate-900/50 focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:border-teal-500 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Academic Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.12 }}
          whileHover={{ y: -2 }}
          className="group"
        >
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 border-l-4 border-l-sky-500 hover:shadow-md transition-shadow duration-300 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-sky-50 dark:bg-sky-900/40 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                </div>
                Academic Settings
              </CardTitle>
              <p className="text-xs text-slate-400 dark:text-slate-500 ml-[2.5rem]">Academic year, term, and preferences</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 border border-sky-100 dark:border-sky-800/40">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center shadow-sm flex-shrink-0">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{settings.current_term} · {settings.academic_year}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Active academic period</p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-medium text-green-700 dark:text-green-400">Active</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Academic Year</Label>
                    <Input
                      value={settings.academic_year}
                      onChange={(e) => setSettings({ ...settings, academic_year: e.target.value })}
                      placeholder="2025"
                      className="h-9 text-sm bg-white dark:bg-slate-900/50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:border-sky-500 transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Current Term</Label>
                    <Select
                      value={settings.current_term}
                      onValueChange={(v) => setSettings({ ...settings, current_term: v })}
                    >
                      <SelectTrigger className="h-9 text-sm bg-white dark:bg-slate-900/50 focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 transition-all duration-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Term 1">Term 1</SelectItem>
                        <SelectItem value="Term 2">Term 2</SelectItem>
                        <SelectItem value="Term 3">Term 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Currency</Label>
                  <Select
                    value={settings.currency}
                    onValueChange={(v) => setSettings({ ...settings, currency: v })}
                  >
                    <SelectTrigger className="h-9 text-sm bg-white dark:bg-slate-900/50 focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 transition-all duration-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KES">KES (Kenyan Shilling)</SelectItem>
                      <SelectItem value="USD">USD (US Dollar)</SelectItem>
                      <SelectItem value="UGX">UGX (Ugandan Shilling)</SelectItem>
                      <SelectItem value="TZS">TZS (Tanzanian Shilling)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Term Records */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.14 }}
          whileHover={{ y: -2 }}
          className="group lg:col-span-2"
        >
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow duration-300 rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    Term Records
                  </CardTitle>
                  <p className="text-xs text-slate-400 dark:text-slate-500 ml-[2.5rem]">
                    Add term records and pre-create next year terms so the system updates smoothly.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateNextYear}
                    disabled={generatingNextYear}
                    className="h-8"
                  >
                    {generatingNextYear ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        Generate Next Year
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setTermDialogOpen(true)}
                    className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Add Term
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/70 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <span className="col-span-3">Term</span>
                  <span className="col-span-3">Start</span>
                  <span className="col-span-3">End</span>
                  <span className="col-span-1">Status</span>
                  <span className="col-span-2 text-right">Action</span>
                </div>
                {termsLoading ? (
                  <div className="p-3 space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-10 rounded-lg" />
                    ))}
                  </div>
                ) : termRecords.length === 0 ? (
                  <div className="px-3 py-6 text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-300">No term records available.</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Use Add Term to create one.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {termRecords.map((term: any) => (
                      <div key={term.id} className="grid grid-cols-12 gap-2 px-3 py-2.5 items-center text-sm">
                        <div className="col-span-3">
                          <p className="font-medium text-slate-800 dark:text-slate-100">{term.name} {term.year}</p>
                        </div>
                        <p className="col-span-3 text-slate-600 dark:text-slate-300">{formatDateInput(term.startDate)}</p>
                        <p className="col-span-3 text-slate-600 dark:text-slate-300">{formatDateInput(term.endDate)}</p>
                        <div className="col-span-1">
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-[10px]',
                              term.status === 'ACTIVE' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                              term.status === 'UPCOMING' && 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
                              term.status === 'COMPLETED' && 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            )}
                          >
                            {term.status}
                          </Badge>
                        </div>
                        <div className="col-span-2 flex justify-end">
                          <Button
                            size="sm"
                            variant={term.status === 'ACTIVE' ? 'secondary' : 'outline'}
                            className="h-7 text-[11px]"
                            disabled={term.status === 'ACTIVE' || activatingTermId === term.id}
                            onClick={() => handleActivateTerm(term)}
                          >
                            {activatingTermId === term.id ? 'Activating...' : term.status === 'ACTIVE' ? 'Active' : 'Set Active'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {canManageClasses && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            whileHover={{ y: -2 }}
            className="group lg:col-span-2"
          >
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 border-l-4 border-l-cyan-500 hover:shadow-md transition-shadow duration-300 rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-cyan-50 dark:bg-cyan-900/40 flex items-center justify-center">
                        <Layers3 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      Class & Stream Management
                    </CardTitle>
                    <p className="text-xs text-slate-400 dark:text-slate-500 ml-[2.5rem]">
                      Add, edit, and remove classes available in your school, including stream labels like A, B, or C.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={openCreateClassDialog}
                    className="h-8 bg-cyan-600 hover:bg-cyan-700 text-white"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Add Class
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-cyan-100 bg-cyan-50/80 px-4 py-3 dark:border-cyan-900/40 dark:bg-cyan-950/20">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">Classes</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{classRecords.length}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{activeClassCount} active in the school register</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">Streams</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{activeStreamCount}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {availableStreamOptions.length > 0 ? availableStreamOptions.join(', ') : 'No streams added yet'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600 dark:text-slate-300">Teacher coverage</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {classRecords.filter((cls) => cls.teacherId).length}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Classes currently assigned to a teacher</p>
                  </div>
                </div>

                <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/60 p-3 dark:border-slate-700/70 dark:bg-slate-900/30 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">School class register</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Add a new stream like Grade 6 B, then adjust stream, teacher, capacity, and status directly in the table.
                    </p>
                  </div>
                  <Input
                    value={classSearch}
                    onChange={(e) => setClassSearch(e.target.value)}
                    placeholder="Search class, level, or stream"
                    className="w-full lg:w-72 bg-white dark:bg-slate-950/40"
                  />
                </div>

                <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/70 overflow-hidden">
                  <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    <span className="col-span-3">Class</span>
                    <span className="col-span-2">Level</span>
                    <span className="col-span-2">Stream</span>
                    <span className="col-span-2">Teacher</span>
                    <span className="col-span-1">Capacity</span>
                    <span className="col-span-1">Status</span>
                    <span className="col-span-1 text-right">Action</span>
                  </div>
                  {classesLoading ? (
                    <div className="p-3 space-y-2">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-10 rounded-lg" />
                      ))}
                    </div>
                  ) : filteredClassGroups.length === 0 ? (
                    <div className="px-3 py-6 text-center">
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {classRecords.length === 0 ? 'No classes found.' : 'No classes match your search.'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {classRecords.length === 0 ? 'Create your first class and stream here.' : 'Try a different class name, level, or stream.'}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {filteredClassGroups.map((group) => {
                        const selectedId = selectedClassByGroup[group.key]
                        const cls = group.classes.find((item) => item.id === selectedId) || group.classes[0]
                        const levelLabel = getClassLevelLabel(cls)
                        const isEditing = editingClassId === cls.id && inlineClassForm
                        const teacherName = cls.teacherId ? teacherLookup[cls.teacherId] || 'Assigned teacher' : 'Unassigned'
                        return (
                          <div key={group.key} className="grid grid-cols-12 gap-3 px-4 py-3 items-center text-sm">
                            <div className="col-span-3 min-w-0">
                              {isEditing ? (
                                <Input
                                  value={inlineClassForm.name}
                                  onChange={(e) => setInlineClassForm((prev) => prev ? ({ ...prev, name: e.target.value }) : prev)}
                                  className="h-9 bg-white dark:bg-slate-950/40"
                                />
                              ) : (
                                <>
                                  <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                                    {group.name}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {cls.studentCount} active student{cls.studentCount === 1 ? '' : 's'}
                                  </p>
                                </>
                              )}
                            </div>
                            <div className="col-span-2">
                              {isEditing ? (
                                <Select
                                  value={inlineClassForm.level}
                                  onValueChange={(value) => setInlineClassForm((prev) => prev ? ({ ...prev, level: value }) : prev)}
                                >
                                  <SelectTrigger className="h-9 bg-white dark:bg-slate-950/40">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {CLASS_LEVEL_OPTIONS.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <p className="text-slate-600 dark:text-slate-300">{levelLabel}</p>
                              )}
                            </div>
                            <div className="col-span-2">
                              {isEditing ? (
                                <div className="space-y-1">
                                  <Input
                                    value={inlineClassForm.stream}
                                    onChange={(e) => setInlineClassForm((prev) => prev ? ({ ...prev, stream: e.target.value.toUpperCase() }) : prev)}
                                    placeholder="A, B, C, North..."
                                    className="h-9 bg-white dark:bg-slate-950/40"
                                    list={`stream-options-${cls.id}`}
                                  />
                                  <datalist id={`stream-options-${cls.id}`}>
                                    {availableStreamOptions.map((stream) => (
                                      <option key={stream} value={stream} />
                                    ))}
                                  </datalist>
                                </div>
                              ) : group.classes.length > 1 ? (
                                <Select
                                  value={cls.id}
                                  onValueChange={(value) => setSelectedClassByGroup((current) => ({ ...current, [group.key]: value }))}
                                >
                                  <SelectTrigger className="h-9 w-32 bg-white dark:bg-slate-950/40">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {group.classes.map((streamClass) => (
                                      <SelectItem key={streamClass.id} value={streamClass.id}>
                                        {getClassStreamLabel(streamClass)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  {cls.stream || 'No stream'}
                                </Badge>
                              )}
                            </div>
                            <div className="col-span-2">
                              {isEditing ? (
                                <Select
                                  value={inlineClassForm.teacherId || '__UNASSIGNED__'}
                                  onValueChange={(value) => setInlineClassForm((prev) => prev ? ({ ...prev, teacherId: value === '__UNASSIGNED__' ? '' : value }) : prev)}
                                >
                                  <SelectTrigger className="h-9 bg-white dark:bg-slate-950/40">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__UNASSIGNED__">Unassigned</SelectItem>
                                    {teacherOptions.map((teacher) => (
                                      <SelectItem key={teacher.id} value={teacher.id}>
                                        {teacher.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div>
                                  <p className="text-slate-700 dark:text-slate-200 truncate">{teacherName}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {cls.teacherId ? 'Teacher assigned' : 'Needs assignment'}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="col-span-1">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  min="1"
                                  value={inlineClassForm.capacity}
                                  onChange={(e) => setInlineClassForm((prev) => prev ? ({ ...prev, capacity: e.target.value }) : prev)}
                                  className="h-9 bg-white dark:bg-slate-950/40"
                                />
                              ) : (
                                <p className="text-slate-600 dark:text-slate-300">{cls.capacity || 40}</p>
                              )}
                            </div>
                            <div className="col-span-1">
                              {isEditing ? (
                                <Select
                                  value={inlineClassForm.status}
                                  onValueChange={(value) => setInlineClassForm((prev) => prev ? ({ ...prev, status: value }) : prev)}
                                >
                                  <SelectTrigger className="h-9 bg-white dark:bg-slate-950/40">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    'text-[10px]',
                                    cls.status === 'ACTIVE'
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                  )}
                                >
                                  {cls.status}
                                </Badge>
                              )}
                            </div>
                            <div className="col-span-1 flex justify-end gap-2">
                              {isEditing ? (
                                <>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
                                    onClick={() => handleSaveInlineClass(cls.id)}
                                    disabled={inlineSavingId === cls.id}
                                  >
                                    {inlineSavingId === cls.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8"
                                    onClick={cancelInlineEdit}
                                    disabled={inlineSavingId === cls.id}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8"
                                    onClick={() => openInlineEdit(cls)}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8 text-rose-600 border-rose-200 hover:bg-rose-50 dark:text-rose-300 dark:border-rose-800 dark:hover:bg-rose-900/20"
                                    onClick={() => setDeletingClassId(cls.id)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Appearance & Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.16 }}
          whileHover={{ y: -2 }}
          className="group"
        >
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 border-l-4 border-l-purple-500 hover:shadow-md transition-shadow duration-300 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-900/40 flex items-center justify-center">
                  <Palette className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                Appearance & Notifications
              </CardTitle>
              <p className="text-xs text-slate-400 dark:text-slate-500 ml-[2.5rem]">Customize look and notification preferences</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', 'bg-teal-50 dark:bg-teal-900/30')}>
                    <Bell className={cn('w-4 h-4', 'text-teal-600 dark:text-teal-400')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">In-app Notifications</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Activity, notices, messages, and fees</p>
                  </div>
                  <Switch
                    checked={settings.notifications_enabled === 'true'}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, notifications_enabled: checked ? 'true' : 'false' })
                    }
                  />
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', 'bg-amber-50 dark:bg-amber-900/30')}>
                    <Bell className={cn('w-4 h-4', 'text-amber-600 dark:text-amber-400')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Email Alerts</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Placeholder setting (no email gateway)</p>
                  </div>
                  <Switch
                    checked={settings.email_alerts_enabled === 'true'}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, email_alerts_enabled: checked ? 'true' : 'false' })
                    }
                  />
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', 'bg-sky-50 dark:bg-sky-900/30')}>
                    <MessageSquare className={cn('w-4 h-4', 'text-sky-600 dark:text-sky-400')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">SMS Alerts</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Placeholder SMS integration (simulated)</p>
                  </div>
                  <Switch
                    checked={settings.sms_enabled === 'true'}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, sms_enabled: checked ? 'true' : 'false' })
                    }
                  />
                </div>
              </div>

              {settings.sms_enabled === 'true' && (
                <div className="p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Provider</Label>
                      <Select
                        value={settings.sms_provider}
                        onValueChange={(v) => setSettings({ ...settings, sms_provider: v })}
                      >
                        <SelectTrigger className="h-9 text-sm bg-white dark:bg-slate-900/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SIMULATED">Simulated (local)</SelectItem>
                          <SelectItem value="AFRICASTALKING">Africa's Talking</SelectItem>
                          <SelectItem value="TWILIO">Twilio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Sender ID</Label>
                      <Input
                        value={settings.sms_sender_id}
                        onChange={(e) => setSettings({ ...settings, sms_sender_id: e.target.value })}
                        placeholder="UWEZOSCHOOL"
                        className="h-9 text-sm bg-white dark:bg-slate-900/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">API Key (optional)</Label>
                    <Input
                      value={settings.sms_api_key}
                      onChange={(e) => setSettings({ ...settings, sms_api_key: e.target.value })}
                      placeholder="********"
                      type="password"
                      className="h-9 text-sm bg-white dark:bg-slate-900/50"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Stored in system settings for now. For production, move secrets to environment variables.
                    </p>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Test Phone</Label>
                      <Input
                        value={smsTestPhone}
                        onChange={(e) => setSmsTestPhone(e.target.value)}
                        placeholder="+2547XXXXXXXX or 07XXXXXXXX"
                        className="h-9 text-sm bg-white dark:bg-slate-900/50"
                      />
                    </div>
                    <Button
                      onClick={handleSendTestSms}
                      disabled={smsSending}
                      className="h-9 bg-sky-600 hover:bg-sky-700 text-white"
                    >
                      {smsSending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Test SMS'
                      )}
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Test Message</Label>
                    <Textarea
                      value={smsTestMessage}
                      onChange={(e) => setSmsTestMessage(e.target.value)}
                      className="min-h-[80px] text-sm bg-white dark:bg-slate-900/50"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Security */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          whileHover={{ y: -2 }}
          className="group"
        >
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 border-l-4 border-l-amber-500 hover:shadow-md transition-shadow duration-300 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-900/40 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                Security & Regional
              </CardTitle>
              <p className="text-xs text-slate-400 dark:text-slate-500 ml-[2.5rem]">Security and regional preferences</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', 'bg-amber-50 dark:bg-amber-900/30')}>
                    <Lock className={cn('w-4 h-4', 'text-amber-600 dark:text-amber-400')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Password</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Update your account password</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                    onClick={() => setPasswordDialogOpen(true)}
                  >
                    Change
                  </Button>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', 'bg-emerald-50 dark:bg-emerald-900/30')}>
                    <CreditCard className={cn('w-4 h-4', 'text-emerald-600 dark:text-emerald-400')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Currency</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {settings.currency === 'KES' ? 'Kenyan Shilling (KES)' : settings.currency}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {settings.currency}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', 'bg-sky-50 dark:bg-sky-900/30')}>
                    <Globe className={cn('w-4 h-4', 'text-sky-600 dark:text-sky-400')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Region</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">East Africa</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      ) : (
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-900/40 flex items-center justify-center">
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              Account Settings
            </CardTitle>
            <p className="text-xs text-slate-400 dark:text-slate-500 ml-[2.5rem]">
              System settings are only available to admins.
            </p>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Change Password</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Update your own login password</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setPasswordDialogOpen(true)}
              className="shrink-0"
            >
              Change
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        className="flex justify-end"
      >
        {!isAdmin ? null : (
        <Button
          className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white shadow-sm hover:shadow-md transition-all duration-200"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
        )}
      </motion.div>

      <Dialog open={termDialogOpen} onOpenChange={setTermDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Term Record</DialogTitle>
            <DialogDescription>
              Create a new term entry for the selected academic year.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Term Name</Label>
                <Select
                  value={newTerm.name}
                  onValueChange={(value) => setNewTerm((prev) => ({ ...prev, name: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Term 1">Term 1</SelectItem>
                    <SelectItem value="Term 2">Term 2</SelectItem>
                    <SelectItem value="Term 3">Term 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Year</Label>
                <Input
                  value={newTerm.year}
                  onChange={(e) => setNewTerm((prev) => ({ ...prev, year: e.target.value }))}
                  placeholder="2026"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Start Date</Label>
                <Input
                  type="date"
                  value={newTerm.startDate}
                  onChange={(e) => setNewTerm((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End Date</Label>
                <Input
                  type="date"
                  value={newTerm.endDate}
                  onChange={(e) => setNewTerm((prev) => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select
                value={newTerm.status}
                onValueChange={(value) => setNewTerm((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPCOMING">UPCOMING</SelectItem>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTermDialogOpen(false)}
              disabled={savingTerm}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTermRecord}
              disabled={savingTerm}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {savingTerm ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Term'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Class</DialogTitle>
            <DialogDescription>
              Create a new class entry such as Grade 6 B, then fine-tune it from the register below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Class Name</Label>
              <Input
                value={classForm.name}
                onChange={(e) => setClassForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Grade 6"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Level</Label>
                <Select
                  value={classForm.level}
                  onValueChange={(value) => setClassForm((prev) => ({ ...prev, level: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASS_LEVEL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Stream</Label>
                <Input
                  value={classForm.stream}
                  onChange={(e) => setClassForm((prev) => ({ ...prev, stream: e.target.value.toUpperCase() }))}
                  placeholder="A, B, C, North..."
                  list="settings-class-stream-options"
                />
              </div>
            </div>

            <datalist id="settings-class-stream-options">
              {availableStreamOptions.map((stream) => (
                <option key={stream} value={stream} />
              ))}
            </datalist>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Class Teacher</Label>
                <Select
                  value={classForm.teacherId || '__UNASSIGNED__'}
                  onValueChange={(value) => setClassForm((prev) => ({ ...prev, teacherId: value === '__UNASSIGNED__' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__UNASSIGNED__">Unassigned</SelectItem>
                    {teacherOptions.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Capacity</Label>
                <Input
                  type="number"
                  min="1"
                  value={classForm.capacity}
                  onChange={(e) => setClassForm((prev) => ({ ...prev, capacity: e.target.value }))}
                  placeholder="40"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={classForm.status}
                  onValueChange={(value) => setClassForm((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setClassDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveClass}
              disabled={savingClass}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {savingClass ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Create Class'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingClassId)} onOpenChange={(open) => !open && setDeletingClassId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Class</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the class from the school list. Existing student records will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClass}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Remove Class
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Update your account password. You will remain logged in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Current Password</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Minimum 8 characters.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPasswordDialogOpen(false)}
              disabled={changingPassword}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {changingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
