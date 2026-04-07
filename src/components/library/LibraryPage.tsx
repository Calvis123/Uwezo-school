'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  BookCopy,
  ArrowRightLeft,
  Filter,
  Library,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { libraryApi, studentsApi } from '@/lib/api'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────
interface LibraryBook {
  id: string
  title: string
  author: string
  isbn: string | null
  category: string
  publisher: string | null
  year: number | null
  totalCopies: number
  availableCopies: number
  shelfLocation: string | null
  status: string
}

interface BookIssue {
  id: string
  bookId: string
  studentId: string
  issueDate: string
  dueDate: string
  returnDate: string | null
  status: string
  book: { title: string; author: string; isbn: string | null }
  student: { firstName: string; lastName: string; admissionNumber: string }
}

interface LibraryStats {
  totalBooks: number
  availableBooks: number
  lowStockBooks: number
  outOfStockBooks: number
  issuedCount: number
  overdueCount: number
}

const CATEGORIES = ['FICTION', 'NON_FICTION', 'REFERENCE', 'TEXTBOOK', 'STORYBOOK'] as const
const STATUSES = ['AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK'] as const

const categoryColors: Record<string, string> = {
  FICTION: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  NON_FICTION: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  REFERENCE: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  TEXTBOOK: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  STORYBOOK: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
}

const categoryLabels: Record<string, string> = {
  FICTION: 'Fiction',
  NON_FICTION: 'Non-Fiction',
  REFERENCE: 'Reference',
  TEXTBOOK: 'Textbook',
  STORYBOOK: 'Storybook',
}

const statusColors: Record<string, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  LOW_STOCK: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  OUT_OF_STOCK: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const issueStatusColors: Record<string, string> = {
  ISSUED: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  RETURNED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

// ─── Pagination Helper ────────────────────────────────
function getPageNumbers(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
  if (currentPage <= 3) return [1, 2, 3, 4, 5]
  if (currentPage >= totalPages - 2) return Array.from({ length: 5 }, (_, i) => totalPages - 4 + i)
  return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2]
}

function PaginationControls({ page, totalPages, total, limit, onPageChange }: { page: number; totalPages: number; total: number; limit: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {getPageNumbers(page, totalPages).map((pn) => (
          <Button key={pn} variant={page === pn ? 'default' : 'ghost'} size="sm" className="h-8 w-8 p-0 text-xs" onClick={() => onPageChange(pn)}>
            {pn}
          </Button>
        ))}
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

// ─── Books Tab ────────────────────────────────────────
function BooksTab() {
  const [books, setBooks] = useState<LibraryBook[]>([])
  const [stats, setStats] = useState<LibraryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [bookDialogOpen, setBookDialogOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<LibraryBook | null>(null)
  const [bookForm, setBookForm] = useState({
    title: '', author: '', isbn: '', category: 'FICTION',
    publisher: '', year: '', totalCopies: '1', shelfLocation: '',
  })
  const [bookSaving, setBookSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function loadBooks(p: number, s: string, c: string, st: string) {
    setLoading(true)
    const res = await libraryApi.books({ page: p, limit: 20, search: s || undefined, category: c || undefined, status: st || undefined })
    if (res.success && res.data) {
      setBooks(res.data.books)
      setStats(res.data.stats)
      setTotalPages(res.data.pagination.pages)
      setTotalCount(res.data.pagination.total)
    }
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadBooks(1, '', '', '') }, [])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadBooks(page, search, categoryFilter, statusFilter) }, [page, search, categoryFilter, statusFilter])

  const openCreateDialog = () => {
    setEditingBook(null)
    setBookForm({ title: '', author: '', isbn: '', category: 'FICTION', publisher: '', year: '', totalCopies: '1', shelfLocation: '' })
    setBookDialogOpen(true)
  }

  const openEditDialog = (book: LibraryBook) => {
    setEditingBook(book)
    setBookForm({ title: book.title, author: book.author, isbn: book.isbn || '', category: book.category, publisher: book.publisher || '', year: book.year ? String(book.year) : '', totalCopies: String(book.totalCopies), shelfLocation: book.shelfLocation || '' })
    setBookDialogOpen(true)
  }

  const handleSaveBook = async () => {
    if (!bookForm.title.trim() || !bookForm.author.trim()) { toast.error('Title and author are required'); return }
    setBookSaving(true)
    const res = editingBook ? await libraryApi.updateBook(editingBook.id, bookForm) : await libraryApi.createBook(bookForm)
    if (res.success) { toast.success(editingBook ? 'Book updated' : 'Book added'); setBookDialogOpen(false); loadBooks(page, search, categoryFilter, statusFilter) }
    else { toast.error(res.error || 'Failed to save book') }
    setBookSaving(false)
  }

  const handleDeleteBook = async () => {
    if (!deleteId) return
    const res = await libraryApi.deleteBook(deleteId)
    if (res.success) { toast.success('Book deleted'); setDeleteId(null); loadBooks(page, search, categoryFilter, statusFilter) }
    else { toast.error(res.error || 'Failed to delete') }
  }

  const hasActiveFilters = search || categoryFilter || statusFilter

  return (
    <div className="space-y-4">
      {!loading && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Books', value: stats.totalBooks, icon: Library, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/30' },
            { label: 'Available', value: stats.availableBooks, icon: BookCopy, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
            { label: 'Issued', value: stats.issuedCount, icon: ArrowRightLeft, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/30' },
            { label: 'Overdue', value: stats.overdueCount, icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30' },
          ].map((stat) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <Card className="border-slate-200/80 dark:border-slate-700/60">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.bg}`}><stat.icon className={`w-4 h-4 ${stat.color}`} /></div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{stat.label}</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
      {loading && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-lg" />)}</div>}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <Input placeholder="Search title or author..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
          </div>
          <Select value={categoryFilter} onValueChange={(val) => { setCategoryFilter(val); setPage(1) }}>
            <SelectTrigger size="sm" className="w-full sm:w-[140px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <Filter className="w-3.5 h-3.5 mr-1 text-slate-400" /><SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>{CATEGORIES.map((cat) => <SelectItem key={cat} value={cat}>{categoryLabels[cat]}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1) }}>
            <SelectTrigger size="sm" className="w-full sm:w-[140px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>{STATUSES.map((st) => <SelectItem key={st} value={st}>{st.replace('_', ' ')}</SelectItem>)}</SelectContent>
          </Select>
          {hasActiveFilters && <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setCategoryFilter(''); setStatusFilter(''); setPage(1) }} className="text-slate-500">Clear all</Button>}
        </div>
        <Button onClick={openCreateDialog} className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm"><Plus className="w-4 h-4 mr-1.5" />Add Book</Button>
      </div>

      <Card className="border-slate-200/80 dark:border-slate-700/60 overflow-hidden">
        <CardContent className="p-0">
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300 hidden sm:table-cell">Author</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300 hidden md:table-cell">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300 hidden lg:table-cell">ISBN</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Copies</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300 hidden lg:table-cell">Shelf</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16 mx-auto" /></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-12" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full mx-auto" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-16 ml-auto" /></td>
                  </tr>
                )) : books.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center">
                    <BookOpen className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No books found</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try adjusting your search or filters</p>
                  </td></tr>
                ) : books.map((book, idx) => (
                  <motion.tr key={book.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-4 py-3"><div><p className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[200px]">{book.title}</p><p className="text-xs text-slate-500 dark:text-slate-400 sm:hidden">{book.author}</p></div></td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 hidden sm:table-cell">{book.author}</td>
                    <td className="px-4 py-3 hidden md:table-cell"><Badge variant="secondary" className={`text-[10px] px-2 py-0 font-medium ${categoryColors[book.category] || ''}`}>{categoryLabels[book.category] || book.category}</Badge></td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 font-mono hidden lg:table-cell">{book.isbn || '—'}</td>
                    <td className="px-4 py-3 text-center"><span className={`font-medium tabular-nums ${book.availableCopies === 0 ? 'text-red-600 dark:text-red-400' : book.availableCopies <= 2 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}`}>{book.availableCopies}</span><span className="text-slate-400 dark:text-slate-500">/{book.totalCopies}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 hidden lg:table-cell">{book.shelfLocation || '—'}</td>
                    <td className="px-4 py-3 text-center"><Badge variant="secondary" className={`text-[10px] px-2 py-0 font-medium ${statusColors[book.status] || ''}`}>{book.status.replace('_', ' ')}</Badge></td>
                    <td className="px-4 py-3 text-right"><div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100"><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-teal-600" onClick={() => openEditDialog(book)}><Pencil className="w-3.5 h-3.5" /></Button><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-red-600" onClick={() => setDeleteId(book.id)}><Trash2 className="w-3.5 h-3.5" /></Button></div></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls page={page} totalPages={totalPages} total={totalCount} limit={20} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={bookDialogOpen} onOpenChange={setBookDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBook ? 'Edit Book' : 'Add New Book'}</DialogTitle>
            <DialogDescription>{editingBook ? 'Update book information below.' : 'Fill in the details to add a new book to the library.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label htmlFor="book-title">Title *</Label><Input id="book-title" value={bookForm.title} onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })} placeholder="Book title" className="bg-white dark:bg-slate-800" /></div>
            <div className="grid gap-2"><Label htmlFor="book-author">Author *</Label><Input id="book-author" value={bookForm.author} onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })} placeholder="Author name" className="bg-white dark:bg-slate-800" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label htmlFor="book-isbn">ISBN</Label><Input id="book-isbn" value={bookForm.isbn} onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })} placeholder="978-..." className="bg-white dark:bg-slate-800" /></div>
              <div className="grid gap-2"><Label htmlFor="book-year">Year</Label><Input id="book-year" value={bookForm.year} onChange={(e) => setBookForm({ ...bookForm, year: e.target.value })} placeholder="2024" className="bg-white dark:bg-slate-800" /></div>
            </div>
            <div className="grid gap-2"><Label htmlFor="book-category">Category</Label><Select value={bookForm.category} onValueChange={(val) => setBookForm({ ...bookForm, category: val })}><SelectTrigger className="bg-white dark:bg-slate-800"><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((cat) => <SelectItem key={cat} value={cat}>{categoryLabels[cat]}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-2"><Label htmlFor="book-publisher">Publisher</Label><Input id="book-publisher" value={bookForm.publisher} onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })} placeholder="Publisher name" className="bg-white dark:bg-slate-800" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label htmlFor="book-copies">Total Copies</Label><Input id="book-copies" type="number" min="1" value={bookForm.totalCopies} onChange={(e) => setBookForm({ ...bookForm, totalCopies: e.target.value })} className="bg-white dark:bg-slate-800" /></div>
              <div className="grid gap-2"><Label htmlFor="book-shelf">Shelf Location</Label><Input id="book-shelf" value={bookForm.shelfLocation} onChange={(e) => setBookForm({ ...bookForm, shelfLocation: e.target.value })} placeholder="A1-01" className="bg-white dark:bg-slate-800" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveBook} disabled={bookSaving} className="bg-teal-600 hover:bg-teal-700 text-white">{bookSaving ? 'Saving...' : editingBook ? 'Update Book' : 'Add Book'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Book</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this book? This action cannot be undone. Books with currently issued copies cannot be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBook} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Issues Tab ───────────────────────────────────────
function IssuesTab() {
  const [issues, setIssues] = useState<BookIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalIssues, setTotalIssues] = useState(0)

  const [issueDialogOpen, setIssueDialogOpen] = useState(false)
  const [students, setStudents] = useState<{ id: string; firstName: string; lastName: string; admissionNumber: string }[]>([])
  const [availableBooks, setAvailableBooks] = useState<{ id: string; title: string; author: string }[]>([])
  const [issueForm, setIssueForm] = useState({ studentId: '', bookId: '', dueDate: '' })
  const [issueSaving, setIssueSaving] = useState(false)
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [booksLoading, setBooksLoading] = useState(false)
  const [returningId, setReturningId] = useState<string | null>(null)

  async function loadIssues(p: number, s: string, st: string) {
    setLoading(true)
    const res = await libraryApi.issues({ page: p, limit: 20, status: st || undefined, search: s || undefined })
    if (res.success && res.data) {
      setIssues(res.data.issues)
      setTotalPages(res.data.pagination.pages)
      setTotalIssues(res.data.pagination.total)
    }
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadIssues(1, '', '') }, [])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadIssues(page, search, statusFilter) }, [page, search, statusFilter])

  const openIssueDialog = async () => {
    setIssueForm({ studentId: '', bookId: '', dueDate: '' })
    setIssueDialogOpen(true)
    setStudentsLoading(true)
    setBooksLoading(true)
    const studentRes = await studentsApi.list({ limit: 200, status: 'ACTIVE' })
    if (studentRes.success && studentRes.data) setStudents(studentRes.data.students || [])
    setStudentsLoading(false)
    const booksRes = await libraryApi.books({ limit: 200 })
    if (booksRes.success && booksRes.data) {
      const available = booksRes.data.books.filter((b: LibraryBook) => b.availableCopies > 0)
      setAvailableBooks(available.map((b: LibraryBook) => ({ id: b.id, title: b.title, author: b.author })))
    }
    setBooksLoading(false)
  }

  const handleIssueBook = async () => {
    if (!issueForm.studentId || !issueForm.bookId || !issueForm.dueDate) { toast.error('Please select a student, book, and due date'); return }
    setIssueSaving(true)
    const res = await libraryApi.issueBook({ studentId: issueForm.studentId, bookId: issueForm.bookId, dueDate: issueForm.dueDate })
    if (res.success) { toast.success('Book issued successfully'); setIssueDialogOpen(false); loadIssues(page, search, statusFilter) }
    else { toast.error(res.error || 'Failed to issue book') }
    setIssueSaving(false)
  }

  const handleReturnBook = async () => {
    if (!returningId) return
    const res = await libraryApi.returnBook(returningId)
    if (res.success) { toast.success('Book returned successfully'); setReturningId(null); loadIssues(page, search, statusFilter) }
    else { toast.error(res.error || 'Failed to return book') }
  }

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Currently Issued', count: issues.filter(i => i.status === 'ISSUED').length, icon: ArrowRightLeft, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/30' },
          { label: 'Returned', count: issues.filter(i => i.status === 'RETURNED').length, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
          { label: 'Overdue', count: issues.filter(i => i.status === 'OVERDUE').length, icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30' },
        ].map((stat) => (
          <Card key={stat.label} className="border-slate-200/80 dark:border-slate-700/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bg}`}><stat.icon className={`w-4 h-4 ${stat.color}`} /></div>
              <div><p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p><p className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">{stat.count}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <Input placeholder="Search student or book..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
          </div>
          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1) }}>
            <SelectTrigger size="sm" className="w-full sm:w-[140px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <Filter className="w-3.5 h-3.5 mr-1 text-slate-400" /><SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ISSUED">Issued</SelectItem>
              <SelectItem value="RETURNED">Returned</SelectItem>
              <SelectItem value="OVERDUE">Overdue</SelectItem>
            </SelectContent>
          </Select>
          {(statusFilter || search) && <Button variant="ghost" size="sm" onClick={() => { setStatusFilter(''); setSearch(''); setPage(1) }} className="text-slate-500">Clear all</Button>}
        </div>
        <Button onClick={openIssueDialog} className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm"><ArrowRightLeft className="w-4 h-4 mr-1.5" />Issue New Book</Button>
      </div>

      <Card className="border-slate-200/80 dark:border-slate-700/60 overflow-hidden">
        <CardContent className="p-0">
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Student</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300 hidden sm:table-cell">Book</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300 hidden md:table-cell">Issue Date</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300 hidden lg:table-cell">Due Date</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300 hidden lg:table-cell">Return Date</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td><td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-4 w-36" /></td><td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td><td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-24" /></td><td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-24" /></td><td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full mx-auto" /></td><td className="px-4 py-3"><Skeleton className="h-8 w-20 ml-auto" /></td></tr>
                )) : issues.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-16 text-center"><ArrowRightLeft className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" /><p className="text-sm font-medium text-slate-500 dark:text-slate-400">No book issues found</p><p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Issue a book to get started</p></td></tr>
                ) : issues.map((issue, idx) => (
                  <motion.tr key={issue.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3"><div><p className="font-medium text-slate-900 dark:text-slate-100">{issue.student.firstName} {issue.student.lastName}</p><p className="text-xs text-slate-500 dark:text-slate-400">{issue.student.admissionNumber}</p></div></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><div><p className="text-slate-900 dark:text-slate-100">{issue.book.title}</p><p className="text-xs text-slate-500 dark:text-slate-400">{issue.book.author}</p></div></td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 hidden md:table-cell text-xs">{formatDate(issue.issueDate)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 hidden lg:table-cell text-xs">{formatDate(issue.dueDate)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 hidden lg:table-cell text-xs">{issue.returnDate ? formatDate(issue.returnDate) : <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-3 text-center"><Badge variant="secondary" className={`text-[10px] px-2 py-0 font-medium ${issueStatusColors[issue.status] || ''}`}>{issue.status}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      {(issue.status === 'ISSUED' || issue.status === 'OVERDUE') && (
                        <Button variant="ghost" size="sm" onClick={() => setReturningId(issue.id)} className={`h-7 text-xs ${issue.status === 'OVERDUE' ? 'text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30' : 'text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/30'}`}>
                          <RotateCcw className="w-3 h-3 mr-1" />Return
                        </Button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls page={page} totalPages={totalPages} total={totalIssues} limit={20} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Issue New Book</DialogTitle>
            <DialogDescription>Select a student and book to issue.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Student *</Label><Select value={issueForm.studentId} onValueChange={(val) => setIssueForm({ ...issueForm, studentId: val })}><SelectTrigger className="bg-white dark:bg-slate-800"><Users className="w-4 h-4 mr-1.5 text-slate-400" /><SelectValue placeholder={studentsLoading ? 'Loading students...' : 'Select student'} /></SelectTrigger><SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.admissionNumber} — {s.firstName} {s.lastName}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-2"><Label>Book *</Label><Select value={issueForm.bookId} onValueChange={(val) => setIssueForm({ ...issueForm, bookId: val })}><SelectTrigger className="bg-white dark:bg-slate-800"><BookOpen className="w-4 h-4 mr-1.5 text-slate-400" /><SelectValue placeholder={booksLoading ? 'Loading books...' : 'Select book'} /></SelectTrigger><SelectContent>{availableBooks.map((b) => <SelectItem key={b.id} value={b.id}>{b.title} — {b.author}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-2"><Label htmlFor="due-date">Due Date *</Label><Input id="due-date" type="date" value={issueForm.dueDate} onChange={(e) => setIssueForm({ ...issueForm, dueDate: e.target.value })} min={new Date().toISOString().split('T')[0]} className="bg-white dark:bg-slate-800" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleIssueBook} disabled={issueSaving} className="bg-teal-600 hover:bg-teal-700 text-white">{issueSaving ? 'Issuing...' : 'Issue Book'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!returningId} onOpenChange={() => setReturningId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Return Book</AlertDialogTitle>
            <AlertDialogDescription>Confirm that this book has been returned? The return date will be set to today.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReturnBook} className="bg-teal-600 hover:bg-teal-700 text-white">Confirm Return</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Main Library Page ────────────────────────────────
export function LibraryPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Library</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage books and issue tracking</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800/50">
          <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span className="text-xs font-medium text-teal-700 dark:text-teal-300">School Library</span>
        </div>
      </div>
      <Tabs defaultValue="books">
        <TabsList className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0 h-auto">
          <TabsTrigger value="books" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm"><BookCopy className="w-4 h-4 mr-1.5" />Books</TabsTrigger>
          <TabsTrigger value="issues" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm"><ArrowRightLeft className="w-4 h-4 mr-1.5" />Book Issues</TabsTrigger>
        </TabsList>
        <TabsContent value="books" className="mt-4"><BooksTab /></TabsContent>
        <TabsContent value="issues" className="mt-4"><IssuesTab /></TabsContent>
      </Tabs>
    </div>
  )
}
