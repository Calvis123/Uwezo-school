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
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
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

// Reference data
export const refApi = {
  classes: () => request('/api/classes'),
  subjects: () => request('/api/subjects'),
  terms: () => request('/api/terms'),
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
