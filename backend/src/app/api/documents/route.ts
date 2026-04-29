import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth-server';
import { ALL_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';
import { promises as fs } from 'fs';
import path from 'path';

const DOCUMENT_MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'DOS', 'SECRETARY'] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const STORAGE_KEY = 'school_documents';

type SchoolDocument = {
  id: string;
  title: string;
  category: string;
  targetRoles: string;
  fileName: string;
  storedFileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  uploadedById: string;
  uploadedByName: string;
  createdAt: string;
};

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.csv',
  '.jpg',
  '.jpeg',
  '.png',
]);

function canUserViewDocument(targetRoles: string, userRole: string) {
  const normalizedRole = userRole.toUpperCase();
  const targets = (targetRoles || 'ALL')
    .split(',')
    .map((r) => r.trim().toUpperCase())
    .filter(Boolean);

  if (targets.includes('ALL')) return true;
  if (targets.includes(normalizedRole)) return true;
  if (targets.includes('STAFF') && normalizedRole !== 'PARENT') return true;
  if (targets.includes('PARENT') && normalizedRole === 'PARENT') return true;
  return false;
}

function canUserViewDocumentCategory(category: string, userRole: string) {
  const normalizedRole = userRole.toUpperCase();
  if (normalizedRole !== 'TEACHER') return true;
  return ['GENERAL', 'ACADEMIC', 'POLICY', 'MEETING'].includes((category || 'GENERAL').toUpperCase());
}

function toSafeFilePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function readDocuments(): Promise<SchoolDocument[]> {
  const setting = await db.systemSetting.findUnique({
    where: { key: STORAGE_KEY },
    select: { value: true },
  });

  if (!setting?.value) return [];
  try {
    const parsed = JSON.parse(setting.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveDocuments(documents: SchoolDocument[]) {
  await db.systemSetting.upsert({
    where: { key: STORAGE_KEY },
    update: { value: JSON.stringify(documents) },
    create: { key: STORAGE_KEY, value: JSON.stringify(documents) },
  });
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request, { roles: [...ALL_ROLES] });

    const docs = await readDocuments();
    const visibleDocs = docs
      .filter((doc) => canUserViewDocument(doc.targetRoles, user.role))
      .filter((doc) => canUserViewDocumentCategory(doc.category, user.role))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ success: true, data: visibleDocs });
  } catch (error: unknown) {
    console.error('Error fetching documents:', error);
    return apiRouteError(error, 'Failed to fetch documents');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request, { roles: [...DOCUMENT_MANAGER_ROLES] });
    const formData = await request.formData();

    const title = String(formData.get('title') || '').trim();
    const category = String(formData.get('category') || 'GENERAL').trim().toUpperCase();
    const targetRoles = String(formData.get('targetRoles') || 'STAFF').trim().toUpperCase();
    const file = formData.get('file') as File | null;

    if (!title || !file) {
      return NextResponse.json(
        { success: false, error: 'Title and file are required' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    const originalName = file.name || 'document';
    const ext = path.extname(originalName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { success: false, error: 'Unsupported file type' },
        { status: 400 }
      );
    }

    const documentsDir = path.join(process.cwd(), 'public', 'uploads', 'documents');
    await fs.mkdir(documentsDir, { recursive: true });

    const id = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const storedFileName = `${id}_${toSafeFilePart(path.basename(originalName, ext))}${ext}`;
    const filePath = path.join(documentsDir, storedFileName);

    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, bytes);

    const fileUrl = `/uploads/documents/${storedFileName}`;
    const newDoc: SchoolDocument = {
      id,
      title,
      category,
      targetRoles,
      fileName: originalName,
      storedFileName,
      fileUrl,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      uploadedById: user.id,
      uploadedByName: user.name,
      createdAt: new Date().toISOString(),
    };

    const docs = await readDocuments();
    docs.unshift(newDoc);
    await saveDocuments(docs.slice(0, 1000));

    return NextResponse.json({ success: true, data: newDoc }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error uploading document:', error);
    return apiRouteError(error, 'Failed to upload document');
  }
}
