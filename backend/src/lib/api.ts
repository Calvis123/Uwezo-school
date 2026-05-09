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
    const extraHeaders: Record<string, string> =
      optHeaders instanceof Headers
        ? Object.fromEntries(optHeaders.entries())
        : Array.isArray(optHeaders)
          ? Object.fromEntries(optHeaders)
          : (optHeaders as Record<string, string>) || {}

    const isFormDataBody =
      typeof FormData !== 'undefined' &&
      rest?.body instanceof FormData

    const mergedHeaders: Record<string, string> = {
      ...(isFormDataBody ? {} : { 'Content-Type': 'application/json' }),
      ...extraHeaders,
    }
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...rest,
      credentials: 'same-origin',
      headers: mergedHeaders,
    })

    const contentType = res.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json') || contentType.includes('+json')

    if (isJson) {
      try {
        const data = await res.json()
        return data
      } catch {
        const text = await res.text().catch(() => '')
        return {
          success: false,
          error: `Invalid JSON response from ${endpoint} (status ${res.status}). ${text.slice(0, 200)}`,
        }
      }
    }

    const text = await res.text().catch(() => '')
    return {
      success: false,
      error: `Expected JSON from ${endpoint} but got ${contentType || 'unknown'} (status ${res.status}). ${text.slice(0, 200)}`,
    }
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
  me: () => request('/api/auth/me'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  parentRegister: (data: { email: string; admissionNumber: string; password: string; name?: string }) =>
    request('/api/auth/parent/register', { method: 'POST', body: JSON.stringify(data) }),
  parentLogin: (name: string, phone: string) =>
    request('/api/auth/parent/login', {
      method: 'POST',
      body: JSON.stringify({ name, phone }),
    }),
}

// Students
export const studentsApi = {
  list: (params?: { page?: number; limit?: number; classId?: string; status?: string; studentType?: 'DAY' | 'BOARDING'; search?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.classId) searchParams.set('classId', params.classId)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.studentType) searchParams.set('studentType', params.studentType)
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
  structures: (params?: { classId?: string; termId?: string; page?: number; limit?: number; allTerms?: boolean; category?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.classId) searchParams.set('classId', params.classId)
    if (params?.termId) searchParams.set('termId', params.termId)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.allTerms) searchParams.set('allTerms', 'true')
    if (params?.category) searchParams.set('category', params.category)
    return request(`/api/fees/structures?${searchParams.toString()}`)
  },
  createStructure: (data: {
    name: string
    classId: string
    termId: string
    amount: number
    category?: string
    description?: string
  }) =>
    request('/api/fees/structures', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
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
  updateTransaction: (id: string, data: any) =>
    request(`/api/fees/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  ledger: (studentId: string) => request(`/api/fees/ledger/${studentId}`),
  stats: (termId?: string) => {
    const searchParams = new URLSearchParams()
    if (termId) searchParams.set('termId', termId)
    return request(`/api/fees/stats?${searchParams.toString()}`)
  },
  classSummary: (params?: { classId?: string; year?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.classId) searchParams.set('classId', params.classId)
    if (params?.year) searchParams.set('year', String(params.year))
    return request(`/api/fees/class-summary?${searchParams.toString()}`)
  },
  transportRoster: (params?: { classId?: string; termId?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.classId) searchParams.set('classId', params.classId)
    if (params?.termId) searchParams.set('termId', params.termId)
    return request(`/api/fees/transport-roster?${searchParams.toString()}`)
  },
  createTransportStructures: (termId: string) =>
    request('/api/fees/transport-structures', {
      method: 'POST',
      body: JSON.stringify({ termId }),
    }),
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
  stats: (params?: { classId?: string; from?: string; to?: string; startDate?: string; endDate?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.classId) searchParams.set('classId', params.classId)
    if (params?.startDate || params?.from) searchParams.set('startDate', params?.startDate || params?.from || '')
    if (params?.endDate || params?.to) searchParams.set('endDate', params?.endDate || params?.to || '')
    return request(`/api/attendance/stats?${searchParams.toString()}`)
  },
  matrix: (params: { classId: string; month: number; year: number }) => {
    const searchParams = new URLSearchParams()
    searchParams.set('classId', params.classId)
    searchParams.set('month', String(params.month))
    searchParams.set('year', String(params.year))
    return request(`/api/attendance/matrix?${searchParams.toString()}`)
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
  classes: () => request('/api/classes?status=ACTIVE'),
  subjects: () => request('/api/subjects'),
  terms: () => request('/api/terms'),
}

export const termsApi = {
  list: () => request('/api/terms'),
  create: (data: {
    name?: string
    year?: number
    startDate?: string
    endDate?: string
    status?: 'UPCOMING' | 'ACTIVE' | 'COMPLETED'
    mode?: 'GENERATE_YEAR'
  }) =>
    request('/api/terms', { method: 'POST', body: JSON.stringify(data) }),
  update: (
    id: string,
    data: Partial<{
      name: string
      year: number
      startDate: string
      endDate: string
      status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED'
    }>
  ) =>
    request(`/api/terms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
}

// Analytics
export const analyticsApi = {
  get: (params?: { from?: string; to?: string; classId?: string; termId?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.from) searchParams.set('from', params.from)
    if (params?.to) searchParams.set('to', params.to)
    if (params?.classId) searchParams.set('classId', params.classId)
    if (params?.termId) searchParams.set('termId', params.termId)
    return request(`/api/analytics?${searchParams.toString()}`)
  },
}

// Notices
export const noticesApi = {
  list: (params?: { category?: string; includeDrafts?: boolean }) => {
    const searchParams = new URLSearchParams()
    if (params?.category) searchParams.set('category', params.category)
    if (params?.includeDrafts) searchParams.set('includeDrafts', 'true')
    return request(`/api/notices?${searchParams.toString()}`)
  },
  create: (data: { title: string; content: string; category: string; targetRoles: string; isPublished?: boolean; expiresAt?: string | null }) =>
    request('/api/notices', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ title: string; content: string; category: string; targetRoles: string; isPublished: boolean; expiresAt: string | null }>) =>
    request(`/api/notices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/api/notices/${id}`, { method: 'DELETE' }),
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
  children: () => request(`/api/parent/children`),
  dashboard: () => request(`/api/parent/dashboard`),
  feeLedger: (studentId: string) =>
    request(`/api/parent/fee-ledger/${studentId}`),
  results: (studentId: string) => request(`/api/parent/results/${studentId}`),
}

// Users
export const usersApi = {
  list: (params?: { page?: number; limit?: number; role?: string; excludeRole?: string; status?: string; search?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.role) searchParams.set('role', params.role)
    if (params?.excludeRole) searchParams.set('excludeRole', params.excludeRole)
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
  contacts: (params?: { audience?: 'ALL_USERS' | 'ALL_PARENTS' | 'PARENTS_BY_CLASS'; classId?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.audience) searchParams.set('audience', params.audience)
    if (params?.classId) searchParams.set('classId', params.classId)
    return request(`/api/messages/contacts?${searchParams.toString()}`)
  },
  send: (data: { receiverId: string; subject: string; content: string }) =>
    request('/api/messages', { method: 'POST', body: JSON.stringify(data) }),
  markRead: (messageIds: string[]) =>
    request('/api/messages/mark-read', { method: 'POST', body: JSON.stringify({ messageIds }) }),
  delete: (id: string) =>
    request(`/api/messages/${id}`, { method: 'DELETE' }),
  bulkSms: (data: { recipientIds: string[]; message: string }) =>
    request('/api/messages/bulk-sms', { method: 'POST', body: JSON.stringify(data) }),
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

// Documents
export const documentsApi = {
  list: () => request('/api/documents'),
  upload: (formData: FormData) =>
    request('/api/documents', {
      method: 'POST',
      body: formData,
    }),
  delete: (id: string) => request(`/api/documents/${id}`, { method: 'DELETE' }),
}

// SMS (placeholder)
export const smsApi = {
  sendTest: (to: string, message: string) =>
    request('/api/notifications/sms/test', {
      method: 'POST',
      body: JSON.stringify({ to, message }),
    }),
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
  eligibleStudents: (termId?: string) => {
    const searchParams = new URLSearchParams()
    if (termId) searchParams.set('termId', termId)
    return request(`/api/transport/eligible-students?${searchParams.toString()}`)
  },
  assignments: (params?: { busId?: string; termId?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.busId) searchParams.set('busId', params.busId)
    if (params?.termId) searchParams.set('termId', params.termId)
    return request(`/api/transport/assignments?${searchParams.toString()}`)
  },
  assignStudent: (data: { studentId: string; busId: string; termId?: string; transportMode?: string }) =>
    request('/api/transport/assignments', { method: 'POST', body: JSON.stringify(data) }),
  removeAssignment: (assignmentId: string) =>
    request(`/api/transport/assignments/${assignmentId}`, { method: 'DELETE' }),
  feeStructures: (params?: { termId?: string; classId?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.termId) searchParams.set('termId', params.termId)
    if (params?.classId) searchParams.set('classId', params.classId)
    return request(`/api/transport/fee-structures?${searchParams.toString()}`)
  },
  saveFeeStructure: (data: { classId?: string | 'ALL'; routeName?: string; termId: string; amount: number }) =>
    request('/api/transport/fee-structures', { method: 'POST', body: JSON.stringify(data) }),
  updateFeeStructure: (id: string, data: { amount?: number; status?: string }) =>
    request(`/api/transport/fee-structures/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
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
