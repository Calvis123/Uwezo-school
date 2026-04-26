import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth-server';
import { apiRouteError } from '@/lib/api-route-error';
import { promises as fs } from 'fs';
import path from 'path';

const DOCUMENT_MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'DOS', 'SECRETARY'] as const;
const STORAGE_KEY = 'school_documents';

type SchoolDocument = {
  id: string;
  storedFileName?: string;
};

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request, { roles: [...DOCUMENT_MANAGER_ROLES] });
    const { id } = await params;

    const docs = await readDocuments();
    const docToDelete = docs.find((doc) => doc.id === id);
    if (!docToDelete) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const nextDocs = docs.filter((doc) => doc.id !== id);
    await saveDocuments(nextDocs);

    if (docToDelete.storedFileName) {
      const filePath = path.join(process.cwd(), 'public', 'uploads', 'documents', docToDelete.storedFileName);
      await fs.unlink(filePath).catch(() => undefined);
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (error: unknown) {
    console.error('Error deleting document:', error);
    return apiRouteError(error, 'Failed to delete document');
  }
}
