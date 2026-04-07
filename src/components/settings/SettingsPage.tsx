'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Loader2, Save, Building2, GraduationCap, Globe, CreditCard, Shield, School, Calendar, CheckCircle2, Palette, Bell, Lock, User, Check } from 'lucide-react'
import { settingsApi } from '@/lib/api'
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
  TEACHER: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  PARENT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  TEACHER: 'Teacher',
  PARENT: 'Parent',
}

export function SettingsPage() {
  const { user } = useAppStore()
  const [settings, setSettings] = useState({
    school_name: 'Olives School',
    school_motto: 'Nurturing Excellence, Building Futures',
    address: '123 School Road, Nairobi, Kenya',
    phone: '+254 700 123 456',
    email: 'info@olives.co.ke',
    academic_year: '2025',
    current_term: 'Term 1',
    currency: 'KES',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await settingsApi.get()
      if (res.success && res.data) {
        setSettings({
          school_name: res.data.school_name || settings.school_name,
          school_motto: res.data.school_motto || settings.school_motto,
          address: res.data.address || settings.address,
          phone: res.data.phone || settings.phone,
          email: res.data.email || settings.email,
          academic_year: res.data.academic_year || settings.academic_year,
          current_term: res.data.current_term || settings.current_term,
          currency: res.data.currency || settings.currency,
        })
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
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
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {[
                  { icon: Palette, label: 'Theme', desc: 'System default', bg: 'bg-purple-50 dark:bg-purple-900/30', color: 'text-purple-600 dark:text-purple-400', toggle: false },
                  { icon: Bell, label: 'Notifications', desc: 'Enabled for all events', bg: 'bg-teal-50 dark:bg-teal-900/30', color: 'text-teal-600 dark:text-teal-400', toggle: true, on: true },
                  { icon: Globe, label: 'Language', desc: 'English (default)', bg: 'bg-sky-50 dark:bg-sky-900/30', color: 'text-sky-600 dark:text-sky-400', toggle: false },
                  { icon: Bell, label: 'Email Alerts', desc: 'Payment & attendance alerts', bg: 'bg-amber-50 dark:bg-amber-900/30', color: 'text-amber-600 dark:text-amber-400', toggle: true, on: false },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', item.bg)}>
                      <item.icon className={cn('w-4 h-4', item.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.label}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{item.desc}</p>
                    </div>
                    {item.toggle ? (
                      <button
                        className={cn(
                          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-teal-500 focus-visible:outline-offset-2',
                          item.on ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-600'
                        )}
                        role="switch"
                        aria-checked={item.on ? 'true' : 'false'}
                      >
                        <span
                          className={cn(
                            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out',
                            item.on ? 'translate-x-5' : 'translate-x-0'
                          )}
                        >
                          {item.on && <Check className="w-3 h-3 text-teal-500 m-[3px]" />}
                        </span>
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
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
                {[
                  { icon: Lock, label: 'Password', desc: 'Last changed 30 days ago', bg: 'bg-amber-50 dark:bg-amber-900/30', color: 'text-amber-600 dark:text-amber-400', action: 'Change' },
                  { icon: CreditCard, label: 'Currency', desc: settings.currency === 'KES' ? 'Kenyan Shilling (KES)' : settings.currency, bg: 'bg-emerald-50 dark:bg-emerald-900/30', color: 'text-emerald-600 dark:text-emerald-400', action: null },
                  { icon: Globe, label: 'Region', desc: 'East Africa', bg: 'bg-sky-50 dark:bg-sky-900/30', color: 'text-sky-600 dark:text-sky-400', action: null },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', item.bg)}>
                      <item.icon className={cn('w-4 h-4', item.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.label}</p>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                    {item.action && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                        onClick={() => toast.info('Feature coming soon')}
                      >
                        {item.action}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        className="flex justify-end"
      >
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
      </motion.div>
    </div>
  )
}
