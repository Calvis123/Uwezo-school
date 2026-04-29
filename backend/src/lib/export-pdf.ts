import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { resolveEmbeddedPdfFonts } from '@/lib/pdf-fonts'

type PdfRow = Record<string, string | number>

type BuildExportPdfInput = {
  title: string
  headers: string[]
  rows: PdfRow[]
  keys: string[]
  stamp: string
  maxRows?: number
  showDate?: boolean
}

function resolveSchoolLogoPath() {
  const candidates = [
    path.join(process.cwd(), 'public', 'logo.png'),
    path.join(process.cwd(), 'frontend', 'public', 'logo.png'),
    path.join(process.cwd(), '..', 'public', 'logo.png'),
    path.join(process.cwd(), 'public', 'logo.svg'),
    path.join(process.cwd(), 'frontend', 'public', 'logo.svg'),
    path.join(process.cwd(), '..', 'public', 'logo.svg'),
  ]
  return candidates.find((p) => fs.existsSync(p)) || null
}

export async function buildStyledExportPdf({
  title,
  headers,
  rows,
  keys,
  stamp,
  maxRows = 500,
  showDate = true,
}: BuildExportPdfInput) {
  const fontPaths = resolveEmbeddedPdfFonts()
  if (!fontPaths) {
    throw new Error(
      'PDF font files not found. Expected arial.ttf and arialbd.ttf under public/fonts.'
    )
  }

  const pdfHeaders = ['#', ...headers]
  const pdfKeys = ['__rowNumber', ...keys]
  const useLandscape = pdfKeys.length > 6
  const doc = new PDFDocument({
    size: 'A4',
    layout: useLandscape ? 'landscape' : 'portrait',
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    font: fontPaths.regular,
  })
  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  doc.registerFont('ExportRegular', fontPaths.regular)
  doc.registerFont('ExportBold', fontPaths.bold)

  const bodyFont = 'ExportRegular'
  const headingFont = 'ExportBold'
  const limited = rows.slice(0, maxRows)

  const isNumericColumn = (key: string, value: string | number | undefined) => {
    if (key === '__rowNumber') return true
    if (typeof value === 'number') return true
    const k = key.toLowerCase()
    return (
      k.includes('amount') ||
      k.includes('balance') ||
      k.includes('total') ||
      k.includes('value') ||
      k.includes('collections') ||
      k.includes('transactions') ||
      k.includes('rate') ||
      k.includes('count')
    )
  }

  const columnWeight = (key: string) => {
    if (key === '__rowNumber') return 0.55
    const k = key.toLowerCase()
    if (k.includes('name')) return 2.2
    if (k.includes('admission')) return 1.6
    if (k.includes('class')) return 1.2
    if (k.includes('receipt') || k.includes('reference') || k.includes('transaction')) return 1.9
    if (k.includes('method')) return 1.3
    if (k.includes('date')) return 1.25
    if (k.includes('term')) return 1.3
    if (k.includes('status')) return 1.15
    if (k.includes('contact') || k.includes('phone')) return 1.6
    return 1.1
  }

  return await new Promise<{ buffer: Buffer; truncated: boolean }>((resolve) => {
    doc.on('end', () => {
      resolve({ buffer: Buffer.concat(chunks), truncated: rows.length > maxRows })
    })

    const logoPath = resolveSchoolLogoPath()
    let headerY = doc.y
    if (logoPath) {
      try {
        const logoWidth = 56
        const logoHeight = 56
        const x = (doc.page.width - logoWidth) / 2
        doc.image(logoPath, x, headerY, { width: logoWidth, height: logoHeight })
        headerY += logoHeight + 12
      } catch {
        // Continue without logo if image parsing fails.
      }
    }

    doc.y = headerY
    doc
      .font(headingFont)
      .fontSize(19)
      .fillColor('#0f172a')
      .text('Uwezo School', { align: 'center' })
    doc.moveDown(0.25)
    doc
      .font(bodyFont)
      .fontSize(11)
      .fillColor('#0d9488')
      .text('Nurturing Excellence, Building Futures', { align: 'center' })
    doc.moveDown(0.55)
    doc.font(bodyFont).fontSize(15).fillColor('#111827').text(title, { align: 'center' })
    if (showDate) {
      doc.moveDown(0.25)
      doc.font(bodyFont).fontSize(10).fillColor('#64748b').text(`Date: ${stamp}`, { align: 'center' })
    }
    doc.moveDown(0.95)

    const tableX = doc.page.margins.left
    const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right
    const pageBottom = doc.page.height - doc.page.margins.bottom
    const weights = pdfKeys.map((k) => columnWeight(k))
    const totalWeight = weights.reduce((sum, w) => sum + w, 0)
    const colWidths = weights.map((w) => (tableWidth * w) / totalWeight)
    const colStarts: number[] = []
    let cursorX = tableX
    for (const width of colWidths) {
      colStarts.push(cursorX)
      cursorX += width
    }

    let y = doc.y + 2
    const headerHeight = 28
    const rowMinHeight = 24
    const rowMaxHeight = 68

    const drawColumnLines = (topY: number, blockHeight: number, color: string, lineWidth = 0.7) => {
      doc.save()
      doc.strokeColor(color).lineWidth(lineWidth)
      for (let i = 1; i < colStarts.length; i += 1) {
        const x = colStarts[i]
        doc.moveTo(x, topY).lineTo(x, topY + blockHeight).stroke()
      }
      doc.restore()
    }

    const drawHeaderRow = () => {
      doc.save()
      doc.rect(tableX, y, tableWidth, headerHeight).fill('#0f766e')
      doc.restore()
      doc.strokeColor('#115e59').lineWidth(1).rect(tableX, y, tableWidth, headerHeight).stroke()
      drawColumnLines(y, headerHeight, '#134e4a', 0.8)

      doc.font(headingFont).fontSize(9).fillColor('#ffffff')
      pdfHeaders.forEach((header, i) => {
        doc.text(header, colStarts[i] + 4, y + 6, {
          width: colWidths[i] - 8,
          height: headerHeight - 8,
          lineBreak: false,
          ellipsis: true,
        })
      })
      y += headerHeight
    }

    const applyBodyRowTextStyle = () => {
      doc.font(bodyFont).fontSize(8.5).fillColor('#0f172a')
    }

    applyBodyRowTextStyle()
    let headerDrawn = false
    for (let rowIndex = 0; rowIndex < limited.length; rowIndex += 1) {
      const row = limited[rowIndex]
      const displayRow: PdfRow = {
        __rowNumber: rowIndex + 1,
        ...row,
      }
      const cellHeights = pdfKeys.map((key, i) =>
        doc.heightOfString(String(displayRow[key] ?? ''), {
          width: colWidths[i] - 10,
          align: isNumericColumn(key, displayRow[key]) ? 'right' : 'left',
          lineBreak: false,
        })
      )
      const rowHeight = Math.min(rowMaxHeight, Math.max(rowMinHeight, Math.max(...cellHeights) + 10))

      if (!headerDrawn) {
        if (y + headerHeight + rowHeight > pageBottom) {
          doc.addPage()
          y = doc.page.margins.top
        }
        drawHeaderRow()
        headerDrawn = true
      } else if (y + rowHeight > pageBottom) {
        doc.addPage()
        y = doc.page.margins.top
        drawHeaderRow()
        headerDrawn = true
      }
      applyBodyRowTextStyle()

      doc.save()
      if (rowIndex % 2 === 0) {
        doc.rect(tableX, y, tableWidth, rowHeight).fill('#f8fafc')
      }
      doc.restore()
      doc.strokeColor('#d1d5db').lineWidth(0.7).rect(tableX, y, tableWidth, rowHeight).stroke()
      drawColumnLines(y, rowHeight, '#e5e7eb', 0.6)
      pdfKeys.forEach((key, i) => {
        doc.text(String(displayRow[key] ?? ''), colStarts[i] + 5, y + 5, {
          width: colWidths[i] - 10,
          height: rowHeight - 10,
          align: isNumericColumn(key, displayRow[key]) ? 'right' : 'left',
          lineBreak: false,
          ellipsis: true,
        })
      })
      y += rowHeight
    }

    doc.end()
  })
}
