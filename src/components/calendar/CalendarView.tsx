'use client'

import { useState, useEffect } from 'react'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin,
  Clock,
  Users,
  X,
  Trash2,
  Edit3,
  CalendarDays,
  GraduationCap,
  Trophy,
  Mic2,
  Palette,
  Briefcase,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
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
import { calendarApi } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'

// ==================== Types ====================
interface CalendarEvent {
  id: string
  title: string
  description: string | null
  startDate: string
  endDate: string | null
  startTime: string | null
  endTime: string | null
  location: string | null
  eventType: string
  targetRoles: string
  isAllDay: boolean
  color: string
  createdAt: string
  updatedAt: string
}

// ==================== Constants ====================
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string; icon: any; bg: string; badge: string }> = {
  EVENT: { label: 'Event', color: 'teal', icon: CalendarDays, bg: 'bg-teal-500', badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
  HOLIDAY: { label: 'Holiday', color: 'amber', icon: Briefcase, bg: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  EXAM: { label: 'Exam', color: 'red', icon: GraduationCap, bg: 'bg-red-500', badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  MEETING: { label: 'Meeting', color: 'blue', icon: Users, bg: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  SPORTS: { label: 'Sports', color: 'green', icon: Trophy, bg: 'bg-green-500', badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  CULTURAL: { label: 'Cultural', color: 'purple', icon: Palette, bg: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
}

const COLOR_OPTIONS = [
  { value: 'teal', label: 'Teal', className: 'bg-teal-500' },
  { value: 'amber', label: 'Amber', className: 'bg-amber-500' },
  { value: 'red', label: 'Red', className: 'bg-red-500' },
  { value: 'blue', label: 'Blue', className: 'bg-blue-500' },
  { value: 'purple', label: 'Purple', className: 'bg-purple-500' },
  { value: 'green', label: 'Green', className: 'bg-green-500' },
]

const TARGET_ROLE_OPTIONS = [
  { value: 'ALL', label: 'Everyone' },
  { value: 'TEACHERS', label: 'Teachers' },
  { value: 'PARENTS', label: 'Parents' },
  { value: 'STUDENTS', label: 'Students' },
  { value: 'STAFF', label: 'Staff' },
]

// ==================== Helpers ====================
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}

function isDateInRange(date: Date, start: Date, end?: Date | null): boolean {
  if (isSameDay(date, start)) return true
  if (end && date >= start && date <= end) {
    const endDay = new Date(end)
    endDay.setHours(23, 59, 59)
    return date <= endDay
  }
  return false
}

function getColorClasses(color: string): { dot: string; ring: string; bg: string; border: string } {
  const map: Record<string, { dot: string; ring: string; bg: string; border: string }> = {
    teal: { dot: 'bg-teal-500', ring: 'ring-teal-200 dark:ring-teal-800', bg: 'bg-teal-50 dark:bg-teal-900/30', border: 'border-teal-200 dark:border-teal-800' },
    amber: { dot: 'bg-amber-500', ring: 'ring-amber-200 dark:ring-amber-800', bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-800' },
    red: { dot: 'bg-red-500', ring: 'ring-red-200 dark:ring-red-800', bg: 'bg-red-50 dark:bg-red-900/30', border: 'border-red-200 dark:border-red-800' },
    blue: { dot: 'bg-blue-500', ring: 'ring-blue-200 dark:ring-blue-800', bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-800' },
    purple: { dot: 'bg-purple-500', ring: 'ring-purple-200 dark:ring-purple-800', bg: 'bg-purple-50 dark:bg-purple-900/30', border: 'border-purple-200 dark:border-purple-800' },
    green: { dot: 'bg-green-500', ring: 'ring-green-200 dark:ring-green-800', bg: 'bg-green-50 dark:bg-green-900/30', border: 'border-green-200 dark:border-green-800' },
  }
  return map[color] || map.teal
}

// ==================== Event Form Dialog ====================
function EventFormDialog({
  open,
  onClose,
  onSubmit,
  editEvent,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  editEvent: CalendarEvent | null
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    location: '',
    eventType: 'EVENT',
    targetRoles: 'ALL',
    isAllDay: true,
    color: 'teal',
  })
  const [saving, setSaving] = useState(false)

  // Derive form from editEvent (no effect needed)
  const currentForm = editEvent
    ? {
        title: editEvent.title,
        description: editEvent.description || '',
        startDate: formatDate(new Date(editEvent.startDate)),
        endDate: editEvent.endDate ? formatDate(new Date(editEvent.endDate)) : '',
        startTime: editEvent.startTime || '',
        endTime: editEvent.endTime || '',
        location: editEvent.location || '',
        eventType: editEvent.eventType,
        targetRoles: editEvent.targetRoles,
        isAllDay: editEvent.isAllDay,
        color: editEvent.color,
      }
    : {
        title: '',
        description: '',
        startDate: formatDate(new Date()),
        endDate: '',
        startTime: '',
        endTime: '',
        location: '',
        eventType: 'EVENT',
        targetRoles: 'ALL',
        isAllDay: true,
        color: 'teal',
      }

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.startDate) return
    setSaving(true)
    await onSubmit(form)
    setSaving(false)
    onClose()
  }

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <CalendarIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            {editEvent ? 'Edit Event' : 'Add New Event'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="event-title" className="text-slate-700 dark:text-slate-300">Title *</Label>
            <Input
              id="event-title"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Event title..."
              className="dark:bg-slate-800 dark:border-slate-700"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="event-desc" className="text-slate-700 dark:text-slate-300">Description</Label>
            <Textarea
              id="event-desc"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Event description..."
              rows={2}
              className="dark:bg-slate-800 dark:border-slate-700"
            />
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-slate-700 dark:text-slate-300">All Day Event</Label>
            <Switch checked={form.isAllDay} onCheckedChange={(v) => update('isAllDay', v)} />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="event-start" className="text-slate-700 dark:text-slate-300">Start Date *</Label>
              <Input
                id="event-start"
                type="date"
                value={form.startDate}
                onChange={(e) => update('startDate', e.target.value)}
                className="dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-end" className="text-slate-700 dark:text-slate-300">End Date</Label>
              <Input
                id="event-end"
                type="date"
                value={form.endDate}
                onChange={(e) => update('endDate', e.target.value)}
                min={form.startDate}
                className="dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
          </div>

          {/* Time */}
          {!form.isAllDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="event-start-time" className="text-slate-700 dark:text-slate-300">Start Time</Label>
                <Input
                  id="event-start-time"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => update('startTime', e.target.value)}
                  className="dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end-time" className="text-slate-700 dark:text-slate-300">End Time</Label>
                <Input
                  id="event-end-time"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => update('endTime', e.target.value)}
                  className="dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
            </div>
          )}

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="event-location" className="text-slate-700 dark:text-slate-300">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="event-location"
                value={form.location}
                onChange={(e) => update('location', e.target.value)}
                placeholder="Event location..."
                className="pl-9 dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
          </div>

          {/* Event Type & Target */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Event Type</Label>
              <Select value={form.eventType} onValueChange={(v) => update('eventType', v)}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_TYPE_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', cfg.bg)} />
                        {cfg.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Audience</Label>
              <Select value={form.targetRoles} onValueChange={(v) => update('targetRoles', v)}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-300">Color</Label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => update('color', c.value)}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all duration-200',
                    c.className,
                    form.color === c.value
                      ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-slate-400 scale-110'
                      : 'opacity-60 hover:opacity-100 hover:scale-105'
                  )}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.title.trim() || !form.startDate || saving}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {saving ? 'Saving...' : editEvent ? 'Update Event' : 'Create Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==================== Event Card ====================
function EventCard({
  event,
  onClick,
}: {
  event: CalendarEvent
  onClick?: () => void
}) {
  const config = EVENT_TYPE_CONFIG[event.eventType] || EVENT_TYPE_CONFIG.EVENT
  const Icon = config.icon
  const colorClasses = getColorClasses(event.color)

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={cn(
        'p-3 rounded-lg border cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:scale-[1.01] active:scale-[0.99]',
        'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700',
        'hover:border-slate-300 dark:hover:border-slate-600'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('w-1 self-stretch rounded-full flex-shrink-0', colorClasses.bg)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{event.title}</h4>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 font-medium', config.badge)}>
              <Icon className="w-3 h-3 mr-1" />
              {config.label}
            </Badge>
            {event.isAllDay ? (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                All day
              </span>
            ) : event.startTime ? (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {event.startTime}
                {event.endTime ? ` - ${event.endTime}` : ''}
              </span>
            ) : null}
            {event.location && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {event.location}
              </span>
            )}
          </div>
          {event.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">{event.description}</p>
          )}
          {event.endDate && event.startDate !== event.endDate && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              {formatDisplayDate(event.startDate)} — {formatDisplayDate(event.endDate)}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ==================== Upcoming Events ====================
function UpcomingEvents({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) return null

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
        <CalendarIcon className="w-4 h-4 text-teal-600 dark:text-teal-400" />
        Upcoming Events
      </h3>
      <div className="space-y-2">
        {events.slice(0, 5).map((event) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:shadow-sm transition-shadow cursor-pointer"
          >
            <div className={cn('w-1 h-10 rounded-full flex-shrink-0', getColorClasses(event.color).bg)} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{event.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {formatDisplayDate(event.startDate)}
                </span>
                <Badge variant="secondary" className={cn('text-[9px] px-1 py-0', EVENT_TYPE_CONFIG[event.eventType]?.badge || EVENT_TYPE_CONFIG.EVENT.badge)}>
                  {EVENT_TYPE_CONFIG[event.eventType]?.label || 'Event'}
                </Badge>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ==================== Main Calendar View ====================
export function CalendarView() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('ALL')

  // Fetch events
  const fetchEvents = async (month?: number, year?: number, type?: string) => {
    setLoading(true)
    const m = month ?? currentMonth + 1
    const y = year ?? currentYear
    const t = type ?? eventTypeFilter
    const res = await calendarApi.list(m, y, t)
    if (res.success && res.data) {
      setEvents(res.data)
      // Filter upcoming events from now
      const now = new Date()
      const upcoming = (res.data as CalendarEvent[]).filter(e => new Date(e.startDate) >= now)
      setUpcomingEvents(upcoming.slice(0, 5))
    }
    setLoading(false)
  }

  // Load events when month/year/filter changes
  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    ;(async () => {
      setLoading(true)
      const res = await calendarApi.list(currentMonth + 1, currentYear, eventTypeFilter)
      if (!cancelled && res.success && res.data) {
        setEvents(res.data)
        const now = new Date()
        const upcoming = (res.data as CalendarEvent[]).filter(e => new Date(e.startDate) >= now)
        setUpcomingEvents(upcoming.slice(0, 5))
      }
      if (!cancelled) setLoading(false)
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [currentMonth, currentYear, eventTypeFilter])

  // Navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(prev => prev - 1)
    } else {
      setCurrentMonth(prev => prev - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(prev => prev + 1)
    } else {
      setCurrentMonth(prev => prev + 1)
    }
  }

  const goToToday = () => {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
    setSelectedDate(today)
  }

  // Build calendar grid (computed inline — fast enough without useMemo)
  const startDayOfWeek = (() => {
    const fd = new Date(currentYear, currentMonth, 1).getDay() - 1
    return fd < 0 ? 6 : fd
  })()
  const calendarDays = (() => {
    const dim = new Date(currentYear, currentMonth + 1, 0).getDate()
    const days: (number | null)[] = []
    for (let i = 0; i < startDayOfWeek; i++) days.push(null)
    for (let d = 1; d <= dim; d++) days.push(d)
    return days
  })()

  // Events for a specific day
  const getEventsForDay = (day: number): CalendarEvent[] => {
    const date = new Date(currentYear, currentMonth, day)
    return events.filter(event => isDateInRange(date, new Date(event.startDate), event.endDate ? new Date(event.endDate) : null))
  }

  // Selected day events
  const selectedDayEvents = (() => {
    if (!selectedDate) return []
    return events.filter(event => isDateInRange(selectedDate, new Date(event.startDate), event.endDate ? new Date(event.endDate) : null))
  })()

  // CRUD handlers
  const handleCreate = async (formData: any) => {
    const res = await calendarApi.create(formData)
    if (res.success) {
      fetchEvents()
    }
  }

  const handleUpdate = async (formData: any) => {
    if (!editEvent) return
    const res = await calendarApi.update(editEvent.id, formData)
    if (res.success) {
      setEditEvent(null)
      fetchEvents()
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const res = await calendarApi.delete(deleteId)
    if (res.success) {
      setDeleteId(null)
      fetchEvents()
    }
  }

  // Today check
  const isToday = (day: number) =>
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear()

  const isSelectedDay = (day: number) =>
    selectedDate &&
    day === selectedDate.getDate() &&
    currentMonth === selectedDate.getMonth() &&
    currentYear === selectedDate.getFullYear()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">School Calendar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {events.length} event{events.length !== 1 ? 's' : ''} in {MONTHS[currentMonth]} {currentYear}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="w-[150px] h-9 text-sm dark:bg-slate-800 dark:border-slate-700">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              {Object.entries(EVENT_TYPE_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', cfg.bg)} />
                    {cfg.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => { setEditEvent(null); setShowAddDialog(true) }}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Event</span>
          </Button>
        </div>
      </div>

      {/* Upcoming Events */}
      {!loading && <UpcomingEvents events={upcomingEvents} />}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar Grid */}
        <div className="flex-1">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {/* Month Navigation */}
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8 dark:bg-slate-800 dark:border-slate-700">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 min-w-[180px] text-center">
                  {MONTHS[currentMonth]} {currentYear}
                </h2>
                <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8 dark:bg-slate-800 dark:border-slate-700">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={goToToday}
                className="h-8 text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
              >
                Today
              </Button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/50">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/50"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            {loading ? (
              <div className="grid grid-cols-7">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="border border-slate-50 dark:border-slate-800/50 p-2 min-h-[80px]">
                    <Skeleton className="w-6 h-6 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="border-t border-slate-100 dark:border-slate-800/50 p-2 min-h-[80px] bg-slate-50/50 dark:bg-slate-900/30"
                      />
                    )
                  }

                  const dayEvents = getEventsForDay(day)
                  const todayClass = isToday(day)
                  const selectedClass = isSelectedDay(day)
                  const isWeekend = index % 7 >= 5

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(new Date(currentYear, currentMonth, day))}
                      className={cn(
                        'relative border-t border-slate-100 dark:border-slate-800/50 p-1.5 min-h-[80px] text-left transition-all duration-150',
                        'hover:bg-teal-50/50 dark:hover:bg-teal-900/10',
                        isWeekend && 'bg-slate-50/30 dark:bg-slate-900/20',
                        selectedClass && 'bg-teal-50 dark:bg-teal-900/20 ring-1 ring-inset ring-teal-500 dark:ring-teal-400',
                        !selectedClass && 'cursor-pointer'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium transition-colors',
                          todayClass && 'bg-teal-600 text-white font-bold',
                          !todayClass && selectedClass && 'bg-teal-100 dark:bg-teal-800 text-teal-700 dark:text-teal-200',
                          !todayClass && !selectedClass && isWeekend && 'text-slate-400 dark:text-slate-500',
                          !todayClass && !selectedClass && !isWeekend && 'text-slate-700 dark:text-slate-300',
                        )}
                      >
                        {day}
                      </span>

                      {/* Event Dots */}
                      {dayEvents.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-0.5">
                          {dayEvents.slice(0, 3).map((event) => (
                            <span
                              key={event.id}
                              className={cn(
                                'w-1.5 h-1.5 rounded-full flex-shrink-0',
                                getColorClasses(event.color).dot
                              )}
                              title={event.title}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium ml-0.5">
                              +{dayEvents.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Event Name Preview (show first event) */}
                      {dayEvents.length === 1 && (
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 truncate leading-tight font-medium">
                          {dayEvents[0].title}
                        </p>
                      )}
                      {dayEvents.length > 1 && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                          {dayEvents.length} events
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden sticky top-20">
            {/* Side Panel Header */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {selectedDate ? (
                  <span>{formatDisplayDate(selectedDate.toISOString())}</span>
                ) : (
                  'Select a day'
                )}
              </h3>
              {selectedDate && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  onClick={() => setSelectedDate(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Side Panel Content */}
            <ScrollArea className="h-[500px]">
              {selectedDate ? (
                <div className="p-3">
                  {selectedDayEvents.length > 0 ? (
                    <div className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {selectedDayEvents.map((event) => (
                          <div key={event.id} className="relative group">
                            <EventCard event={event} />
                            {/* Action buttons */}
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600"
                                onClick={(e) => { e.stopPropagation(); setEditEvent(event); setShowAddDialog(true) }}
                              >
                                <Edit3 className="w-3 h-3 text-slate-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600 hover:text-red-600"
                                onClick={(e) => { e.stopPropagation(); setDeleteId(event.id) }}
                              >
                                <Trash2 className="w-3 h-3 text-slate-500" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <CalendarIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No events</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">This day has no scheduled events</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 gap-1.5 text-xs dark:bg-slate-800 dark:border-slate-700"
                        onClick={() => {
                          setEditEvent(null)
                          setShowAddDialog(true)
                        }}
                      >
                        <Plus className="w-3 h-3" />
                        Add Event
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4">
                  {/* Event type legend */}
                  <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Event Types</h4>
                  <div className="space-y-2">
                    {Object.entries(EVENT_TYPE_CONFIG).map(([key, cfg]) => {
                      const count = events.filter(e => e.eventType === key).length
                      if (count === 0) return null
                      const Icon = cfg.icon
                      return (
                        <div key={key} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', cfg.badge)}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{cfg.label}</p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">{count} event{count !== 1 ? 's' : ''}</p>
                          </div>
                          <div className={cn('w-2.5 h-2.5 rounded-full', getColorClasses(cfg.color).dot)} />
                        </div>
                      )
                    })}
                  </div>

                  <Separator className="my-4 bg-slate-100 dark:bg-slate-800" />

                  <div className="text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Click on a day to view events
                    </p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <EventFormDialog
        open={showAddDialog}
        onClose={() => { setShowAddDialog(false); setEditEvent(null) }}
        onSubmit={editEvent ? handleUpdate : handleCreate}
        editEvent={editEvent}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
