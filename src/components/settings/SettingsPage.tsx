'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Building2 } from 'lucide-react'
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
      {/* School Information */}
      <Card className="shadow-sm border-slate-200/60">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-600" />
            School Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>School Name</Label>
              <Input
                value={settings.school_name}
                onChange={(e) => setSettings({ ...settings, school_name: e.target.value })}
                placeholder="School name"
              />
            </div>
            <div className="space-y-2">
              <Label>School Motto</Label>
              <Input
                value={settings.school_motto}
                onChange={(e) => setSettings({ ...settings, school_motto: e.target.value })}
                placeholder="School motto"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                placeholder="School address"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Email</Label>
              <Input
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder="School email"
                type="email"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Academic Settings */}
      <Card className="shadow-sm border-slate-200/60">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-700">Academic Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Input
                value={settings.academic_year}
                onChange={(e) => setSettings({ ...settings, academic_year: e.target.value })}
                placeholder="2025"
              />
            </div>
            <div className="space-y-2">
              <Label>Current Term</Label>
              <Select
                value={settings.current_term}
                onValueChange={(v) => setSettings({ ...settings, current_term: v })}
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
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={settings.currency}
                onValueChange={(v) => setSettings({ ...settings, currency: v })}
              >
                <SelectTrigger>
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

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          className="bg-teal-600 hover:bg-teal-700 text-white"
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
      </div>
    </div>
  )
}
