import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth-server';
import { STAFF_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';
import { canTeacherAccessClass } from '@/lib/teacher-access';
import { hashSync } from 'bcryptjs';
import { summarizeStudentFeeLedger } from '@/lib/fee-balance';

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('254')) return `+${digits}`;
  if (digits.startsWith('0')) return `+254${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith('7')) return `+254${digits}`;
  return phone.trim();
}

function toEmailSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 40) || 'parent';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = await requireUser(request, { roles: [...STAFF_ROLES] });

    const { id } = await params;

    const student = await db.student.findUnique({
      where: { id },
      include: {
        class: true,
        guardians: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
          include: {
            guardian: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                gender: true,
              },
            },
          },
        },
        feeTransactions: {
          include: {
            feeStructure: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        busAssignments: {
          where: { status: 'ACTIVE' },
          select: {
            termId: true,
            transportMode: true,
            bus: { select: { routeName: true } },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    const canAccess = await canTeacherAccessClass(authed, student.classId);
    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: student is not in your assigned class(es)' },
        { status: 403 }
      );
    }

    const activeTerm = await db.term.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, year: true, startDate: true, endDate: true, status: true },
    });
    const terms = await db.term.findMany({
      select: { id: true, name: true, year: true, startDate: true, endDate: true, status: true },
      orderBy: [{ year: 'asc' }, { startDate: 'asc' }],
    });

    let transportInfo: {
      status: 'BOARDING' | 'UNPAID' | 'PAID_UNASSIGNED' | 'ASSIGNED';
      paidAmount: number;
      bus: { id: string; busNumber: string; routeName: string } | null;
      assignmentId: string | null;
      transportMode: string | null;
      term: { id: string; name: string; year: number } | null;
    } = {
      status: student.studentType === 'BOARDING' ? 'BOARDING' : 'UNPAID',
      paidAmount: 0,
      bus: null,
      assignmentId: null,
      transportMode: null,
      term: activeTerm || null,
    };

    if (student.studentType !== 'BOARDING' && activeTerm?.id) {
      const [paidTransport, assignment] = await Promise.all([
        db.feeTransaction.aggregate({
          where: {
            studentId: student.id,
            status: 'COMPLETED',
            feeStructure: {
              category: 'TRANSPORT',
              termId: activeTerm.id,
            },
          },
          _sum: { amount: true },
        }),
        db.transportAssignment.findFirst({
          where: {
            studentId: student.id,
            termId: activeTerm.id,
            status: 'ACTIVE',
          },
          select: {
            id: true,
            transportMode: true,
            bus: { select: { id: true, busNumber: true, routeName: true } },
          },
        }),
      ]);

      const paidAmount = paidTransport._sum.amount || 0;

      transportInfo = {
        status: assignment ? 'ASSIGNED' : paidAmount > 0 ? 'PAID_UNASSIGNED' : 'UNPAID',
        paidAmount,
        bus: assignment?.bus || null,
        assignmentId: assignment?.id || null,
        transportMode: assignment?.transportMode || null,
        term: activeTerm,
      };
    }

    const feeStructures = await db.feeStructure.findMany({
      where: { status: 'ACTIVE' },
    });

    const allFeePayments = await db.feeTransaction.findMany({
      where: { studentId: student.id },
      include: { feeStructure: true },
    });

    const feeLedger = summarizeStudentFeeLedger(
      terms,
      activeTerm?.id,
      feeStructures,
      allFeePayments,
      {
        ...student,
        busAssignments: student.busAssignments,
      }
    );

    const parentDetails = (student.guardians || []).map((g) => ({
      id: g.guardian?.id,
      name: g.guardian?.name || '',
      phone: g.guardian?.phone || '',
      email: g.guardian?.email || '',
      relationship: g.relationship,
      isPrimary: g.isPrimary,
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...student,
        parentDetails,
        transportInfo,
        feeSummary: {
          totalFees: feeLedger.totalFees,
          totalPaid: feeLedger.totalPaid,
          outstanding: feeLedger.balance,
          currentTerm: feeLedger.current,
          arrears: feeLedger.arrears,
          term: activeTerm
            ? {
                id: activeTerm.id,
                name: activeTerm.name,
                year: activeTerm.year,
              }
            : null,
        },
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching student:', error);
    return apiRouteError(error, 'Failed to fetch student');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = await requireUser(request, { roles: [...STAFF_ROLES] });

    const { id } = await params;
    const body = await request.json();

    const student = await db.student.findUnique({ where: { id } });
    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    const canAccessCurrent = await canTeacherAccessClass(authed, student.classId);
    if (!canAccessCurrent) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: student is not in your assigned class(es)' },
        { status: 403 }
      );
    }

    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      studentType,
      usesTransport,
      classId,
      stream,
      status,
      address,
      medicalNotes,
      allergies,
      photo,
      guardianName,
      guardianPhone,
      guardianRelationship,
    } = body;

    if (classId) {
      const canMoveToClass = await canTeacherAccessClass(authed, classId);
      if (!canMoveToClass) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: target class is not assigned to you' },
          { status: 403 }
        );
      }
    }

    const resolvedStudentType = studentType ? (studentType === 'BOARDING' ? 'BOARDING' : 'DAY') : student.studentType;
    const shouldUpdateUsesTransport = usesTransport !== undefined || studentType !== undefined;

    const updated = await db.student.update({
      where: { id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(gender && { gender }),
        ...(studentType && { studentType: resolvedStudentType }),
        ...(shouldUpdateUsesTransport && {
          usesTransport: resolvedStudentType === 'DAY' ? Boolean(usesTransport ?? student.usesTransport) : false,
        }),
        ...(classId && { classId }),
        ...(stream !== undefined && { stream }),
        ...(status && { status }),
        ...(address !== undefined && { address }),
        ...(medicalNotes !== undefined && { medicalNotes }),
        ...(allergies !== undefined && { allergies }),
        ...(photo !== undefined && { photo }),
      },
      include: { class: true },
    });

    let parentPortalCredentials:
      | { isNewAccount: boolean; phone: string; password?: string; name: string }
      | undefined;

    const hasGuardian = Boolean(guardianName?.trim() && guardianPhone?.trim());
    if (hasGuardian) {
      const cleanPhone = normalizePhone(guardianPhone);
      const fallbackPhone = guardianPhone.trim();

      let guardianUser = await db.user.findFirst({
        where: {
          role: 'PARENT',
          OR: [{ phone: cleanPhone }, { phone: fallbackPhone }],
        },
      });

      if (!guardianUser) {
        const baseName = String(guardianName).trim();
        const baseEmail = `${toEmailSlug(baseName)}.${cleanPhone.replace(/\D/g, '').slice(-9)}@parent.uwezoschool.local`;
        let uniqueEmail = baseEmail;
        let emailSuffix = 1;
        while (await db.user.findUnique({ where: { email: uniqueEmail }, select: { id: true } })) {
          uniqueEmail = `${baseEmail.split('@')[0]}.${emailSuffix}@${baseEmail.split('@')[1]}`;
          emailSuffix += 1;
        }

        const defaultPassword = cleanPhone.replace(/\D/g, '') || fallbackPhone;
        guardianUser = await db.user.create({
          data: {
            name: baseName,
            email: uniqueEmail,
            phone: cleanPhone || fallbackPhone,
            role: 'PARENT',
            status: 'ACTIVE',
            password: hashSync(defaultPassword, 10),
          },
        });

        parentPortalCredentials = {
          isNewAccount: true,
          name: guardianUser.name,
          phone: guardianUser.phone || fallbackPhone,
          password: defaultPassword,
        };
      } else {
        if (guardianName && guardianName.trim() && guardianUser.name !== guardianName.trim()) {
          guardianUser = await db.user.update({
            where: { id: guardianUser.id },
            data: { name: guardianName.trim() },
          });
        }

        parentPortalCredentials = {
          isNewAccount: false,
          name: guardianUser.name,
          phone: guardianUser.phone || fallbackPhone,
        };
      }

      await db.studentGuardian.updateMany({
        where: { studentId: id, isPrimary: true },
        data: { isPrimary: false },
      });

      // Parent portal policy: one parent login maps to one student profile.
      await db.studentGuardian.deleteMany({
        where: {
          guardianId: guardianUser.id,
          studentId: { not: id },
        },
      });

      const existingLink = await db.studentGuardian.findFirst({
        where: { studentId: id, guardianId: guardianUser.id },
        select: { id: true },
      });

      if (existingLink) {
        await db.studentGuardian.update({
          where: { id: existingLink.id },
          data: {
            relationship: guardianRelationship || 'GUARDIAN',
            isPrimary: true,
          },
        });
      } else {
        await db.studentGuardian.create({
          data: {
            studentId: id,
            guardianId: guardianUser.id,
            relationship: guardianRelationship || 'GUARDIAN',
            isPrimary: true,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        parentPortalCredentials,
      },
    });
  } catch (error: unknown) {
    console.error('Error updating student:', error);
    return apiRouteError(error, 'Failed to update student');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = await requireUser(request, { roles: [...STAFF_ROLES] });

    const { id } = await params;

    const student = await db.student.findUnique({ where: { id } });
    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    const canAccess = await canTeacherAccessClass(authed, student.classId);
    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: student is not in your assigned class(es)' },
        { status: 403 }
      );
    }

    const updated = await db.student.update({
      where: { id },
      data: { status: 'INACTIVE' },
      include: { class: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error('Error deleting student:', error);
    return apiRouteError(error, 'Failed to delete student');
  }
}
