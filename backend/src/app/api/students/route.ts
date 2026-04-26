import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth-server';
import { STAFF_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';
import { getTeacherAssignedClassIds } from '@/lib/teacher-access';
import { hashSync } from 'bcryptjs';

const STUDENT_CREATE_ROLES = ['SUPER_ADMIN', 'HEADTEACHER', 'SECRETARY'] as const;

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

function extractLastNumericAdmission(admissionNumber: string | null | undefined): number {
  if (!admissionNumber) return 0;
  const match = admissionNumber.match(/(\d+)(?!.*\d)/);
  if (!match) return 0;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : 0;
}

function getFeeStatus(expected: number, paid: number): 'UNPAID' | 'PARTIAL' | 'PAID' {
  if (paid <= 0) return 'UNPAID';
  if (expected > 0 && paid < expected) return 'PARTIAL';
  return 'PAID';
}

export async function GET(request: NextRequest) {
  try {
    const authed = await requireUser(request, { roles: [...STAFF_ROLES] });

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20')));
    const classId = searchParams.get('classId');
    const status = searchParams.get('status');
    const gender = searchParams.get('gender');
    const studentType = searchParams.get('studentType');
    const search = searchParams.get('search');

    const where: Prisma.StudentWhereInput = {};

    const teacherClassIds = await getTeacherAssignedClassIds(authed);
    if (teacherClassIds) {
      if (teacherClassIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: { items: [], total: 0, page, limit, totalPages: 0 },
        });
      }

      if (classId && !teacherClassIds.includes(classId)) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: class is not assigned to this teacher' },
          { status: 403 }
        );
      }

      where.classId = classId || { in: teacherClassIds };
    } else if (classId) {
      where.classId = classId;
    }
    if (status) where.status = status;
    if (gender) where.gender = gender;
    if (studentType === 'DAY' || studentType === 'BOARDING') where.studentType = studentType;
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { admissionNumber: { contains: search } },
      ];
    }

    const [activeTerm, students, total] = await Promise.all([
      db.term.findFirst({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true, year: true },
      }),
      db.student.findMany({
        where,
        include: {
          class: true,
          guardians: {
            where: { isPrimary: true },
            include: {
              guardian: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  email: true,
                },
              },
            },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.student.count({ where }),
    ]);

    let items: Array<any> = students;

    if (students.length > 0) {
      const studentIds = students.map((student) => student.id);
      const classIds = Array.from(new Set(students.map((student) => student.classId)));

      let paidByStudent: Record<string, number> = {};
      let feePaidByStudent: Record<string, number> = {};
      let assignedByStudent: Record<string, { bus: { id: string; busNumber: string; routeName: string } }> = {};
      let classBaseFeesByClassId: Record<string, number> = {};
      let classTransportFeesByClassId: Record<string, number> = {};

      if (activeTerm?.id) {
        const [transportPayments, assignments, termPayments, termFeeStructures] = await Promise.all([
          db.feeTransaction.findMany({
            where: {
              studentId: { in: studentIds },
              status: 'COMPLETED',
              feeStructure: {
                category: 'TRANSPORT',
                termId: activeTerm.id,
              },
            },
            select: {
              studentId: true,
              amount: true,
            },
          }),
          db.transportAssignment.findMany({
            where: {
              studentId: { in: studentIds },
              termId: activeTerm.id,
              status: 'ACTIVE',
            },
            select: {
              studentId: true,
              bus: { select: { id: true, busNumber: true, routeName: true } },
            },
          }),
          db.feeTransaction.findMany({
            where: {
              studentId: { in: studentIds },
              status: 'COMPLETED',
              feeStructure: {
                termId: activeTerm.id,
              },
            },
            select: {
              studentId: true,
              amount: true,
            },
          }),
          db.feeStructure.findMany({
            where: {
              termId: activeTerm.id,
              status: 'ACTIVE',
              classId: { in: classIds },
            },
            select: {
              classId: true,
              amount: true,
              category: true,
            },
          }),
        ]);

        paidByStudent = transportPayments.reduce<Record<string, number>>((acc, row) => {
          acc[row.studentId] = (acc[row.studentId] || 0) + row.amount;
          return acc;
        }, {});

        feePaidByStudent = termPayments.reduce<Record<string, number>>((acc, row) => {
          acc[row.studentId] = (acc[row.studentId] || 0) + row.amount;
          return acc;
        }, {});

        assignedByStudent = assignments.reduce<Record<string, { bus: { id: string; busNumber: string; routeName: string } }>>((acc, row) => {
          acc[row.studentId] = { bus: row.bus };
          return acc;
        }, {});

        classBaseFeesByClassId = termFeeStructures.reduce<Record<string, number>>((acc, row) => {
          if (row.category === 'TRANSPORT') return acc;
          acc[row.classId] = (acc[row.classId] || 0) + Number(row.amount || 0);
          return acc;
        }, {});

        classTransportFeesByClassId = termFeeStructures.reduce<Record<string, number>>((acc, row) => {
          if (row.category !== 'TRANSPORT') return acc;
          acc[row.classId] = (acc[row.classId] || 0) + Number(row.amount || 0);
          return acc;
        }, {});
      }

      items = students.map((student) => {
        const expectedFees =
          (classBaseFeesByClassId[student.classId] || 0) +
          (student.usesTransport ? classTransportFeesByClassId[student.classId] || 0 : 0);
        const paidFees = feePaidByStudent[student.id] || 0;
        const feeInfo = {
          status: getFeeStatus(expectedFees, paidFees),
          expectedAmount: expectedFees,
          paidAmount: paidFees,
          balance: Math.max(0, expectedFees - paidFees),
          term: activeTerm,
        };

        if (student.studentType === 'BOARDING') {
          return {
            ...student,
            feeInfo,
            transportInfo: {
              status: 'BOARDING',
              paidAmount: 0,
              bus: null,
              term: activeTerm,
            },
          };
        }

        const paidAmount = paidByStudent[student.id] || 0;
        const assignment = assignedByStudent[student.id] || null;

        return {
          ...student,
          feeInfo,
          transportInfo: {
            status: assignment ? 'ASSIGNED' : paidAmount > 0 ? 'PAID_UNASSIGNED' : 'UNPAID',
            paidAmount,
            bus: assignment?.bus || null,
            term: activeTerm,
          },
        };
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching students:', error);
    return apiRouteError(error, 'Failed to fetch students');
  }
}

export async function POST(request: NextRequest) {
  try {
    const authed = await requireUser(request, { roles: [...STAFF_ROLES] });
    if (!STUDENT_CREATE_ROLES.includes(authed.role as (typeof STUDENT_CREATE_ROLES)[number])) {
      return NextResponse.json(
        { success: false, error: 'Only Super Admin, Headteacher, and Secretary can add students' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      studentType,
      usesTransport,
      classId,
      stream,
      address,
      medicalNotes,
      allergies,
      guardianName,
      guardianPhone,
      guardianRelationship,
    } = body;

    if (!firstName || !lastName || !gender || !classId) {
      return NextResponse.json(
        { success: false, error: 'First name, last name, gender, and class are required' },
        { status: 400 }
      );
    }

    const teacherClassIds = await getTeacherAssignedClassIds(authed);
    if (teacherClassIds && !teacherClassIds.includes(classId)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: you can only add students to your assigned class(es)' },
        { status: 403 }
      );
    }

    // Generate admission number
    const lastStudent = await db.student.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { admissionNumber: true },
    });

    let nextNumber = 1;
    if (lastStudent?.admissionNumber) {
      nextNumber = extractLastNumericAdmission(lastStudent.admissionNumber) + 1;
    }
    const admissionNumber = `OLV-${String(nextNumber).padStart(4, '0')}`;

    const normalizedStudentType = studentType === 'BOARDING' ? 'BOARDING' : 'DAY';
    const student = await db.student.create({
      data: {
        admissionNumber,
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        studentType: normalizedStudentType,
        usesTransport: normalizedStudentType === 'DAY' ? Boolean(usesTransport) : false,
        classId,
        stream,
        address,
        medicalNotes,
        allergies,
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
          OR: [
            { phone: cleanPhone },
            { phone: fallbackPhone },
          ],
        },
      });

      if (!guardianUser) {
        const baseName = String(guardianName).trim();
        const baseEmail = `${toEmailSlug(baseName)}.${cleanPhone.replace(/\D/g, '').slice(-9)}@parent.olives.local`;

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

      // Parent portal policy: one parent login maps to one student profile.
      await db.studentGuardian.deleteMany({
        where: {
          guardianId: guardianUser.id,
          studentId: { not: student.id },
        },
      });

      const existingLink = await db.studentGuardian.findFirst({
        where: {
          studentId: student.id,
          guardianId: guardianUser.id,
        },
        select: { id: true },
      });

      if (!existingLink) {
        await db.studentGuardian.create({
          data: {
            studentId: student.id,
            guardianId: guardianUser.id,
            relationship: guardianRelationship || 'GUARDIAN',
            isPrimary: true,
          },
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...student,
          parentPortalCredentials,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error creating student:', error);
    return apiRouteError(error, 'Failed to create student');
  }
}
