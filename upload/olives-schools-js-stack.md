# Olives School Management System — Modern JS Stack Developer Brief

> **Version:** 2.0 | **Stack:** Next.js + tRPC + MongoDB | **Last Updated:** 2026-04-03

---

## 1. Executive Summary

**Project:** Build a modern, full-stack School Management System for Olive Schools, Eldoret, Kenya using cutting-edge JavaScript technologies.

**Target:** Replace/Enhance existing Laravel system at `olives.wellwinschemist.co.ke`

**Current Scale:** 571 students across Pre-Nursery, Nursery, Primary, and Junior Secondary levels.

**Developer Role:** Full-stack TypeScript developer with Next.js, tRPC, MongoDB, and Kenya education domain expertise (CBC curriculum, M-Pesa integration).

---

## 2. Tech Stack (Production-Ready)

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Framework** | Next.js | 15+ | React framework with App Router, SSR, API Routes |
| **Language** | TypeScript | 5.3+ | Type safety across stack |
| **Backend** | tRPC | 11+ | End-to-end type-safe APIs, no codegen |
| **Database** | MongoDB | 7+ | Flexible document store for hierarchical school data |
| **ORM** | Mongoose | 8+ | MongoDB modeling with TypeScript support |
| **Auth** | Auth.js (NextAuth v5) | 5+ | Modular auth, credentials, 2FA, sessions |
| **UI Library** | shadcn/ui | Latest | Beautiful, accessible components (Radix UI + Tailwind) |
| **Styling** | Tailwind CSS | 3.4+ | Utility-first CSS with dark mode |
| **Forms** | React Hook Form + Zod | 7+ | Type-safe form validation |
| **Data Fetching** | TanStack Query (React Query) | 5+ | Server state, caching, background refetch |
| **Tables** | TanStack Table (React Table) | 8+ | Headless, powerful data grids |
| **Charts** | Recharts | Latest | Composable charting library |
| **Date/Time** | date-fns | 3+ | Tree-shakeable, immutable |
| **Icons** | Lucide React | Latest | Consistent icon set |
| **Payment** | @mpesa/mpesa-js-sdk | Official | Safaricom M-Pesa Daraja API |
| **SMS** | africastalking-ng | 0.7+ | SMS gateway for Kenya |
| **PDF** | @react-pdf/renderer | 3+ | React-based PDF generation |
| **Excel** | exceljs | 4+ | Import/Export spreadsheets |
| **Testing** | Vitest + Playwright | Latest | Unit + E2E testing |
| **Linting** | Biome | Latest | Fast linter/formatter (or ESLint + Prettier) |

### Why This Stack?

- **Next.js 15**: Most mature React framework, excellent DX, built-in optimization
- **tRPC**: Eliminates API boilerplate, 100% type safety from client to server
- **MongoDB**: Flexible schema perfect for evolving school data structures
- **shadcn/ui**: Copy-paste components, full ownership, beautiful defaults
- **TanStack Query**: Best-in-class server state management
- **TypeScript Everywhere**: One language, end-to-end type safety

---

## 3. Project Architecture

### 3.1 Directory Structure

```
olives-schools/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth route group
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── layout.tsx            # Auth layout
│   │   ├── (dashboard)/              # Dashboard route group
│   │   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   │   ├── page.tsx              # Dashboard home
│   │   │   ├── admin/                # Admin-only routes
│   │   │   │   ├── students/
│   │   │   │   ├── fees/
│   │   │   │   ├── exams/
│   │   │   │   ├── users/
│   │   │   │   └── settings/
│   │   │   ├── teacher/              # Teacher-only routes
│   │   │   │   ├── dashboard/
│   │   │   │   ├── attendance/
│   │   │   │   ├── marks/
│   │   │   │   └── timetable/
│   │   │   └── parent/               # Parent portal routes
│   │   ├── results/                  # Public results portal
│   │   ├── api/                      # API routes (if needed)
│   │   └── layout.tsx                # Root layout
│   │
│   ├── components/                   # React components
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── students/                 # Student feature components
│   │   │   ├── StudentTable.tsx
│   │   │   ├── StudentForm.tsx
│   │   │   └── StudentProfile.tsx
│   │   ├── fees/                     # Fee feature components
│   │   ├── exams/                    # Exam feature components
│   │   ├── dashboard/                # Dashboard widgets
│   │   └── layout/                   # Layout components
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       └── ProtectedRoute.tsx
│   │
│   ├── lib/                          # Utilities & services
│   │   ├── db.ts                     # MongoDB connection
│   │   ├── mpesa.ts                  # M-Pesa service wrapper
│   │   ├── sms.ts                    # SMS service wrapper
│   │   ├── pdf.ts                    # PDF generation utilities
│   │   ├── excel.ts                  # Excel import/export
│   │   ├── validation.ts             # Zod schemas
│   │   └── utils.ts                  # General utilities
│   │
│   ├── models/                       # Mongoose models
│   │   ├── User.model.ts
│   │   ├── Student.model.ts
│   │   ├── FeeTransaction.model.ts
│   │   ├── Exam.model.ts
│   │   ├── Attendance.model.ts
│   │   └── index.ts                  # Export all models
│   │
│   ├── server/                       # tRPC server setup
│   │   ├── routers/
│   │   │   ├── students.ts           # Student procedures
│   │   │   ├── fees.ts               # Fee procedures
│   │   │   ├── exams.ts              # Exam procedures
│   │   │   ├── users.ts              # User procedures
│   │   │   └── auth.ts               # Auth procedures
│   │   ├── context.ts                # tRPC context
│   │   ├── init.ts                   # tRPC initialization
│   │   └── root.ts                   # Root router
│   │
│   ├── styles/                       # Global styles
│   │   └── globals.css
│   │
│   └── types/                        # TypeScript types
│       ├── api.ts                    # API types
│       ├── models.ts                 # Model types
│       └── index.ts
│
├── public/                           # Static assets
│   ├── logo.png
│   └── reports/                      # Generated reports
│
├── tests/                            # Test files
│   ├── unit/                         # Vitest unit tests
│   └── e2e/                          # Playwright E2E tests
│
├── .env.local                        # Environment variables (gitignored)
├── .env.example                      # Environment template
├── next.config.ts                    # Next.js config
├── tailwind.config.ts                # Tailwind config
├── tsconfig.json                     # TypeScript config
├── package.json
└── README.md
```

### 3.2 Key Architectural Patterns

**Server-Client Communication:**
```typescript
// tRPC Router (server)
export const appRouter = router({
  students: studentsRouter,
  fees: feesRouter,
  exams: examsRouter,
});

// Client Usage (component)
const { data: students } = api.students.list.useQuery({
  page: 1,
  limit: 50,
});

// Mutation
const createStudent = api.students.create.useMutation();
```

**Data Fetching with TanStack Query:**
```typescript
// Automatic caching, refetching, optimistic updates
const utils = api.useUtils();

createStudent.mutate(data, {
  onSuccess: () => {
    utils.students.list.invalidate(); // Refetch
    toast.success("Student created");
  },
});
```

**Authentication Flow:**
```typescript
// Middleware-protected routes
export const { handlers, auth } = NextAuth({
  providers: [CredentialsProvider],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    session({ session, token }) {
      session.user.role = token.role;
      return session;
    },
  },
});
```

---

## 4. Critical Fixes (P0 — Immediate Blockers)

> **Definition:** These must be addressed first as they break core functionality.

### 4.1 Migration Strategy from Laravel

Since this is a rebuild, not a fix:

**Data Migration Required:**
- [ ] Export existing MySQL data from Laravel app
- [ ] Transform to MongoDB schema
- [ ] Import to new MongoDB database
- [ ] Verify data integrity (571 students must be present)

**Acceptance Criteria:**
- [ ] All existing students migrated with correct data
- [ ] User accounts created and accessible
- [ ] Fee history preserved
- [ ] Exam records migrated

### 4.2 Authentication System

**Required:**
- [ ] Implement NextAuth.js with credentials provider
- [ ] Role-based access control (RBAC)
- [ ] Protected routes with middleware
- [ ] Session management with JWT
- [ ] 2FA for Super Admin (optional, recommended)

**Roles:**
- `SUPER_ADMIN` - Full access
- `ADMIN` - School administration
- `TEACHER` - Class/subject teacher access
- `PARENT` - View own children
- `STUDENT` - View own records (future)

**Acceptance Criteria:**
- [ ] Login works for all user types
- [ ] Protected routes redirect to login if unauthenticated
- [ ] Role-based navigation shows correct menu items
- [ ] Sessions persist across page reloads
- [ ] Logout clears session correctly

---

## 5. Core Features (P1 — High Priority)

### 5.1 User Management & Onboarding

**Components to Build:**

#### 5.1.1 User CRUD
- [ ] List users with filtering (role, status, search)
- [ ] Create user (single form)
- [ ] Edit user
- [ ] Delete user (soft delete)
- [ ] User profile page

#### 5.1.2 Bulk Import
- [ ] CSV/Excel upload component
- [ ] Template download button
- [ ] Column mapping interface
- [ ] Validation with error display
- [ ] Preview before import
- [ ] Progress indicator for large files

**Schema (User):**
```typescript
{
  _id: ObjectId;
  name: string;
  email: string;
  username: string;
  phone: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'PARENT';
  status: 'ACTIVE' | 'INACTIVE';
  avatar?: string;
  address?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  nationality?: string;
  residence?: string;
  dateOfEmployment?: Date;
  linkedStudentIds?: ObjectId[];  // For parents
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;  // Soft delete
}
```

**Acceptance Criteria:**
- [ ] Create teacher via form
- [ ] Import 50+ teachers via CSV
- [ ] Link parent to multiple students
- [ ] Filter users by role and status
- [ ] Search users by name/email/phone

---

### 5.2 Student Module

**Components to Build:**

#### 5.2.1 Student List
- [ ] DataTable with server-side pagination
- [ ] Filters: class, admission status, gender
- [ ] Search: name, admission number
- [ ] Actions: View, Edit, Delete, Promote
- [ ] Bulk actions: Promote, Export

#### 5.2.2 Student Profile
```typescript
// Route: /dashboard/students/[id]
// Tabs: Overview | Academics | Fees | Attendance | Documents
```

**Tabs Detail:**

**Overview Tab:**
- [ ] Personal information card
- [ ] Parent/guardian cards (linked accounts)
- [ ] Quick stats: class, admission number, status
- [ ] Recent activities timeline

**Academics Tab:**
- [ ] Current class and subjects
- [ ] Exam results table (all terms)
- [ ] Performance chart (Recharts)
- [ ] Promotion history

**Fees Tab:**
- [ ] Fee ledger (transactions)
- [ ] Balance summary card
- [ ] Payment history table
- [ ] Download receipts (PDF)

**Attendance Tab:**
- [ ] Attendance calendar (date-fns)
- [ ] Attendance percentage
- [ ] Absence reasons
- [ ] Monthly summary

**Schema (Student):**
```typescript
{
  _id: ObjectId;
  admissionNumber: string;  // Unique
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'MALE' | 'FEMALE';
  classId: ObjectId;  // Reference to Class
  stream?: string;    // A, B, C, etc.
  status: 'ACTIVE' | 'GRADUATED' | 'TRANSFERRED' | 'INACTIVE';
  photo?: string;
  address?: string;
  parentId?: ObjectId;  // Primary parent
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  medicalConditions?: string;
  allergies?: string;
  admissionDate: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 5.2.3 Student Promotion
- [ ] Promote individual student
- [ ] Bulk promote by class
- [ ] Promotion creates academic record
- [ ] Option to prevent if fees outstanding
- [ ] Promotion report (PDF)

**Acceptance Criteria:**
- [ ] View student list with filters
- [ ] Create new student
- [ ] View complete student profile
- [ ] Promote entire Grade 6 to Grade 7
- [ ] Export student list to Excel

---

### 5.3 Accounts & Fee Management

**Components to Build:**

#### 5.3.1 Fee Structure Management
- [ ] Define fee structure per class/term
- [ ] Fee categories: Tuition, Transport, Boarding, etc.
- [ ] Copy fee structure to new term
- [ ] Activate fee structure for term

#### 5.3.2 Fee Assignment
- [ ] Auto-assign fees on enrollment
- [ ] Manual fee assignment
- [ ] Bulk assign by class
- [ ] Fee waivers/discounts

#### 5.3.3 Payment Processing
- [ ] Record manual payment (cash/bank)
- [ ] Initiate M-Pesa STK Push
- [ ] Handle M-Pesa callback
- [ ] Auto-generate receipt on success
- [ ] Refund processing

#### 5.3.4 Fee Reports
- [ ] Class-wise collection report
- [ ] Outstanding balances
- [ ] Daily/weekly/monthly summary
- [ ] Payment method breakdown
- [ ] Export to PDF/Excel

**M-Pesa Integration:**
```typescript
// lib/mpesa.ts
import { Mpesa } from '@mpesa/mpesa-js-sdk';

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  environment: 'sandbox', // or 'production'
});

export async function initiateStkPush(phone: string, amount: number, orderId: string) {
  const response = await mpesa.stkPush({
    phoneNumber: phone,
    amount: amount,
    accountReference: orderId,
    transactionDesc: 'School Fee Payment',
    callbackUrl: `${process.env.APP_URL}/api/mpesa/callback`,
  });
  return response;
}
```

**Schema (FeeTransaction):**
```typescript
{
  _id: ObjectId;
  studentId: ObjectId;
  term: string;  // "2026-1"
  feeStructureId: ObjectId;
  amount: number;
  paymentMethod: 'CASH' | 'BANK' | 'MPESA';
  transactionId?: string;  // M-Pesa transaction ID
  receiptNumber: string;  // Unique
  receiptUrl?: string;  // PDF URL
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  createdAt: Date;
  updatedAt: Date;
}
```

**Acceptance Criteria:**
- [ ] Create fee structure for class
- [ ] Assign fees to students
- [ ] Record cash payment
- [ ] Process M-Pesa payment (STK Push)
- [ ] Generate PDF receipt
- [ ] View fee ledger
- [ ] Export collection report

---

### 5.4 Exam & Results System

**Components to Build:**

#### 5.4.1 Exam Management
- [ ] Create exam (name, term, type)
- [ ] Define exam subjects
- [ ] Set marking weights
- [ ] Activate/deactivate exam

#### 5.4.2 Mark Entry
- [ ] Enter marks by subject/class
- [ ] Auto-calculate grades (CBC or traditional)
- [ ] Validation (0-100 range)
- [ ] Save draft / Submit
- [ ] Bulk mark import (Excel)

#### 5.4.3 Report Cards
- [ ] Individual report card generation
- [ ] Bulk generation by class
- [ ] Branded template (school logo)
- [ ] Include: marks, grades, position, remarks
- [ ] PDF download
- [ ] Email/SMS to parents

#### 5.4.4 Parent Results Portal
- [ ] Public route: `/results`
- [ ] PIN entry form
- [ ] Display student report card
- [ ] Download/print option
- [ ] Mark PIN as used
- [ ] Rate limit (3 attempts)

**CBC Grading Logic:**
```typescript
// lib/validation.ts - Zod schema for CBC grading
const cbcGradeSchema = z.object({
  score: z.number().min(0).max(100),
  level: z.enum(['PP1', 'PP2', 'GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5', 'GRADE_6']),
});

function getCBCGrade(score: number, level: string): string {
  if (['PP1', 'PP2', 'GRADE_1', 'GRADE_2', 'GRADE_3'].includes(level)) {
    // Pre-primary and lower primary use 4-level scale
    if (score >= 80) return 'EE'; // Exceeds Expectations
    if (score >= 65) return 'ME'; // Meets Expectations
    if (score >= 50) return 'AE'; // Approaching Expectations
    return 'BE';                  // Below Expectations
  } else {
    // Upper primary uses 1-4 scale
    if (score >= 70) return '1';
    if (score >= 60) return '2';
    if (score >= 50) return '3';
    return '4';
  }
}
```

**Schema (Exam):**
```typescript
{
  _id: ObjectId;
  name: string;
  term: string;  // "2026-1"
  type: 'CAT_1' | 'CAT_2' | 'END_TERM';
  classIds: ObjectId[];
  startDate: Date;
  endDate: Date;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
  createdAt: Date;
  updatedAt: Date;
}
```

**Schema (ExamMark):**
```typescript
{
  _id: ObjectId;
  examId: ObjectId;
  studentId: ObjectId;
  subjectId: ObjectId;
  marks: number;
  grade: string;
  remarks?: string;
  enteredBy: ObjectId;  // Teacher ID
  enteredAt: Date;
}
```

**Acceptance Criteria:**
- [ ] Create new exam
- [ ] Enter marks for subject/class
- [ ] Auto-calculate grades based on score
- [ ] Generate individual PDF report card
- [ ] Bulk generate report cards
- [ ] Parent accesses results via PIN
- [ ] Send results via SMS

---

### 5.5 Attendance System

**Components to Build:**

#### 5.5.1 Attendance Marking
- [ ] Mark attendance by class
- [ ] Status options: Present, Absent, Late, Excused
- [ ] Reason input for absences
- [ ] Quick-fill (mark all present)
- [ ] Auto-save

#### 5.5.2 Attendance Calendar
- [ ] Monthly calendar view
- [ ] Color-coded attendance
- [ ] Click to view details
- [ ] Attendance percentage

#### 5.5.3 Absentee Alerts
- [ ] Auto-send SMS on absence
- [ ] Configurable timing (immediate/end of day)
- [ ] Include class, date, reason

#### 5.5.4 Reports
- [ ] Individual student history
- [ ] Class-wise summary
- [ ] Chronic absenteeism report

**Schema (Attendance):**
```typescript
{
  _id: ObjectId;
  studentId: ObjectId;
  classId: ObjectId;
  date: Date;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  reason?: string;
  markedBy: ObjectId;  // Teacher ID
  smsSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Acceptance Criteria:**
- [ ] Mark attendance for class
- [ ] Auto-send SMS for absent students
- [ ] View attendance calendar
- [ ] Generate attendance report

---

## 6. Enhanced Features (P2)

### 6.1 Teacher Dashboard

**Route:** `/dashboard/teacher`

**Widgets:**
- [ ] My Classes (with student counts)
- [ ] Today's Timetable
- [ ] Pending: Mark entry, Attendance
- [ ] Quick actions: Take Attendance, Enter Marks
- [ ] Recent activities

### 6.2 Parent Portal

**Route:** `/dashboard/parent`

**Features:**
- [ ] View children's results
- [ ] Check fee balances
- [ ] View school notices
- [ ] Download fee receipts
- [ ] Message teachers
- [ ] Update contact info
- [ ] Opt-in/out for SMS

**Design:** Mobile-optimized, PWA-ready

### 6.3 School Events Calendar

**Components:**
- [ ] FullCalendar or react-big-calendar
- [ ] CRUD operations for events
- [ ] Categories: Academic, Sports, Holidays
- [ ] Notifications to roles
- [ ] Export to iCal

### 6.4 Communication Module

**Components:**
- [ ] Notice board (school/class notices)
- [ ] Internal messaging (threaded)
- [ ] SMS blast (bulk messaging)
- [ ] Message templates
- [ ] Delivery tracking

### 6.5 Analytics Dashboard

**Route:** `/dashboard/admin/analytics`

**Charts (Recharts):**
- [ ] Fee collection trends (Line chart)
- [ ] Class performance (Bar chart)
- [ ] Enrollment growth (Area chart)
- [ ] Attendance summary (Pie chart)

---

## 7. UI/UX Guidelines

### 7.1 Design System

**Use shadcn/ui as base:**
- [ ] All components from `components/ui`
- [ ] Consistent spacing (Tailwind spacing scale)
- [ ] Consistent colors (primary, secondary, muted, etc.)
- [ ] Dark mode support

**Custom Theme:**
```css
/* tailwind.config.ts - School colors */
{
  primary: '#0d9488',  // Teal-600 (school green)
  secondary: '#f59e0b', // Amber-500
  accent: '#8b5cf6',   // Violet-500
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
}
```

### 7.2 Responsive Design

- [ ] Mobile-first approach
- [ ] Breakpoints: 640px (sm), 768px (md), 1024px (lg), 1280px (xl)
- [ ] Touch targets: min 44x44px
- [ ] Test on: 320px - 1920px

### 7.3 Loading States

- [ ] Skeleton loaders for tables
- [ ] Spinners for buttons
- [ ] Progress bars for uploads
- [ ] Optimistic UI where appropriate

### 7.4 Feedback

- [ ] Toast notifications (sonner/toast)
- [ ] Confirmation dialogs for destructive actions
- [ ] Form validation messages
- [ ] Success/error states

---

## 8. Security & Best Practices

### 8.1 Authentication

- [ ] NextAuth.js session management
- [ ] HTTP-only cookies for session tokens
- [ ] CSRF protection (built-in with Next.js)
- [ ] Rate limiting on login attempts
- [ ] 2FA for Super Admin (use @authenticator or similar)

### 8.2 Authorization

- [ ] Middleware-protected routes
- [ ] Role-based access control
- [ ] Row-level security (parents see own children only)
- [ ] API route protection

**Middleware Example:**
```typescript
// middleware.ts
export { auth as middleware } from '@/auth.config'; // NextAuth

// In route handlers:
export const GET = async () => {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return new Response('Unauthorized', { status: 401 });
  }
  // ...
};
```

### 8.3 Input Validation

- [ ] All forms use React Hook Form + Zod
- [ ] Server-side validation in tRPC procedures
- [ ] Sanitize user inputs
- [ ] File upload restrictions

```typescript
// Zod schema example
const createStudentSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email().optional(),
  phone: z.string().regex(/^254[0-9]{9}$/), // Kenya format
  classId: z.string().regex(/^[0-9a-f]{24}$/),
});
```

### 8.4 Data Protection

- [ ] No sensitive data in localStorage
- [ ] Environment variables for secrets
- [ ] MongoDB connection pooling
- [ ] API key rotation strategy
- [ ] Regular backups

### 8.5 Performance

- [ ] Image optimization (Next.js Image)
- [ ] Server-side pagination for large datasets
- [ ] TanStack Query caching
- [ ] Code splitting (automatic with App Router)
- [ ] Lazy loading for heavy components

---

## 9. Testing Strategy

### 9.1 Unit Tests (Vitest)

**Coverage goal:** 70%+

**Test:**
- [ ] Utility functions (validation, formatting)
- [ ] tRPC procedures (with mock DB)
- [ ] Mongoose models (validation)

```typescript
// Example unit test
import { describe, it, expect } from 'vitest';
import { getCBCGrade } from '@/lib/validation';

describe('CBC Grading', () => {
  it('should return EE for score >= 80 in lower primary', () => {
    expect(getCBCGrade(85, 'GRADE_2')).toBe('EE');
  });
  // ...
});
```

### 9.2 E2E Tests (Playwright)

**Critical flows:**
- [ ] Login/logout
- [ ] Create student
- [ ] Record payment
- [ ] Enter exam marks
- [ ] Generate report card
- [ ] Parent results access

```typescript
// Example E2E test
test('admin can create student', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'admin@olives.co.ke');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');

  await page.click('text=Students');
  await page.click('text=Add Student');
  await page.fill('[name="firstName"]', 'John');
  await page.fill('[name="lastName"]', 'Doe');
  await page.click('button[type="submit"]');

  await expect(page.locator('text=Student created')).toBeVisible();
});
```

---

## 10. Deployment

### 10.1 Hosting Options

| Provider | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| Vercel | Zero-config, great DX | MongoDB requires separate | ✅ Recommended |
| Netlify | Similar to Vercel | Less Next.js optimization | |
| Railway | Full-stack hosting | Newer, less mature | |
| DigitalOcean App Platform | Full control | Manual setup | |
| AWS Amplify | Enterprise features | Complex | |

**Recommended:** Vercel for frontend + MongoDB Atlas for database

### 10.2 Environment Variables

```bash
# .env.example

# App
NEXT_PUBLIC_APP_URL=https://olives.wellwinschemist.co.ke
NEXT_PUBLIC_APP_NAME="Olives School Management System"

# MongoDB
MONGODB_URI=mongodb+srv://...

# Auth (NextAuth)
AUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://olives.wellwinschemist.co.ke

# M-Pesa
MPESA_CONSUMER_KEY=your-key
MPESA_CONSUMER_SECRET=your-secret
MPESA_PASSKEY=your-passkey
MPESA_SHORTCODE=174379
MPESA_ENVIRONMENT=sandbox

# SMS (Africas Talking)
AT_USERNAME=your-username
AT_API_KEY=your-api-key

# Email (Resend/SendGrid)
SMTP_HOST=smtp.host.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
```

### 10.3 Deployment Checklist

**Pre-deployment:**
- [ ] All P0 features working
- [ ] Environment variables configured
- [ ] Database indexes created
- [ ] M-Pesa sandbox tested
- [ ] SMS gateway tested
- [ ] Backups configured

**Deployment:**
- [ ] Connect Git repo to Vercel
- [ ] Configure environment variables
- [ ] Deploy to preview environment
- [ ] Test preview URL
- [ ] Deploy to production

**Post-deployment:**
- [ ] Run smoke tests
- [ ] Verify M-Pesa callbacks
- [ ] Verify SMS delivery
- [ ] Monitor error logs (Vercel/Sentry)
- [ ] Create database backup

---

## 11. Deliverables

1. **Source Code** — Complete Next.js application with all features
2. **Database** — MongoDB schema with indexes
3. **Documentation**:
   - README.md with setup instructions
   - API documentation (tRPC procedures)
   - User guide for admins
4. **Tests** — Unit + E2E tests
5. **Deployment Guide** — Step-by-step Vercel deployment
6. **Data Migration** — Script to migrate from existing MySQL

---

## 12. Development Roadmap

### Sprint 1 (Week 1): Foundation
- [ ] Project setup (Next.js, TypeScript, Tailwind)
- [ ] MongoDB connection
- [ ] Authentication (NextAuth)
- [ ] Base layout (Sidebar, Header)
- [ ] User CRUD

### Sprint 2 (Week 2-3): Students
- [ ] Student models and tRPC procedures
- [ ] Student list (DataTable)
- [ ] Student form (create/edit)
- [ ] Student profile page
- [ ] Bulk import (CSV)

### Sprint 3 (Week 4): Fees
- [ ] Fee structure models
- [ ] Fee assignment
- [ ] Payment recording
- [ ] M-Pesa integration
- [ ] PDF receipts
- [ ] Fee reports

### Sprint 4 (Week 5-6): Exams
- [ ] Exam models
- [ ] Mark entry forms
- [ ] CBC grading logic
- [ ] Report card generation (PDF)
- [ ] Parent results portal
- [ ] PIN management

### Sprint 5 (Week 7): Attendance
- [ ] Attendance models
- [ ] Attendance marking
- [ ] Attendance calendar
- [ ] SMS alerts
- [ ] Reports

### Sprint 6 (Week 8): Dashboards
- [ ] Admin dashboard widgets
- [ ] Teacher dashboard
- [ ] Parent portal
- [ ] Analytics (charts)

### Sprint 7 (Week 9): Enhancements
- [ ] Events calendar
- [ ] Communication module
- [ ] SMS blast
- [ ] Notice board

### Sprint 8 (Week 10): Polish
- [ ] Dark mode
- [ ] Responsive fixes
- [ ] Performance optimization
- [ ] Error handling
- [ ] Loading states

### Sprint 9 (Week 11): Testing
- [ ] Unit tests (70%+ coverage)
- [ ] E2E tests (critical flows)
- [ ] Bug fixes

### Sprint 10 (Week 12): Deploy
- [ ] Data migration
- [ ] Production deployment
- [ ] User acceptance testing
- [ ] Documentation
- [ ] Handover

---

## 13. Questions for Stakeholder

Before development begins:

1. **Hosting Preference**: Vercel recommended. Any preference?
2. **M-Pesa**: Do you have Safaricom Daraja credentials?
3. **SMS**: Africas Talking confirmed? Account details?
4. **Data Migration**: Export from existing MySQL available?
5. **Timeline**: 12-week roadmap acceptable?
6. **Priority**: Are all P1 features required, or some deferred?
7. **Training**: Is training material needed for staff?

---

## 14. Getting Started (Developer)

```bash
# 1. Create project
npx create-next-app@latest olives-schools --typescript --tailwind --app
cd olives-schools

# 2. Install dependencies
npm install @trpc/server@next @trpc/client@next @trpc/react-query@next @tanstack/react-query
npm install mongoose zod react-hook-form @hookform/resolvers
npm install next-auth@beta
npm install -D @types/node

# 3. Install shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input label select table dialog toast

# 4. Install additional packages
npm install date-fns lucide-react recharts
npm install @mpesa/mpesa-js-sdk africastalking-ng
npm install @react-pdf/renderer exceljs
npm install sonner  # Toast notifications

# 5. Install dev dependencies
npm install -D vitest @vitest/ui playwright @playwright/test

# 6. Setup MongoDB
# Create free cluster at mongodb.com
# Get connection string

# 7. Setup environment
cp .env.example .env.local
# Add your values

# 8. Run development
npm run dev

# 9. Run tests
npm run test
npm run test:e2e
```

---

**Document End**

> This brief provides everything needed to build a modern, production-ready School Management System using cutting-edge JavaScript technologies. For questions during development, contact: Allan Kimeli (Super Admin, Olives Schools)
