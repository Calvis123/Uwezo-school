import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20')));
    const classId = searchParams.get('classId');
    const status = searchParams.get('status');
    const gender = searchParams.get('gender');
    const search = searchParams.get('search');

    const where: Prisma.StudentWhereInput = {};

    if (classId) where.classId = classId;
    if (status) where.status = status;
    if (gender) where.gender = gender;
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { admissionNumber: { contains: search } },
      ];
    }

    const [students, total] = await Promise.all([
      db.student.findMany({
        where,
        include: {
          class: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.student.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: students,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      classId,
      stream,
      address,
      medicalNotes,
      allergies,
    } = body;

    if (!firstName || !lastName || !gender || !classId) {
      return NextResponse.json(
        { success: false, error: 'First name, last name, gender, and class are required' },
        { status: 400 }
      );
    }

    // Generate admission number
    const lastStudent = await db.student.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { admissionNumber: true },
    });

    let nextNumber = 1;
    if (lastStudent?.admissionNumber) {
      const parts = lastStudent.admissionNumber.split('-');
      nextNumber = parseInt(parts[parts.length - 1]) + 1;
    }
    const admissionNumber = `OLV-${String(nextNumber).padStart(4, '0')}`;

    const student = await db.student.create({
      data: {
        admissionNumber,
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        classId,
        stream,
        address,
        medicalNotes,
        allergies,
      },
      include: { class: true },
    });

    return NextResponse.json({ success: true, data: student }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating student:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create student' },
      { status: 500 }
    );
  }
}
