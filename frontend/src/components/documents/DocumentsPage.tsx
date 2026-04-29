'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Upload, FileText, Download, Trash2, Search, FolderOpen, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { documentsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type DocumentItem = {
  id: string
  title: string
  category: string
  targetRoles: string
  fileName: string
  fileUrl: string
  size: number
  uploadedByName: string
  createdAt: string
}

const DOC_MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'DOS', 'SECRETARY']
const TEACHER_DOCUMENT_CATEGORIES = ['GENERAL', 'ACADEMIC', 'POLICY', 'MEETING']
const DOCUMENT_CATEGORIES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'ADMISSION', label: 'Admission' },
  { value: 'ACADEMIC', label: 'Academic' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'POLICY', label: 'Policy' },
  { value: 'MEETING', label: 'Meeting' },
]

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let idx = 0
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024
    idx += 1
  }
  return `${size.toFixed(size >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`
}

export function DocumentsPage() {
  const { user } = useAppStore()
  const canManage = DOC_MANAGER_ROLES.includes(user?.role || '')
  const isTeacherView = user?.role === 'TEACHER'
  const visibleCategories = isTeacherView
    ? DOCUMENT_CATEGORIES.filter((item) => TEACHER_DOCUMENT_CATEGORIES.includes(item.value))
    : DOCUMENT_CATEGORIES
  const documentTableColSpan = isTeacherView ? 5 : 7

  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('GENERAL')
  const [targetRoles, setTargetRoles] = useState('STAFF')
  const [file, setFile] = useState<File | null>(null)

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await documentsApi.list()
      if (res.success && res.data) {
        setDocuments(Array.isArray(res.data) ? res.data : [])
      } else {
        setDocuments([])
      }
    } catch {
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return documents.filter((doc) => {
      const matchesRoleAccess = !isTeacherView || TEACHER_DOCUMENT_CATEGORIES.includes(doc.category)
      const matchesCategory = categoryFilter === 'ALL' || doc.category === categoryFilter
      const matchesSearch = !q ||
        doc.title.toLowerCase().includes(q) ||
        doc.fileName.toLowerCase().includes(q) ||
        doc.uploadedByName.toLowerCase().includes(q)
      return matchesRoleAccess && matchesCategory && matchesSearch
    })
  }, [documents, search, categoryFilter, isTeacherView])

  const handleUpload = async () => {
    if (!title.trim()) {
      toast.error('Document title is required')
      return
    }
    if (!file) {
      toast.error('Please choose a file to upload')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('title', title.trim())
      formData.append('category', category)
      formData.append('targetRoles', targetRoles)
      formData.append('file', file)

      const res = await documentsApi.upload(formData)
      if (res.success) {
        toast.success('Document uploaded successfully')
        setTitle('')
        setCategory('GENERAL')
        setTargetRoles('STAFF')
        setFile(null)
        await loadDocuments()
      } else {
        toast.error(res.error || 'Failed to upload document')
      }
    } catch {
      toast.error('Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await documentsApi.delete(id)
      if (res.success) {
        toast.success('Document deleted')
        await loadDocuments()
      } else {
        toast.error(res.error || 'Failed to delete document')
      }
    } catch {
      toast.error('Failed to delete document')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {isTeacherView ? 'Teacher Documents' : 'School Documents'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isTeacherView
            ? 'View documents shared with teachers by school administration.'
            : 'Upload and manage official school documents for staff and parents.'}
        </p>
      </div>

      {canManage && (
        <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Upload className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Upload Document
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
              />
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={targetRoles} onValueChange={setTargetRoles}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="TEACHER">Teachers</SelectItem>
                  <SelectItem value="PARENT">Parents</SelectItem>
                  <SelectItem value="ALL">All Users</SelectItem>
                  <SelectItem value="HEADTEACHER,DOS,SECRETARY">School Office</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Upload
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isTeacherView ? 'Search teacher documents...' : 'Search by title, filename, uploader...'}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Filter category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {visibleCategories.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/70">
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                {!isTeacherView && <TableHead className="hidden md:table-cell">Audience</TableHead>}
                {!isTeacherView && <TableHead className="hidden lg:table-cell">Uploaded By</TableHead>}
                <TableHead className="hidden sm:table-cell">Size</TableHead>
                <TableHead className="hidden lg:table-cell">Date</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={documentTableColSpan} className="py-10 text-center text-slate-500">Loading documents...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={documentTableColSpan} className="py-12">
                    <div className="flex flex-col items-center text-center gap-2">
                      <FolderOpen className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No documents found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{doc.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{doc.fileName}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">{doc.category}</Badge>
                    </TableCell>
                    {!isTeacherView && (
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary">{doc.targetRoles}</Badge>
                      </TableCell>
                    )}
                    {!isTeacherView && (
                      <TableCell className="hidden lg:table-cell text-sm text-slate-600 dark:text-slate-300">
                        {doc.uploadedByName}
                      </TableCell>
                    )}
                    <TableCell className="hidden sm:table-cell text-sm text-slate-500">
                      {formatBytes(doc.size)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-slate-500">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(doc.fileUrl, '_blank')}
                          title="Download / Open"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(doc.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
