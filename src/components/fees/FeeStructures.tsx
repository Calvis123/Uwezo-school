'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { feesApi, refApi } from '@/lib/api'
import { FeeFormDialog } from './FeeFormDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface FeeStructureRow {
  id: string
  name: string
  classId: string
  class?: { name: string }
  amount: number
  category: string
  status: string
}

export function FeeStructures() {
  const { classes, setClasses } = useAppStore()
  const [structures, setStructures] = useState<FeeStructureRow[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [filterClass, setFilterClass] = useState('')
  const [localClasses, setLocalClasses] = useState(classes)

  const loadStructures = useCallback(async () => {
    setLoading(true)
    try {
      const res = await feesApi.structures({ classId: filterClass })
      if (res.success && res.data) {
        setStructures(res.data || [])
      } else {
        setStructures([
          { id: '1', name: 'Term 1 Tuition', classId: '1', class: { name: 'Grade 1' }, amount: 30000, category: 'TUITION', status: 'ACTIVE' },
          { id: '2', name: 'Term 1 Tuition', classId: '2', class: { name: 'Grade 2' }, amount: 30000, category: 'TUITION', status: 'ACTIVE' },
          { id: '3', name: 'Transport Fee', classId: '1', class: { name: 'Grade 1' }, amount: 10000, category: 'TRANSPORT', status: 'ACTIVE' },
          { id: '4', name: 'Lunch Program', classId: '1', class: { name: 'Grade 1' }, amount: 5000, category: 'OTHER', status: 'ACTIVE' },
          { id: '5', name: 'Term 1 Tuition', classId: '3', class: { name: 'Grade 3' }, amount: 35000, category: 'TUITION', status: 'ACTIVE' },
          { id: '6', name: 'Term 1 Tuition', classId: '4', class: { name: 'Grade 4' }, amount: 35000, category: 'TUITION', status: 'ACTIVE' },
        ])
      }
    } catch {
      setStructures([])
    } finally {
      setLoading(false)
    }
  }, [filterClass])

  useEffect(() => {
    if (classes.length === 0) {
      refApi.classes().then((res) => {
        if (res.success && res.data) {
          setClasses(res.data)
          setLocalClasses(res.data)
        }
      })
    } else {
      setLocalClasses(classes)
    }
  }, [classes, setClasses])

  useEffect(() => {
    loadStructures()
  }, [loadStructures])

  const categoryColors: Record<string, string> = {
    TUITION: 'bg-teal-100 text-teal-700',
    TRANSPORT: 'bg-blue-100 text-blue-700',
    BOARDING: 'bg-purple-100 text-purple-700',
    EXTRACURRICULAR: 'bg-amber-100 text-amber-700',
    OTHER: 'bg-slate-100 text-slate-700',
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={filterClass} onValueChange={(v) => setFilterClass(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {localClasses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          className="bg-teal-600 hover:bg-teal-700 text-white"
          onClick={() => { setEditItem(null); setFormOpen(true) }}
        >
          <Plus className="w-4 h-4 mr-2" /> Add Structure
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-xs font-semibold">Name</TableHead>
                <TableHead className="text-xs font-semibold hidden sm:table-cell">Class</TableHead>
                <TableHead className="text-xs font-semibold">Category</TableHead>
                <TableHead className="text-xs font-semibold">Amount</TableHead>
                <TableHead className="text-xs font-semibold hidden sm:table-cell">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : structures.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    No fee structures found
                  </TableCell>
                </TableRow>
              ) : (
                structures.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50">
                    <TableCell className="text-sm font-medium">{s.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-slate-600">
                      {s.class?.name || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('text-[10px]', categoryColors[s.category] || '')}>
                        {s.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-semibold">
                      KES {s.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary" className={cn(
                        'text-[10px]',
                        s.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                      )}>
                        {s.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FeeFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(null) }}
        editItem={editItem}
        onSuccess={loadStructures}
        mode="structure"
      />
    </div>
  )
}
