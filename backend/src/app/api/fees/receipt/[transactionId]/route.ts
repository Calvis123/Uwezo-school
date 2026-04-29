import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import PDFDocument from 'pdfkit'
import { requireUser } from '@/lib/auth-server'
import { FINANCE_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'
import { resolveEmbeddedPdfFonts } from '@/lib/pdf-fonts'

const FEE_READ_ROLES = [...FINANCE_ROLES, 'SECRETARY'] as const

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    await requireUser(request, { roles: [...FEE_READ_ROLES] })

    const { transactionId } = await params

    // Find transaction by ID or receipt number
    const transaction = await db.feeTransaction.findFirst({
      where: {
        OR: [
          { id: transactionId },
          { receiptNumber: transactionId },
        ],
      },
      include: {
        student: {
          include: { class: true },
        },
        feeStructure: {
          include: { term: true },
        },
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      )
    }

    const student = transaction.student
    const feeStructure = transaction.feeStructure
    const studentName = `${student.firstName} ${student.lastName}`
    const className = student.class?.name || 'N/A'
    const admissionNumber = student.admissionNumber || 'N/A'
    const termName = feeStructure?.term
      ? `${feeStructure.term.name} ${feeStructure.term.year}`
      : 'N/A'

    const fontPaths = resolveEmbeddedPdfFonts()
    if (!fontPaths) {
      throw new Error(
        'Receipt PDF fonts not found. Expected arial.ttf and arialbd.ttf under public/fonts.'
      )
    }

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 50, right: 50 },
      font: fontPaths.regular,
    })

    doc.registerFont('ReceiptRegular', fontPaths.regular)
    doc.registerFont('ReceiptBold', fontPaths.bold)

    // Collect PDF bytes
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    return new Promise<NextResponse>((resolve) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks)
        resolve(
          new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `inline; filename="receipt-${transaction.receiptNumber}.pdf"`,
            },
          })
        )
      })

      // === DRAW RECEIPT ===

      const pageWidth = doc.page.width - 100 // margins

      // Header: Green bar
      doc
        .rect(0, 0, doc.page.width, 8)
        .fill('#16a34a')

      // School Name
      doc
        .font('ReceiptBold')
        .fontSize(20)
        .fillColor('#16a34a')
        .text('Uwezo School', 50, 30, { align: 'center' })

      doc
        .font('ReceiptRegular')
        .fontSize(10)
        .fillColor('#6b7280')
        .text('Eldoret, Kenya', 50, 55, { align: 'center' })

      doc
        .font('ReceiptRegular')
        .fontSize(9)
        .fillColor('#9ca3af')
        .text('P.O. Box 1234, Eldoret 30100', 50, 68, { align: 'center' })
        .text('Tel: +254 700 123 456 | Email: info@uwezoschool.ac.ke', 50, 80, { align: 'center' })

      // Divider line
      const dividerY = 100
      doc
        .moveTo(50, dividerY)
        .lineTo(50 + pageWidth, dividerY)
        .strokeColor('#e5e7eb')
        .lineWidth(1)
        .stroke()

      // RECEIPT heading
      doc
        .font('ReceiptBold')
        .fontSize(14)
        .fillColor('#111827')
        .text('OFFICIAL RECEIPT', 50, dividerY + 10, { align: 'center' })

      // Receipt details row
      const detailY = dividerY + 32
      doc
        .font('ReceiptRegular')
        .fontSize(9)
        .fillColor('#6b7280')
        .text('Receipt No:', 50, detailY, { continued: true, width: 200 })
        .font('ReceiptBold')
        .fillColor('#111827')
        .text(` ${transaction.receiptNumber}`)

      doc
        .font('ReceiptRegular')
        .fontSize(9)
        .fillColor('#6b7280')
        .text('Date:', 300, detailY, { continued: true, width: 200 })
        .font('ReceiptBold')
        .fillColor('#111827')
        .text(` ${transaction.createdAt.toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}`)

      // Divider
      const sectionY = detailY + 22
      doc
        .moveTo(50, sectionY)
        .lineTo(50 + pageWidth, sectionY)
        .strokeColor('#e5e7eb')
        .lineWidth(0.5)
        .stroke()

      // Student details section
      const infoStartY = sectionY + 10
      doc
        .font('ReceiptBold')
        .fontSize(9)
        .fillColor('#16a34a')
        .text('STUDENT DETAILS', 50, infoStartY)

      const infoY = infoStartY + 16
      const infoFields = [
        ['Student Name', studentName],
        ['Admission No.', admissionNumber],
        ['Class', className],
        ['Term', termName],
      ]

      infoFields.forEach(([label, value], index) => {
        const rowY = infoY + index * 18
        doc
          .font('ReceiptRegular')
          .fontSize(9)
          .fillColor('#6b7280')
          .text(`${label}:`, 50, rowY, { continued: true, width: 150 })
          .font('ReceiptRegular')
          .fillColor('#111827')
          .text(` ${value}`)
      })

      // Payment details section
      const paymentSectionY = infoY + infoFields.length * 18 + 10
      doc
        .moveTo(50, paymentSectionY - 4)
        .lineTo(50 + pageWidth, paymentSectionY - 4)
        .strokeColor('#e5e7eb')
        .stroke()

      doc
        .font('ReceiptBold')
        .fontSize(9)
        .fillColor('#16a34a')
        .text('PAYMENT DETAILS', 50, paymentSectionY + 4)

      const payY = paymentSectionY + 22
      const paymentFields = [
        ['Fee Description', feeStructure?.name || 'School Fees'],
        ['Payment Method', transaction.paymentMethod],
        ['Transaction Ref', transaction.transactionRef || 'N/A'],
      ]

      paymentFields.forEach(([label, value], index) => {
        const rowY = payY + index * 18
        doc
          .font('ReceiptRegular')
          .fontSize(9)
          .fillColor('#6b7280')
          .text(`${label}:`, 50, rowY, { continued: true, width: 150 })
          .font('ReceiptRegular')
          .fillColor('#111827')
          .text(` ${value}`)
      })

      // Amount box
      const amountBoxY = payY + paymentFields.length * 18 + 10
      doc
        .roundedRect(50, amountBoxY, pageWidth, 36, 4)
        .fillAndStroke('#f0fdf4', '#bbf7d0')

      doc
        .font('ReceiptRegular')
        .fontSize(10)
        .fillColor('#16a34a')
        .text('AMOUNT PAID', 60, amountBoxY + 6, { width: 200 })

      doc
        .font('ReceiptBold')
        .fontSize(18)
        .fillColor('#16a34a')
        .text(`KES ${transaction.amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 60, amountBoxY + 18, { width: 400 })

      // Status
      const statusY = amountBoxY + 46
      doc
        .font('ReceiptRegular')
        .fontSize(9)
        .fillColor('#6b7280')
        .text('Status:', 50, statusY, { continued: true, width: 100 })
        .font('ReceiptBold')
        .fillColor(transaction.status === 'COMPLETED' ? '#16a34a' : '#d97706')
        .text(` ${transaction.status}`)

      if (transaction.notes) {
        doc
          .font('ReceiptRegular')
          .fontSize(9)
          .fillColor('#6b7280')
          .text('Notes:', 250, statusY, { continued: true, width: 60 })
          .font('ReceiptRegular')
          .fillColor('#111827')
          .text(` ${transaction.notes}`, { width: pageWidth - 260 })
      }

      // Signature section
      const sigY = statusY + 50
      doc
        .moveTo(50, sigY - 10)
        .lineTo(50 + pageWidth, sigY - 10)
        .strokeColor('#e5e7eb')
        .stroke()

      // Left signature
      doc
        .font('ReceiptRegular')
        .fontSize(9)
        .fillColor('#6b7280')
        .text('Received By:', 50, sigY + 20)
      doc
        .moveTo(50, sigY + 50)
        .lineTo(200, sigY + 50)
        .strokeColor('#111827')
        .lineWidth(0.5)
        .stroke()
      doc
        .font('ReceiptRegular')
        .fontSize(8)
        .fillColor('#9ca3af')
        .text('Signature / Stamp', 50, sigY + 54)

      // Right signature
      doc
        .font('ReceiptRegular')
        .fontSize(9)
        .fillColor('#6b7280')
        .text('Authorized By:', 300, sigY + 20)
      doc
        .moveTo(300, sigY + 50)
        .lineTo(450, sigY + 50)
        .strokeColor('#111827')
        .lineWidth(0.5)
        .stroke()
      doc
        .font('ReceiptRegular')
        .fontSize(8)
        .fillColor('#9ca3af')
        .text('Authorized Signature', 300, sigY + 54)

      // Footer
      const footerY = sigY + 80
      doc
        .moveTo(50, footerY)
        .lineTo(50 + pageWidth, footerY)
        .strokeColor('#e5e7eb')
        .lineWidth(1)
        .stroke()

      doc
        .font('ReceiptBold')
        .fontSize(10)
        .fillColor('#16a34a')
        .text('Thank you for your payment!', 50, footerY + 10, { align: 'center' })

      doc
        .font('ReceiptRegular')
        .fontSize(7)
        .fillColor('#9ca3af')
        .text(
          'This is a computer-generated receipt and does not require a physical signature for validation.',
          50,
          footerY + 26,
          { align: 'center' }
        )

      // Bottom green bar
      doc
        .rect(0, doc.page.height - 8, doc.page.width, 8)
        .fill('#16a34a')

      doc.end()
    })
  } catch (error: unknown) {
    console.error('Error generating receipt:', error)
    return apiRouteError(error, 'Failed to generate receipt')
  }
}
