import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth-server';
import { FINANCE_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';
import {
  addAllClassesScopeMarker,
  isAllClassesScopeDescription,
  removeAllClassesScopeMarker,
} from '@/lib/fee-structure-scope';

export async function GET(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...FINANCE_ROLES] });

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const termId = searchParams.get('termId');
    const category = searchParams.get('category');
    const allTerms = searchParams.get('allTerms') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Prisma.FeeStructureWhereInput = {};
    if (termId) where.termId = termId;
    if (category) where.category = category;

    // If no term filter, default to the current active term
    if (!termId && !allTerms) {
      const activeTerm = await db.term.findFirst({
        where: { status: 'ACTIVE' },
      });
      if (activeTerm) {
        where.termId = activeTerm.id;
      }
    }

    const [structures, activeClasses] = await Promise.all([
      db.feeStructure.findMany({
        where,
        include: {
          class: true,
          term: true,
          _count: {
            select: { transactions: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.schoolClass.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true },
      }),
    ]);

    const activeClassIds = new Set(activeClasses.map((item) => item.id));

    const normalized = structures.map((item) => {
      const appliesToAllClasses = isAllClassesScopeDescription(item.description);
      return {
        ...item,
        appliesToAllClasses,
        description: removeAllClassesScopeMarker(item.description),
      };
    });

    const filteredByClass = classId
      ? normalized.filter((item) => item.appliesToAllClasses || item.classId === classId)
      : normalized;

    // Collapse historical duplicated "same fee in every class" rows into one presentation row.
    const grouped = new Map<string, typeof filteredByClass>();
    for (const row of filteredByClass) {
      const key = [
        String(row.name || '').trim().toLowerCase(),
        row.termId,
        row.category,
        Number(row.amount || 0).toFixed(2),
        row.status,
        String(row.description || '').trim().toLowerCase(),
      ].join('|');
      const list = grouped.get(key) || [];
      list.push(row);
      grouped.set(key, list);
    }

    const collapsed = Array.from(grouped.values()).flatMap((rows) => {
      const first = rows[0];
      if (!first) return [];
      if (rows.length === 1) return [first];
      if (rows.some((row) => row.appliesToAllClasses)) return [first];

      const uniqueClassIds = new Set(rows.map((row) => row.classId));
      const coversAllActiveClasses =
        activeClassIds.size > 0 &&
        uniqueClassIds.size === activeClassIds.size &&
        Array.from(activeClassIds).every((id) => uniqueClassIds.has(id));

      if (!coversAllActiveClasses) return rows;

      const txCount = rows.reduce((sum, row) => sum + Number(row._count?.transactions || 0), 0);
      return [
        {
          ...first,
          appliesToAllClasses: true,
          _count: { transactions: txCount },
        },
      ];
    });

    const total = collapsed.length;
    const paginated = collapsed.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      success: true,
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching fee structures:', error);
    return apiRouteError(error, 'Failed to fetch fee structures');
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...FINANCE_ROLES] });

    const body = await request.json();
    const { name, classId, termId, amount, category, description } = body;

    if (!name || !classId || !termId || !amount) {
      return NextResponse.json(
        { success: false, error: 'Name, class, term, and amount are required' },
        { status: 400 }
      );
    }

    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    const categoryValue = String(category || 'TUITION').toUpperCase();
    const allowedCategories = ['TUITION', 'TRANSPORT', 'BOARDING', 'EXTRACURRICULAR', 'OTHER'];
    if (!allowedCategories.includes(categoryValue)) {
      return NextResponse.json(
        { success: false, error: 'Invalid fee category' },
        { status: 400 }
      );
    }
    if (categoryValue === 'TRANSPORT') {
      return NextResponse.json(
        { success: false, error: 'Transport fee structures must be managed in the Transport module' },
        { status: 400 }
      );
    }

    const termExists = await db.term.findUnique({ where: { id: termId }, select: { id: true } });
    if (!termExists) {
      return NextResponse.json(
        { success: false, error: 'Invalid term selected' },
        { status: 400 }
      );
    }

    const normalizedName = String(name).trim();
    const normalizedNameKey = normalizedName.toLowerCase();
    const isAllClasses = String(classId) === 'ALL';
    const cleanedDescription = removeAllClassesScopeMarker(description);

    if (!isAllClasses) {
      const classExists = await db.schoolClass.findUnique({ where: { id: classId }, select: { id: true } });
      if (!classExists) {
        return NextResponse.json(
          { success: false, error: 'Invalid class selected' },
          { status: 400 }
        );
      }

      // Prevent duplicate structures in the same class/term/category bucket.
      const existingCandidates = await db.feeStructure.findMany({
        where: {
          termId,
          category: categoryValue,
        },
        select: { id: true, classId: true, name: true, status: true, description: true },
      });
      const duplicate = existingCandidates.find(
        (item) =>
          String(item.name).trim().toLowerCase() === normalizedNameKey &&
          (item.classId === classId || isAllClassesScopeDescription(item.description))
      );
      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error:
              duplicate.status === 'ACTIVE'
                ? 'A similar active fee structure already exists for this class, term, and category'
                : 'A similar fee structure already exists for this class, term, and category',
          },
          { status: 409 }
        );
      }

      const structure = await db.feeStructure.create({
        data: {
          name: normalizedName,
          classId,
          termId,
          amount: amountNumber,
          category: categoryValue,
          description: cleanedDescription || undefined,
        },
        include: {
          class: true,
          term: true,
        },
      });

      return NextResponse.json({ success: true, data: structure }, { status: 201 });
    }

    const activeClasses = await db.schoolClass.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    if (activeClasses.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active classes found for bulk structure creation',
        },
        { status: 400 }
      );
    }

    const existingCandidates = await db.feeStructure.findMany({
      where: {
        termId,
        category: categoryValue,
      },
      select: { id: true, classId: true, name: true, description: true, status: true },
    });
    const duplicateAllClasses = existingCandidates.find(
      (item) =>
        String(item.name).trim().toLowerCase() === normalizedNameKey &&
        isAllClassesScopeDescription(item.description)
    );

    if (duplicateAllClasses) {
      return NextResponse.json(
        {
          success: false,
          error:
            duplicateAllClasses.status === 'ACTIVE'
              ? 'A similar active all-classes fee structure already exists for this term and category'
              : 'A similar all-classes fee structure already exists for this term and category',
        },
        { status: 409 }
      );
    }

    const anchorClass = activeClasses[0];
    const createdStructure = await db.feeStructure.create({
      data: {
        name: normalizedName,
        classId: anchorClass.id,
        termId,
        amount: amountNumber,
        category: categoryValue,
        description: addAllClassesScopeMarker(cleanedDescription),
      },
      include: {
        class: true,
        term: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...createdStructure,
          appliesToAllClasses: true,
          description: removeAllClassesScopeMarker(createdStructure.description),
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error creating fee structure:', error);
    return apiRouteError(error, 'Failed to create fee structure');
  }
}
