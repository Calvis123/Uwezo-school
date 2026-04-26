'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Loader2, Save, Building2, GraduationCap, Globe, CreditCard, Shield, School, Calendar, CheckCircle2, Palette, Bell, Lock, User, Check, MessageSquare, Plus, RefreshCw } from 'lucide-react'
import { authApi, settingsApi, smsApi, termsApi } from '@/lib/api'
import { useAppStore } from '@/lib/store'
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

export function SettingsPage() {
  const { user } = useAppStore()
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'HEADTEACHER'
  const [termRecords, setTermRecords] = useState<any[]>([])
  const [termsLoading, setTermsLoading] = useState(false)
  const [termDialogOpen, setTermDialogOpen] = useState(false)
  const [savingTerm, setSavingTerm] = useState(false)
  const [generatingNextYear, setGeneratingNextYear] = useState(false)
  const [activatingTermId, setActivatingTermId] = useState<string | null>(null)
  const [newTerm, setNewTerm] = useState({
    name: 'Term 1',
    year: String(new Date().getFullYear()),
    startDate: '',
    endDate: '',
    status: 'UPCOMING',
  })
  const [settings, setSettings] = useState({
    school_name: 'Olives School',
    school_motto: 'Nurturing Excellence, Building Futures',
    address: '123 School Road, Nairobi, Kenya',
    phone: '+254 700 123 456',
    email: 'info@olives.co.ke',
    academic_year: '2025',
    current_term: 'Term 1',
    currency: 'KES',
    notifications_enabled: 'true',
    email_alerts_enabled: 'false',
    sms_enabled: 'false',
    sms_provider: 'SIMULATED',
    sms_sender_id: 'OLIVES',
    sms_api_key: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [smsTestPhone, setSmsTestPhone] = useState('')
  const [smsTestMessage, setSmsTestMessage] = useState('Test SMS from Olives School Management System.')
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
    } else {
      setLoading(false)
    }
  }, [isAdmin])

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
                        placeholder="OLIVES"
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
