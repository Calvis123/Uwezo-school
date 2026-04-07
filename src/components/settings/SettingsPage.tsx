'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Loader2, Save, Building2, GraduationCap, Globe, CreditCard, Shield } from 'lucide-react'
import { settingsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function SettingsPage() {
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
        toast.success('Settings saved successfully')
      } else {
        toast.error(res.error || 'Failed to save settings')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
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

      {/* School Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        whileHover={{ y: -2 }}
        className="group"
      >
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 border-l-4 border-l-teal-500 hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              School Information
            </CardTitle>
            <p className="text-xs text-slate-400 dark:text-slate-500 ml-[2.5rem]">Basic details about your school including name, address, and contact information</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">School Name</Label>
                <Input
                  value={settings.school_name}
                  onChange={(e) => setSettings({ ...settings, school_name: e.target.value })}
                  placeholder="School name"
                  className="bg-white dark:bg-slate-900/50 focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:border-teal-500 transition-all duration-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">School Motto</Label>
                <Input
                  value={settings.school_motto}
                  onChange={(e) => setSettings({ ...settings, school_motto: e.target.value })}
                  placeholder="School motto"
                  className="bg-white dark:bg-slate-900/50 focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:border-teal-500 transition-all duration-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Address</Label>
                <Input
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  placeholder="School address"
                  className="bg-white dark:bg-slate-900/50 focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:border-teal-500 transition-all duration-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Phone</Label>
                <Input
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  placeholder="Phone number"
                  className="bg-white dark:bg-slate-900/50 focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:border-teal-500 transition-all duration-200"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Email</Label>
                <Input
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  placeholder="School email"
                  type="email"
                  className="bg-white dark:bg-slate-900/50 focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:border-teal-500 transition-all duration-200"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Academic Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        whileHover={{ y: -2 }}
        className="group"
      >
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 border-l-4 border-l-sky-500 hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-sky-50 dark:bg-sky-900/40 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
              Academic Settings
            </CardTitle>
            <p className="text-xs text-slate-400 dark:text-slate-500 ml-[2.5rem]">Configure the current academic year, term, and other academic preferences</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Academic Year</Label>
                <Input
                  value={settings.academic_year}
                  onChange={(e) => setSettings({ ...settings, academic_year: e.target.value })}
                  placeholder="2025"
                  className="bg-white dark:bg-slate-900/50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:border-sky-500 transition-all duration-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Current Term</Label>
                <Select
                  value={settings.current_term}
                  onValueChange={(v) => setSettings({ ...settings, current_term: v })}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-900/50 focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 transition-all duration-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Term 1">Term 1</SelectItem>
                    <SelectItem value="Term 2">Term 2</SelectItem>
                    <SelectItem value="Term 3">Term 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Currency</Label>
                <Select
                  value={settings.currency}
                  onValueChange={(v) => setSettings({ ...settings, currency: v })}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-900/50 focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 transition-all duration-200">
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

      {/* Contact & Regional Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        whileHover={{ y: -2 }}
        className="group"
      >
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 border-l-4 border-l-amber-500 hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-900/40 flex items-center justify-center">
                <Globe className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              Contact & Regional
            </CardTitle>
            <p className="text-xs text-slate-400 dark:text-slate-500 ml-[2.5rem]">Regional preferences including currency, timezone, and language settings</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Currency Symbol</Label>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{settings.currency === 'KES' ? 'Kenyan Shilling (KES)' : settings.currency === 'USD' ? 'US Dollar (USD)' : settings.currency === 'UGX' ? 'Ugandan Shilling (UGX)' : 'Tanzanian Shilling (TZS)'}</p>
                    <p className="text-xs text-slate-400">Set in Academic Settings above</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">School Region</Label>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">East Africa</p>
                    <p className="text-xs text-slate-400">Based on school address</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="flex justify-end"
      >
        <Button
          className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white shadow-sm hover:shadow-md transition-all duration-200"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Settings
        </Button>
      </motion.div>
    </div>
  )
}
