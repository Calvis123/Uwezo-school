import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const student = await db.student.findUnique({
      where: { id },
      include: {
        class: true,
        guardians: {
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
      },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    // Calculate fee summary
    const feeStructures = await db.feeStructure.findMany({
      where: { classId: student.classId },
    });

    const totalFees = feeStructures.reduce((sum, fs) => sum + fs.amount, 0);
    const totalPaid = student.feeTransactions
      .filter((t) => t.status === 'COMPLETED')
      .reduce((sum, t) => sum + t.amount, 0);
    const outstanding = totalFees - totalPaid;

    return NextResponse.json({
      success: true,
      data: {
        ...student,
        feeSummary: {
          totalFees,
          totalPaid,
          outstanding,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching student:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch student' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const student = await db.student.findUnique({ where: { id } });
    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      classId,
      stream,
      status,
      address,
      medicalNotes,
      allergies,
      photo,
    } = body;

    const updated = await db.student.update({
      where: { id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(gender && { gender }),
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

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating student:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update student' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const student = await db.student.findUnique({ where: { id } });
    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    const updated = await db.student.update({
      where: { id },
      data: { status: 'INACTIVE' },
      include: { class: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error deleting student:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete student' },
      { status: 500 }
    );
  }
}
