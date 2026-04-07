const API_BASE = ''

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

async function request<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    // Destructure headers from options to merge properly without overwriting defaults
    const { headers: optHeaders, ...rest } = options || {}
    const mergedHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(optHeaders instanceof Headers
        ? Object.fromEntries(optHeaders.entries())
        : Array.isArray(optHeaders)
          ? Object.fromEntries(optHeaders)
          : (optHeaders as Record<string, string>) || {}),
    }
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...rest,
      headers: mergedHeaders,
    })
    const data = await res.json()
    return data
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' }
  }
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
}

// Students
export const studentsApi = {
  list: (params?: { page?: number; limit?: number; classId?: string; status?: string; search?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.classId) searchParams.set('classId', params.classId)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.search) searchParams.set('search', params.search)
    return request(`/api/students?${searchParams.toString()}`)
  },
  get: (id: string) => request(`/api/students/${id}`),
  create: (data: any) =>
    request('/api/students', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request(`/api/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/api/students/${id}`, { method: 'DELETE' }),
}

// Fees
export const feesApi = {
  structures: (params?: { classId?: string; termId?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.classId) searchParams.set('classId', params.classId)
    if (params?.termId) searchParams.set('termId', params.termId)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    return request(`/api/fees/structures?${searchParams.toString()}`)
  },
  transactions: (params?: { studentId?: string; classId?: string; term?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.studentId) searchParams.set('studentId', params.studentId)
    if (params?.classId) searchParams.set('classId', params.classId)
    if (params?.term) searchParams.set('term', params.term)
    return request(`/api/fees/transactions?${searchParams.toString()}`)
  },
  createTransaction: (data: any) =>
    request('/api/fees/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  ledger: (studentId: string) => request(`/api/fees/ledger/${studentId}`),
  stats: () => request('/api/fees/stats'),
  mpesa: (data: { studentId: string; amount: number; phoneNumber: string; feeStructureId: string }) =>
    request('/api/fees/mpesa', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  mpesaStatus: (ref: string) => request(`/api/fees/mpesa/status?ref=${ref}`),
}

// Exams
export const examsApi = {
  list: (params?: { classId?: string; termId?: string; status?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.classId) searchParams.set('classId', params.classId)
    if (params?.termId) searchParams.set('termId', params.termId)
    if (params?.status) searchParams.set('status', params.status)
    return request(`/api/exams?${searchParams.toString()}`)
  },
  create: (data: any) =>
    request('/api/exams', { method: 'POST', body: JSON.stringify(data) }),
  getMarks: (examId: string) => request(`/api/exams/${examId}/marks`),
  saveMarks: (data: any) =>
    request('/api/exams/marks', { method: 'POST', body: JSON.stringify(data) }),
  studentResults: (studentId: string) => request(`/api/exams/results/${studentId}`),
}

// Attendance
export const attendanceApi = {
  list: (params?: { classId?: string; date?: string; studentId?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.classId) searchParams.set('classId', params.classId)
    if (params?.date) searchParams.set('date', params.date)
    if (params?.studentId) searchParams.set('studentId', params.studentId)
    return request(`/api/attendance?${searchParams.toString()}`)
  },
  mark: (data: any) =>
    request('/api/attendance/mark', { method: 'POST', body: JSON.stringify(data) }),
  stats: (params?: { classId?: string; from?: string; to?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.classId) searchParams.set('classId', params.classId)
    if (params?.from) searchParams.set('from', params.from)
    if (params?.to) searchParams.set('to', params.to)
    return request(`/api/attendance/stats?${searchParams.toString()}`)
  },
}

// Dashboard
export const dashboardApi = {
  stats: () => request('/api/dashboard/stats'),
}

// Classes
export const classesApi = {
  list: (params?: { level?: string; status?: string; search?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.level) searchParams.set('level', params.level)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.search) searchParams.set('search', params.search)
    return request(`/api/classes?${searchParams.toString()}`)
  },
  get: (id: string) => request(`/api/classes/${id}`),
  create: (data: any) =>
    request('/api/classes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request(`/api/classes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/api/classes/${id}`, { method: 'DELETE' }),
}

// Reference data
export const refApi = {
  classes: () => request('/api/classes'),
  subjects: () => request('/api/subjects'),
  terms: () => request('/api/terms'),
}

// Analytics
export const analyticsApi = {
  get: (params?: { from?: string; to?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.from) searchParams.set('from', params.from)
    if (params?.to) searchParams.set('to', params.to)
    return request(`/api/analytics?${searchParams.toString()}`)
  },
}

// Notices
export const noticesApi = {
  list: () => request('/api/notices'),
}

// Settings
export const settingsApi = {
  get: () => request('/api/settings'),
  update: (data: any) =>
    request('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),
}

// Calendar
export const calendarApi = {
  list: (month?: number, year?: number, eventType?: string) => {
    const searchParams = new URLSearchParams()
    if (month) searchParams.set('month', String(month))
    if (year) searchParams.set('year', String(year))
    if (eventType) searchParams.set('eventType', eventType)
    return request(`/api/calendar/events?${searchParams.toString()}`)
  },
  get: (id: string) => request(`/api/calendar/events/${id}`),
  create: (data: any) =>
    request('/api/calendar/events', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request(`/api/calendar/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/api/calendar/events/${id}`, { method: 'DELETE' }),
}

// Parent Portal
export const parentApi = {
  children: (guardianId: string) =>
    request(`/api/parent/children?guardianId=${guardianId}`),
  dashboard: (guardianId: string) =>
    request(`/api/parent/dashboard?guardianId=${guardianId}`),
  feeLedger: (studentId: string) =>
    request(`/api/parent/fee-ledger/${studentId}`),
}

// Users
export const usersApi = {
  list: (params?: { page?: number; limit?: number; role?: string; status?: string; search?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.role) searchParams.set('role', params.role)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.search) searchParams.set('search', params.search)
    return request(`/api/users?${searchParams.toString()}`)
  },
  get: (id: string) => request(`/api/users/${id}`),
  create: (data: any) =>
    request('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/api/users/${id}`, { method: 'DELETE' }),
}

// Teacher Portal
export const teacherApi = {
  dashboard: (teacherId: string) =>
    request(`/api/teacher/dashboard?teacherId=${teacherId}`),
  classes: (teacherId: string) =>
    request(`/api/teacher/classes?teacherId=${teacherId}`),
}

// Messaging
export const messagesApi = {
  list: (userId: string, folder: 'inbox' | 'sent') => {
    const searchParams = new URLSearchParams()
    searchParams.set('userId', userId)
    searchParams.set('folder', folder)
    return request(`/api/messages?${searchParams.toString()}`)
  },
  send: (data: { senderId: string; receiverId: string; subject: string; content: string }) =>
    request('/api/messages', { method: 'POST', body: JSON.stringify(data) }),
  markRead: (messageIds: string[]) =>
    request('/api/messages/mark-read', { method: 'POST', body: JSON.stringify({ messageIds }) }),
}

// Search
export const searchApi = {
  global: (q: string) => {
    const searchParams = new URLSearchParams()
    if (q) searchParams.set('q', q)
    return request(`/api/search?${searchParams.toString()}`)
  },
}

// Student Academics
export const academicsApi = {
  get: (studentId: string) => request(`/api/students/${studentId}/academics`),
}

// Reports
export const reportsApi = {
  classReport: (classId: string, examId: string) =>
    request(`/api/reports/class-report?classId=${classId}&examId=${examId}`),
}

// Notifications
export const notificationsApi = {
  list: (userId?: string) => {
    const searchParams = new URLSearchParams()
    if (userId) searchParams.set('userId', userId)
    return request(`/api/notifications?${searchParams.toString()}`)
  },
  markRead: (id: string) =>
    request(`/api/notifications/${id}`, { method: 'POST' }),
  markAllRead: () =>
    request('/api/notifications/read-all', { method: 'POST' }),
}

// Activity Feed
export const activityApi = {
  list: (params?: { type?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.type) searchParams.set('type', params.type)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    return request(`/api/activity?${searchParams.toString()}`)
  },
}

// Transport
export const transportApi = {
  list: (params?: { status?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    return request(`/api/transport/buses?${searchParams.toString()}`)
  },
  get: (id: string) => request(`/api/transport/buses/${id}`),
  create: (data: any) =>
    request('/api/transport/buses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request(`/api/transport/buses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/api/transport/buses/${id}`, { method: 'DELETE' }),
}

// Library
export const libraryApi = {
  books: (params?: { page?: number; limit?: number; search?: string; category?: string; status?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.search) searchParams.set('search', params.search)
    if (params?.category) searchParams.set('category', params.category)
    if (params?.status) searchParams.set('status', params.status)
    return request(`/api/library/books?${searchParams.toString()}`)
  },
  createBook: (data: any) =>
    request('/api/library/books', { method: 'POST', body: JSON.stringify(data) }),
  updateBook: (id: string, data: any) =>
    request(`/api/library/books/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBook: (id: string) =>
    request(`/api/library/books/${id}`, { method: 'DELETE' }),
  issues: (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.status) searchParams.set('status', params.status)
    if (params?.search) searchParams.set('search', params.search)
    return request(`/api/library/issues?${searchParams.toString()}`)
  },
  issueBook: (data: { bookId: string; studentId: string; dueDate: string }) =>
    request('/api/library/issues', { method: 'POST', body: JSON.stringify(data) }),
  returnBook: (issueId: string) =>
    request(`/api/library/issues/${issueId}/return`, { method: 'POST' }),
}

// Health Records
export const healthApi = {
  records: (params?: { page?: number; limit?: number; studentId?: string; recordType?: string; severity?: string; status?: string; search?: string; startDate?: string; endDate?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.studentId) searchParams.set('studentId', params.studentId)
    if (params?.recordType) searchParams.set('recordType', params.recordType)
    if (params?.severity) searchParams.set('severity', params.severity)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.search) searchParams.set('search', params.search)
    if (params?.startDate) searchParams.set('startDate', params.startDate)
    if (params?.endDate) searchParams.set('endDate', params.endDate)
    return request(`/api/health/records?${searchParams.toString()}`)
  },
  getRecord: (id: string) => request(`/api/health/records/${id}`),
  createRecord: (data: any) =>
    request('/api/health/records', { method: 'POST', body: JSON.stringify(data) }),
  updateRecord: (id: string, data: any) =>
    request(`/api/health/records/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRecord: (id: string) =>
    request(`/api/health/records/${id}`, { method: 'DELETE' }),
  conditions: (params?: { page?: number; limit?: number; studentId?: string; condition?: string; severity?: string; search?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.studentId) searchParams.set('studentId', params.studentId)
    if (params?.condition) searchParams.set('condition', params.condition)
    if (params?.severity) searchParams.set('severity', params.severity)
    if (params?.search) searchParams.set('search', params.search)
    return request(`/api/health/conditions?${searchParams.toString()}`)
  },
  createCondition: (data: any) =>
    request('/api/health/conditions', { method: 'POST', body: JSON.stringify(data) }),
  updateCondition: (id: string, data: any) =>
    request(`/api/health/conditions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCondition: (id: string) =>
    request(`/api/health/conditions/${id}`, { method: 'DELETE' }),
  overview: () => request('/api/health/overview'),
  studentHealth: (studentId: string) =>
    request(`/api/health/records?studentId=${studentId}&limit=100`),
}

// Student Promotions
export const promotionsApi = {
  promote: (data: {
    studentIds: string[]
    fromClassId: string
    toClassId: string
    academicYear: string
    term: string
    promotedBy: string
    notes?: string
  }) =>
    request('/api/students/promote', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  history: (params?: {
    academicYear?: string
    term?: string
    status?: string
    fromClassId?: string
    toClassId?: string
    page?: number
    limit?: number
    search?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.academicYear) searchParams.set('academicYear', params.academicYear)
    if (params?.term) searchParams.set('term', params.term)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.fromClassId) searchParams.set('fromClassId', params.fromClassId)
    if (params?.toClassId) searchParams.set('toClassId', params.toClassId)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.search) searchParams.set('search', params.search)
    return request(`/api/students/promotions?${searchParams.toString()}`)
  },
  approve: (id: string, notes?: string) =>
    request(`/api/students/promotions/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'APPROVED', notes }),
    }),
  complete: (id: string, notes?: string) =>
    request(`/api/students/promotions/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'COMPLETED', notes }),
    }),
  cancel: (id: string) =>
    request(`/api/students/promotions/${id}`, { method: 'DELETE' }),
  getConfig: () => request('/api/classes/promotion-config'),
}
