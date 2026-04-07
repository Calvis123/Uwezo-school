import { create } from 'zustand'

export interface User {
  id: string
  name: string
  email: string
  role: string
  avatar?: string
}

export interface ClassItem {
  id: string
  name: string
  level: string
  stream?: string
  teacherId?: string
  capacity?: number
  status?: string
  studentCount: number
}

export interface SubjectItem {
  id: string
  name: string
  code: string
  level: string
}

export interface TermItem {
  id: string
  name: string
  year: number
  startDate: string
  endDate: string
  status: string
}

export interface Student {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  dateOfBirth?: string
  gender: string
  classId: string
  stream?: string
  status: string
  photo?: string
  address?: string
  medicalNotes?: string
  allergies?: string
  admissionDate: string
  class?: ClassItem
  guardians?: any[]
  feeTransactions?: any[]
  examMarks?: any[]
  attendances?: any[]
}

export interface FeeStructure {
  id: string
  name: string
  classId: string
  termId: string
  amount: number
  category: string
  description?: string
  status: string
  class?: ClassItem
  term?: TermItem
}

export interface FeeTransaction {
  id: string
  studentId: string
  feeStructureId: string
  amount: number
  paymentMethod: string
  transactionRef?: string
  receiptNumber: string
  status: string
  term: string
  notes?: string
  createdAt: string
  student?: Student
  feeStructure?: FeeStructure
}

export interface Exam {
  id: string
  name: string
  termId: string
  classId: string
  type: string
  startDate: string
  endDate: string
  status: string
  totalMarks: number
  class?: ClassItem
  term?: TermItem
}

export interface SchoolNotice {
  id: string
  title: string
  content: string
  category: string
  targetRoles: string
  isPublished: boolean
  publishedAt?: string
  expiresAt?: string
  createdAt: string
}

interface AppState {
  // Navigation
  currentView: string
  sidebarOpen: boolean

  // Auth
  user: User | null
  isAuthenticated: boolean

  // Selections
  selectedStudentId: string | null
  selectedClassId: string | null
  selectedExamId: string | null

  // Reference data
  classes: ClassItem[]
  subjects: SubjectItem[]
  terms: TermItem[]

  // Notifications
  notificationCount: number

  // Actions - Navigation
  setCurrentView: (view: string) => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  // Actions - Auth
  setUser: (user: User | null) => void
  login: (user: User) => void
  logout: () => void

  // Actions - Selections
  setSelectedStudentId: (id: string | null) => void
  setSelectedClassId: (id: string | null) => void
  setSelectedExamId: (id: string | null) => void

  // Actions - Reference data
  setClasses: (classes: ClassItem[]) => void
  setSubjects: (subjects: SubjectItem[]) => void
  setTerms: (terms: TermItem[]) => void

  // Actions - Notifications
  setNotificationCount: (count: number) => void

  // Navigate helper
  navigateTo: (view: string, options?: { studentId?: string; classId?: string; examId?: string }) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  currentView: 'login',
  sidebarOpen: false,
  user: null,
  isAuthenticated: false,
  selectedStudentId: null,
  selectedClassId: null,
  selectedExamId: null,
  classes: [],
  subjects: [],
  terms: [],
  notificationCount: 0,

  // Navigation
  setCurrentView: (view) => set({ currentView: view }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Auth
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  login: (user) => set({ user, isAuthenticated: true, currentView: 'dashboard' }),
  logout: () => set({
    user: null,
    isAuthenticated: false,
    currentView: 'login',
    selectedStudentId: null,
    selectedClassId: null,
    selectedExamId: null,
    sidebarOpen: false,
  }),

  // Selections
  setSelectedStudentId: (id) => set({ selectedStudentId: id }),
  setSelectedClassId: (id) => set({ selectedClassId: id }),
  setSelectedExamId: (id) => set({ selectedExamId: id }),

  // Reference data
  setClasses: (classes) => set({ classes }),
  setSubjects: (subjects) => set({ subjects }),
  setTerms: (terms) => set({ terms }),

  // Notifications
  setNotificationCount: (count) => set({ notificationCount: count }),

  // Navigate helper
  navigateTo: (view, options = {}) => set({
    currentView: view,
    selectedStudentId: options.studentId ?? null,
    selectedClassId: options.classId ?? null,
    selectedExamId: options.examId ?? null,
    sidebarOpen: false,
  }),
}))
