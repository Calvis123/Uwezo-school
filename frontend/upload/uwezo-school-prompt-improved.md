# Uwezo School Management System — Developer Brief (Next.js Edition)

> **Version:** 2.0 | **Last Updated:** 2026-04-07 | **Status:** Active Development
> **Tech Stack:** Next.js 15 (App Router) + React + TypeScript + shadcn/ui
> **Backend:** REST API + PostgreSQL/Prisma

---

## 1. Executive Summary

**Project:** Enhance and extend an existing Next.js-based School Management System for Uwezo School, Eldoret, Kenya.

**Live Environment:** `https://m1vy02g3srx0-d.space.z.ai/` (Staging) | `Uwezo School.wellwinschemist.co.ke` (Production)

**Current Scale:** 571 students across Pre-Nursery, Nursery, Primary, and Junior Secondary levels.

**Context:** This is an active production system serving a real school in Kenya. The system uses a term-based session model (e.g., `2025-1`, `2025-2`, `2025-3`). **Backend API is fully functional** — frontend pages need to be connected.

**Developer Role:** Full-stack Next.js/React developer with experience in:
- Next.js 15 App Router architecture
- shadcn/ui component library
- Server Actions & API routes
- Kenyan education context (CBC curriculum)
- Payment integrations (M-Pesa)

---

## 2. Implementation Status Overview

### ✅ Already Working (Backend API)

| Feature | API Endpoint | Status |
|---------|--------------|--------|
| Authentication | `POST /api/auth/login` | ✅ JWT auth working |
| Dashboard Stats | `GET /api/dashboard/stats` | ✅ Full analytics |
| Students | `GET /api/students` | ✅ 571 students, paginated |
| Classes | `GET /api/classes` | ✅ 19 classes |
| Users | `GET /api/users` | ✅ 6 users, role-based |
| Fee Transactions | ✅ Tracked | M-Pesa, Cash, Bank |
| Attendance | ✅ Tracked | Present/Absent/Late/Excused |
| Terms | ✅ Active term | Term 2, 2025 |

### ❌ Critical Issues (Frontend)

| Route | Issue | Priority |
|-------|-------|----------|
| `/dashboard` | Returns 404 - page not created | **P0** |
| `/admin/dashboard` | Returns 404 - page not created | **P0** |
| `/students` | Returns 404 - page not created | **P0** |
| `/admin/students` | Returns 404 - page not created | **P0** |
| All protected routes | Next.js routing not configured | **P0** |

**Root Cause:** Next.js pages not created/deployed. API exists but no UI to consume it.

---

## 3. Critical Fixes (P0 — Immediate Blockers)

### 3.1 Fix Next.js Routing & Page Structure

**Issue:** Frontend pages return 404. API works but UI missing.

**Acceptance Criteria:**
- [ ] Create `app/dashboard/page.tsx` - Protected dashboard page
- [ ] Create `app/admin/dashboard/page.tsx` - Admin dashboard
- [ ] Create `app/admin/students/page.tsx` - Students list page
- [ ] Create `app/admin/students/[id]/page.tsx` - Student profile page
- [ ] Create `app/teacher/dashboard/page.tsx` - Teacher dashboard
- [ ] Create `app/parent/dashboard/page.tsx` - Parent dashboard
- [ ] Add middleware for route protection (`middleware.ts`)
- [ ] Implement role-based redirect logic
- [ ] Test: Visit `/dashboard` after login → should load dashboard

**Next.js App Router Structure:**
```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx           ✅ Exists
│   └── layout.tsx             ✅ Exists
├── (dashboard)/               # Protected routes group
│   ├── dashboard/
│   │   └── page.tsx           ❌ Create
│   ├── admin/
│   │   ├── dashboard/
│   │   │   └── page.tsx       ❌ Create
│   │   ├── students/
│   │   │   ├── page.tsx       ❌ Create
│   │   │   └── [id]/
│   │   │       └── page.tsx   ❌ Create
│   │   ├── fees/
│   │   │   └── page.tsx       ❌ Create
│   │   └── ...
│   ├── teacher/
│   │   └── dashboard/
│   │       └── page.tsx       ❌ Create
│   └── parent/
│       └── dashboard/
│           └── page.tsx       ❌ Create
├── api/                       ✅ Exists (all routes working)
├── layout.tsx                 ✅ Exists
├── page.tsx                   ✅ Exists (login)
└── middleware.ts              ❌ Create (route protection)
```

### 3.2 Implement Authentication Flow

**Issue:** Login works but no protected route handling.

**Acceptance Criteria:**
- [ ] Create auth context/store (`hooks/useAuth.ts`)
- [ ] Implement token storage (localStorage/cookies)
- [ ] Add auth refresh logic
- [ ] Create protected route wrapper component
- [ ] Add logout functionality
- [ ] Handle expired tokens
- [ ] Test: Login → redirect to dashboard, Logout → redirect to login

### 3.3 Dashboard Page Implementation

**Acceptance Criteria:**
- [ ] Fetch stats from `/api/dashboard/stats`
- [ ] Display overview cards (students, classes, teachers, fees)
- [ ] Show gender distribution chart
- [ ] Show fee collection progress
- [ ] Show recent activities (payments, attendance)
- [ ] Add loading states
- [ ] Add error handling
- [ ] Make responsive (mobile-friendly)

---

## 4. Core Feature Improvements (P1 — High Priority)

### 4.1 Students Module

**Required Pages:**

#### 4.1.1 Students List Page
**Route:** `/admin/students`
**API:** `GET /api/students`

**Features:**
- [ ] DataTable with pagination (20 per page)
- [ ] Search by name/admission number
- [ ] Filter by class, status (Active/Graduated)
- [ ] Sort by columns
- [ ] Actions: View, Edit, Delete
- [ ] Export to Excel/CSV
- [ ] Add new student button

**Components:**
```tsx
// app/admin/students/page.tsx
- StudentsTable (client component)
- StudentFilters
- StudentCard (mobile view)
- PaginationControls
```

#### 4.1.2 Student Profile Page
**Route:** `/admin/students/[id]`
**API:** `GET /api/students/{id}`

**Tabbed Layout:**
- [ ] **Personal Info** - Editable form
- [ ] **Academic History** - Current class, promotions, exam results
- [ ] **Fee Ledger** - Balance, transactions, receipt download
- [ ] **Attendance** - Daily record, monthly %
- [ ] **Parents/Guardians** - Linked accounts, contacts

#### 4.1.3 Add/Edit Student Modal
- [ ] Form validation (Zod schema)
- [ ] Class selection dropdown
- [ ] Photo upload
- [ ] Medical info fields
- [ ] Parent selection/linking

### 4.2 Fee Management Module

**Required Pages:**

#### 4.2.1 Fees Overview Page
**Route:** `/admin/fees`

**Dashboard Widgets:**
- [ ] Total expected vs collected
- [ ] Outstanding balance by class
- [ ] Collection rate %
- [ ] Recent payments table

#### 4.2.2 Student Fee Page
**Route:** `/admin/students/[id]/fees`

**Features:**
- [ ] Fee structure per term
- [ ] Transaction history
- [ ] Add payment button
- [ ] M-Pesa STK Push
- [ ] Cash payment entry
- [ ] Bank transfer entry
- [ ] Receipt generation (PDF)
- [ ] SMS receipt to parent

#### 4.2.3 Payment Modal
- [ ] Amount input
- [ ] Payment method selector
- [ ] M-Pesa phone input
- [ ] Transaction ID
- [ ] Receipt auto-generation

### 4.3 Attendance Module

**Required Pages:**

#### 4.3.1 Attendance Marking Page
**Route:** `/teacher/attendance`

**Features:**
- [ ] Class selector
- [ ] Date picker
- [ ] Student list with radio buttons (Present/Absent/Late/Excused)
- [ ] Reason input for absent/excused
- [ ] Bulk submit
- [ ] Save progress indicator

#### 4.3.2 Attendance Report Page
**Route:** `/admin/reports/attendance`

**Features:**
- [ ] Date range filter
- [ ] Class filter
- [ ] Student-wise attendance %
- [ ] Export to PDF

### 4.4 Exam & Results Module

**Required Pages:**

#### 4.4.1 Exam Management Page
**Route:** `/admin/exams`

**Features:**
- [ ] Create exam (name, term, date)
- [ ] Select classes
- [ ] Enter marks interface
- [ ] CBC grading auto-calculation

#### 4.4.2 Report Card Generation
**Route:** `/admin/reports/report-cards`

**Features:**
- [ ] Select class/term/student
- [ ] Generate PDF report card
- [ ] School branding
- [ ] Student photo, details
- [ ] Subject-wise marks & grades
- [ ] Class position
- [ ] Principal remarks
- [ ] Bulk generation option

#### 4.4.3 Parent Results Portal
**Route:** `/results` (public)

**Features:**
- [ ] PIN input form
- [ ] View/download report card
- [ ] PIN usage tracking
- [ ] Rate limiting

---

## 5. Enhanced Features (P2 — Medium Priority)

### 5.1 User Management Pages

**Route:** `/admin/users`

**Features:**
- [ ] Users list with role filters
- [ ] Add user modal (all roles)
- [ ] Bulk import CSV/Excel
- [ ] Role assignment
- [ ] Parent-student linking

### 5.2 Class Management

**Route:** `/admin/classes`

**Features:**
- [ ] Classes list with utilization
- [ ] Edit class details
- [ ] Assign teacher
- [ ] Set capacity
- [ ] Student list per class

### 5.3 Parent Portal (Mobile-Optimized)

**Route:** `/parent` (authenticated)

**Pages:**
- [ ] Dashboard (children overview)
- [ ] Results viewing
- [ ] Fee balance checking
- [ ] Payment history
- [ ] School notices
- [ ] Download receipts

**Design:** Mobile-first, PWA-ready

### 5.4 Communication Module

**Routes:**
- `/admin/notices` - Notice board CRUD
- `/admin/messages` - Internal messaging
- `/admin/sms` - Bulk SMS sender

### 5.5 Reports & Analytics

**Route:** `/admin/analytics`

**Charts (using Recharts/Tremor):**
- [ ] Fee collection trends
- [ ] Class performance
- [ ] Enrollment growth
- [ ] Attendance summaries
- [ ] Outstanding balances

---

## 6. Technical Specifications

### 6.1 Tech Stack Details

```json
{
  "frontend": {
    "framework": "Next.js 15",
    "router": "App Router",
    "language": "TypeScript",
    "styling": "Tailwind CSS",
    "components": "shadcn/ui",
    "state": "React Context + Server Actions",
    "forms": "react-hook-form + Zod",
    "tables": "@tanstack/react-table",
    "charts": "recharts or tremor",
    "pdf": "@react-pdf/renderer or jsPDF",
    "excel": "xlsx or sheetjs"
  },
  "backend": {
    "api": "Next.js API Routes",
    "database": "PostgreSQL with Prisma ORM",
    "auth": "JWT tokens",
    "fileStorage": "Cloudinary or local",
    "sms": "Africas Talking/Twilio integration",
    "payments": "M-Pesa Daraja API"
  }
}
```

### 6.2 Required Dependencies

```json
{
  "dependencies": {
    "@radix-ui/react-*": "latest",
    "@tanstack/react-table": "^8.x",
    "@hookform/resolvers": "^3.x",
    "react-hook-form": "^7.x",
    "zod": "^3.x",
    "recharts": "^2.x",
    "date-fns": "^3.x",
    "jspdf": "^2.x",
    "xlsx": "^0.18.x"
  }
}
```

### 6.3 File Structure

```
src/
├── app/
│   ├── (auth)/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── admin/
│   │   ├── teacher/
│   │   └── parent/
│   ├── api/                    ✅ Already exists
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                     ✅ shadcn/ui components
│   ├── dashboard/
│   ├── students/
│   ├── fees/
│   ├── attendance/
│   ├── exams/
│   └── shared/
├── lib/
│   ├── api.ts                  # API client wrapper
│   ├── auth.ts                 # Auth utilities
│   ├── utils.ts
│   └── validations.ts          # Zod schemas
├── hooks/
│   ├── useAuth.ts
│   ├── useApi.ts
│   └── usePagination.ts
├── types/
│   └── api.ts                  # TypeScript types
└── styles/
    └── globals.css
```

### 6.4 API Integration Pattern

```typescript
// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export const api = {
  // Auth
  login: (email: string, password: string) =>
    fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }),

  // Students
  getStudents: (params?: PaginationParams) =>
    fetchWithAuth(`${API_BASE}/api/students${params ? '?' + new URLSearchParams(params) : ''}`),

  // Dashboard
  getDashboardStats: () =>
    fetchWithAuth(`${API_BASE}/api/dashboard/stats`),
};

// Helper for authenticated requests
async function fetchWithAuth(url: string, options?: RequestInit) {
  const token = localStorage.getItem('token');
  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      'Authorization': `Bearer ${token}`,
    },
  });
}
```

---

## 7. Priority Implementation Plan

### Sprint 1: Foundation (Week 1)
- [ ] Fix routing - create all page files
- [ ] Implement auth flow & middleware
- [ ] Build dashboard layout shell
- [ ] Create reusable components (tables, filters, modals)

### Sprint 2: Core Modules (Week 2-3)
- [ ] Students module (list, profile, add/edit)
- [ ] Dashboard stats visualization
- [ ] User management pages

### Sprint 3: Fees & Payments (Week 4-5)
- [ ] Fees overview & student fee pages
- [ ] Payment modals (M-Pesa integration)
- [ ] Receipt generation (PDF)
- [ ] Fee reports

### Sprint 4: Attendance & Exams (Week 6-7)
- [ ] Attendance marking interface
- [ ] Attendance reports
- [ ] Exam management
- [ ] Report card generation
- [ ] Parent results portal

### Sprint 5: Portals & Polish (Week 8-9)
- [ ] Teacher dashboard
- [ ] Parent portal (mobile-optimized)
- [ ] Communication module
- [ ] Analytics dashboard
- [ ] UI polish & responsive fixes

### Sprint 6: Testing & Deploy (Week 10-11)
- [ ] Cross-browser testing
- [ ] Mobile testing
- [ ] Performance optimization
- [ ] Production deployment
- [ ] Documentation

---

## 8. Acceptance Criteria by Feature

### Authentication
- [ ] Login works with demo accounts
- [ ] Protected routes redirect unauthenticated users
- [ ] Token refresh handles expiration
- [ ] Logout clears session

### Dashboard
- [ ] Stats cards display correct numbers
- [ ] Charts render properly
- [ ] Recent activities update in real-time
- [ ] Mobile layout stacks correctly

### Students Module
- [ ] List page loads all 571 students with pagination
- [ ] Search filters by name/admission number
- [ ] Profile page shows all tabs (Personal, Academic, Fees, Attendance)
- [ ] Add student creates new record
- [ ] Edit student updates existing record
- [ ] Delete shows confirmation modal

### Fees Module
- [ ] Overview shows accurate totals
- [ ] Student fee page displays ledger
- [ ] Add payment modal submits successfully
- [ ] M-Pesa button triggers STK push
- [ ] Receipt generates PDF with school branding
- [ ] Outstanding balance calculates correctly

### Attendance
- [ ] Teacher can mark attendance for their class
- [ ] Absent students show in summary
- [ ] Attendance rate calculates correctly
- [ ] Report exports to PDF

### Exams
- [ ] Admin can create exams
- [ ] Marks entry interface is intuitive
- [ ] Report card includes all required sections
- [ ] Parent portal shows report card with valid PIN

---

## 9. UI/UX Guidelines

### Design System
- **Components:** shadcn/ui (already installed)
- **Colors:** Teal primary, Amber accent (school colors)
- **Typography:** Geist Sans/Mono (already configured)
- **Icons:** Lucide React
- **Dark Mode:** Supported (already configured)

### Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Accessibility
- [ ] All forms have proper labels
- [ ] Keyboard navigation works
- [ ] ARIA labels on interactive elements
- [ ] Color contrast meets WCAG AA

---

## 10. Testing Checklist

### Manual Testing
- [ ] All demo accounts login successfully
- [ ] Protected routes inaccessible without auth
- [ ] CRUD operations work for students
- [ ] Payment flow completes end-to-end
- [ ] PDF receipts download correctly
- [ ] Report cards generate properly
- [ ] Mobile views function correctly

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## 11. Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] API endpoint correct for production
- [ ] Build runs without errors
- [ ] Linting passes
- [ ] TypeScript compiles

### Production Deployment
```bash
# Build command
npm run build

# Start command
npm start

# Or Vercel/Netlify auto-deploy
```

### Post-Deployment
- [ ] Test login on production
- [ ] Verify API connectivity
- [ ] Test M-Pesa sandbox → production switch
- [ ] Monitor error logs for 24 hours

---

## 12. Demo Accounts

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Super Admin | admin@uwezoschool.co.ke | admin123 | Full system |
| Admin | admin2@uwezoschool.co.ke | admin123 | Admin functions |
| Teacher | teacher@uwezoschool.co.ke | teacher123 | Class functions |
| Teacher 2 | teacher2@uwezoschool.co.ke | teacher123 | Class functions |
| Parent | parent@uwezoschool.co.ke | parent123 | Child data only |

---

## 13. Notes for Developer

1. **Backend is done** — Focus on frontend pages
2. **API endpoints work** — Test with Postman/Thunder Client first
3. **Use existing components** — shadcn/ui already installed
4. **Keep it simple** — Don't over-engineer, get pages working first
5. **Mobile-first** — Test on mobile viewport early
6. **Type safety** — Use TypeScript for all new code
7. **Error boundaries** — Add error handling for better UX

---

## 14. Questions for Clarification

Before starting, confirm:
1. **API Base URL** - Is `https://m1vy02g3srx0-d.space.z.ai/` the correct API origin?
2. **Production URL** - Is `Uwezo School.wellwinschemist.co.ke` the final destination?
3. **M-Pesa Credentials** - Are sandbox credentials available for testing?
4. **SMS Provider** - Which provider (Africas Talking, Twilio)?
5. **PDF Library Preference** - @react-pdf/renderer or jsPDF?
6. **Deployment Platform** - Vercel, Netlify, or custom VPS?

---

**Document End**

> **Contact:** Allan Kimeli (Super Admin, Uwezo School)
> **Last Updated:** 2026-04-07
> **Version:** 2.0 (Next.js Edition)
