'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  BookOpen,
  DollarSign,
  ClipboardCheck,
  AlertTriangle,
  Heart,
  Edit2,
} from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAppStore } from '@/lib/store'
import { studentsApi, feesApi, examsApi, attendanceApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export function StudentDetail() {
  const { selectedStudentId, navigateTo, classes, setClasses } = useAppStore()
  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [feeLedger, setFeeLedger] = useState<any>(null)
  const [results, setResults] = useState<any>(null)
  const [attendanceStats, setAttendanceStats] = useState<any>(null)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [payLoading, setPayLoading] = useState(false)

  useEffect(() => {
    if (!selectedStudentId) return
    loadStudent()
  }, [selectedStudentId])

  const loadStudent = async () => {
    if (!selectedStudentId) return
    setLoading(true)
    try {
      const res = await studentsApi.get(selectedStudentId)
      if (res.success && res.data) {
        setStudent(res.data)
      } else {
        // Demo data
        setStudent({
          id: selectedStudentId,
          admissionNumber: 'ADM-001',
          firstName: 'John',
          lastName: 'Kamau',
          gender: 'MALE',
          dateOfBirth: '2015-03-15',
          class: { id: '1', name: 'Grade 4' },
          status: 'ACTIVE',
          address: '123 School Road, Nairobi',
          medicalNotes: 'None',
          allergies: 'None',
          admissionDate: '2023-01-15',
          guardians: [
            { guardian: { name: 'James Kamau', phone: '0712345678', email: 'james@email.com' }, relationship: 'FATHER', isPrimary: true },
          ],
        })
      }
    } catch {
      setStudent(null)
    } finally {
      setLoading(false)
    }
  }

  const loadFeeLedger = async () => {
    if (!selectedStudentId) return
    try {
      const res = await feesApi.ledger(selectedStudentId)
      if (res.success && res.data) {
        setFeeLedger(res.data)
      } else {
        setFeeLedger({
          totalFees: 45000,
          totalPaid: 30000,
          balance: 15000,
          structures: [{ name: 'Term 1 Tuition', amount: 30000, category: 'TUITION' }, { name: 'Transport Fee', amount: 10000, category: 'TRANSPORT' }, { name: 'Lunch Program', amount: 5000, category: 'OTHER' }],
          transactions: [
            { receiptNumber: 'RCT-001', amount: 15000, paymentMethod: 'MPESA', createdAt: new Date().toISOString(), feeStructure: { name: 'Term 1 Tuition' }, status: 'COMPLETED' },
            { receiptNumber: 'RCT-002', amount: 15000, paymentMethod: 'BANK', createdAt: new Date().toISOString(), feeStructure: { name: 'Term 1 Tuition' }, status: 'COMPLETED' },
          ],
        })
      }
    } catch {
      setFeeLedger(null)
    }
  }

  const loadResults = async () => {
    if (!selectedStudentId) return
    try {
      const res = await examsApi.studentResults(selectedStudentId)
      if (res.success && res.data) {
        setResults(res.data)
      } else {
        setResults([
          { examName: 'Term 1 CAT 1', subject: 'Mathematics', marks: 85, grade: 'A-', remarks: 'Excellent' },
          { examName: 'Term 1 CAT 1', subject: 'English', marks: 72, grade: 'B+', remarks: 'Good' },
          { examName: 'Term 1 CAT 1', subject: 'Kiswahili', marks: 78, grade: 'B+', remarks: 'Good' },
          { examName: 'Term 1 CAT 1', subject: 'Science', marks: 90, grade: 'A', remarks: 'Excellent' },
          { examName: 'Term 1 CAT 1', subject: 'Social Studies', marks: 68, grade: 'B', remarks: 'Good' },
          { examName: 'Term 1 End Term', subject: 'Mathematics', marks: 92, grade: 'A', remarks: 'Excellent' },
          { examName: 'Term 1 End Term', subject: 'English', marks: 75, grade: 'B+', remarks: 'Good' },
          { examName: 'Term 1 End Term', subject: 'Kiswahili', marks: 82, grade: 'A-', remarks: 'Very Good' },
          { examName: 'Term 1 End Term', subject: 'Science', marks: 88, grade: 'A-', remarks: 'Excellent' },
          { examName: 'Term 1 End Term', subject: 'Social Studies', marks: 70, grade: 'B+', remarks: 'Good' },
        ])
      }
    } catch {
      setResults(null)
    }
  }

  const loadAttendance = async () => {
    if (!selectedStudentId) return
    try {
      const res = await attendanceApi.stats({ studentId: selectedStudentId })
      if (res.success && res.data) {
        setAttendanceStats(res.data)
      } else {
        setAttendanceStats({
          totalDays: 90,
          present: 85,
          absent: 3,
          late: 2,
          excused: 0,
          rate: 94.4,
          monthly: [
            { month: 'Jan', rate: 96, present: 20, absent: 1 },
            { month: 'Feb', rate: 95, present: 19, absent: 1 },
            { month: 'Mar', rate: 92, present: 22, absent: 2 },
          ],
        })
      }
    } catch {
      setAttendanceStats(null)
    }
  }

  useEffect(() => {
    if (student) {
      loadFeeLedger()
      loadResults()
      loadAttendance()
    }
  }, [student])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 dark:text-slate-400">Student not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigateTo('students')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Students
        </Button>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    INACTIVE: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    GRADUATED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  }

  const feePaid = feeLedger ? (feeLedger.totalPaid / feeLedger.totalFees) * 100 : 0

  const performanceChartData = results?.length
    ? Object.entries(
        results.reduce((acc: any, r: any) => {
          if (!acc[r.subject]) acc[r.subject] = { total: 0, count: 0 }
          acc[r.subject].total += r.marks
          acc[r.subject].count++
          return acc
        }, {})
      ).map(([subject, data]: any) => ({
        subject: subject.split(' ').pop()?.slice(0, 3) || subject,
        marks: Math.round(data.total / data.count),
      }))
    : []

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigateTo('students')} className="text-slate-500 dark:text-slate-400">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Students
      </Button>

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-xl font-bold">
                  {student.firstName[0]}{student.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {student.firstName} {student.lastName}
                  </h2>
                  <Badge className={cn('text-xs', statusColors[student.status] || '')}>
                    {student.status}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {student.admissionNumber} • {student.class?.name}
                </p>
                <div className="flex flex-wrap gap-4 mt-3">
                  {student.dateOfBirth && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(student.dateOfBirth), 'MMM d, yyyy')}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <User className="w-3.5 h-3.5" />
                    {student.gender}
                  </div>
                  {student.address && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5" />
                      {student.address}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0 h-auto">
          <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm">
            Overview
          </TabsTrigger>
          <TabsTrigger value="fees" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm">
            Fees
          </TabsTrigger>
          <TabsTrigger value="academics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm">
            Academics
          </TabsTrigger>
          <TabsTrigger value="attendance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm">
            Attendance
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Personal Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Date of Birth</span>
                  <span className="font-medium">{student.dateOfBirth ? format(new Date(student.dateOfBirth), 'MMM d, yyyy') : '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Gender</span>
                  <span className="font-medium">{student.gender}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Class</span>
                  <span className="font-medium">{student.class?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Admission Date</span>
                  <span className="font-medium">{format(new Date(student.admissionDate), 'MMM d, yyyy')}</span>
                </div>
                {student.address && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Address</span>
                    <span className="font-medium text-right max-w-[60%]">{student.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Guardian Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700">Guardian Information</CardTitle>
              </CardHeader>
              <CardContent>
                {student.guardians?.length > 0 ? (
                  <div className="space-y-3">
                    {student.guardians.map((g: any, i: number) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{g.guardian?.name}</p>
                          <p className="text-xs text-slate-500">{g.relationship} {g.isPrimary && '(Primary)'}</p>
                          {g.guardian?.phone && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" /> {g.guardian.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No guardian information</p>
                )}
              </CardContent>
            </Card>

            {/* Medical Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700">Medical Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Medical Notes</span>
                  <span className="font-medium">{student.medicalNotes || 'None'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Allergies</span>
                  <span className="font-medium">{student.allergies || 'None'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-amber-500" /> Fee Balance
                  </span>
                  <span className="text-sm font-bold text-red-600">
                    KES {feeLedger?.balance?.toLocaleString() || '15,000'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-500" /> Average Score
                  </span>
                  <span className="text-sm font-bold text-blue-600">
                    {results?.length ? Math.round(results.reduce((a: number, r: any) => a + r.marks, 0) / results.length) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-green-500" /> Attendance
                  </span>
                  <span className="text-sm font-bold text-green-600">
                    {attendanceStats?.rate ? `${attendanceStats.rate.toFixed(1)}%` : '94.4%'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Fees Tab */}
        <TabsContent value="fees" className="mt-4 space-y-4">
          {/* Fee Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-slate-500">Total Fees</p>
                <p className="text-xl font-bold text-slate-900">KES {feeLedger?.totalFees?.toLocaleString() || '45,000'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-slate-500">Total Paid</p>
                <p className="text-xl font-bold text-green-600">KES {feeLedger?.totalPaid?.toLocaleString() || '30,000'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-slate-500">Balance</p>
                <p className="text-xl font-bold text-red-600">KES {feeLedger?.balance?.toLocaleString() || '15,000'}</p>
                {feeLedger && (
                  <Progress value={feePaid} className="mt-2 h-2" />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => setPaymentDialogOpen(true)}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          </div>

          {/* Payment History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Receipt #</TableHead>
                    <TableHead className="text-xs">Fee Type</TableHead>
                    <TableHead className="text-xs">Amount</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Method</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(feeLedger?.transactions || []).map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm font-mono">{t.receiptNumber}</TableCell>
                      <TableCell className="text-sm">{t.feeStructure?.name || '—'}</TableCell>
                      <TableCell className="text-sm font-semibold">KES {t.amount?.toLocaleString()}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary" className="text-[10px]">{t.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-slate-500">
                        {format(new Date(t.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Record Payment Dialog */}
          <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount (KES)</Label>
                  <Input type="number" placeholder="Enter amount" id="pay-amount" />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
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
                  <Textarea placeholder="Optional notes" rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
                <Button
                  className="bg-teal-600 hover:bg-teal-700"
                  onClick={async () => {
                    const amountEl = document.getElementById('pay-amount') as HTMLInputElement
                    if (!amountEl?.value || Number(amountEl.value) <= 0) {
                      toast.error('Please enter a valid amount')
                      return
                    }
                    setPayLoading(true)
                    try {
                      const result = await feesApi.createTransaction({
                        studentId: selectedStudentId,
                        feeStructureId: feeLedger?.structures?.[0]?.id,
                        amount: Number(amountEl.value),
                        paymentMethod: 'CASH',
                      })
                      if (result.success) {
                        toast.success('Payment recorded successfully')
                        setPaymentDialogOpen(false)
                        loadFeeLedger()
                      } else {
                        toast.error(result.error || 'Failed to record payment')
                      }
                    } catch {
                      toast.error('An error occurred')
                    } finally {
                      setPayLoading(false)
                    }
                  }}
                  disabled={payLoading}
                >
                  {payLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Record Payment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Academics Tab */}
        <TabsContent value="academics" className="mt-4 space-y-4">
          {/* Performance Chart */}
          {performanceChartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip />
                      <Bar dataKey="marks" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Exam Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Exam</TableHead>
                      <TableHead className="text-xs">Subject</TableHead>
                      <TableHead className="text-xs">Marks</TableHead>
                      <TableHead className="text-xs">Grade</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(results || []).map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">{r.examName}</TableCell>
                        <TableCell className="text-sm">{r.subject}</TableCell>
                        <TableCell className="text-sm font-semibold">{r.marks}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn(
                            'text-[10px]',
                            r.marks >= 80 ? 'bg-green-100 text-green-700' :
                            r.marks >= 60 ? 'bg-blue-100 text-blue-700' :
                            r.marks >= 40 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          )}>
                            {r.grade}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-slate-500">{r.remarks}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-slate-500">Rate</p>
                <p className="text-xl font-bold text-green-600">{attendanceStats?.rate?.toFixed(1) || '94.4'}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-slate-500">Present</p>
                <p className="text-xl font-bold text-teal-600">{attendanceStats?.present || 85}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-slate-500">Absent</p>
                <p className="text-xl font-bold text-red-600">{attendanceStats?.absent || 3}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-slate-500">Late</p>
                <p className="text-xl font-bold text-amber-600">{attendanceStats?.late || 2}</p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Monthly Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Month</TableHead>
                    <TableHead className="text-xs">Attendance Rate</TableHead>
                    <TableHead className="text-xs">Days Present</TableHead>
                    <TableHead className="text-xs">Days Absent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(attendanceStats?.monthly || []).map((m: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{m.month}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={m.rate} className="h-2 w-20" />
                          <span className="text-sm font-medium">{m.rate}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{m.present}</TableCell>
                      <TableCell className="text-sm text-red-600">{m.absent}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
