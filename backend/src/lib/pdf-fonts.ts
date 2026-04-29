import fs from 'fs'
import path from 'path'

export function resolveEmbeddedPdfFonts() {
  const baseCandidates = [
    path.join(process.cwd(), 'public', 'fonts'),
    path.join(process.cwd(), 'frontend', 'public', 'fonts'),
    path.join(process.cwd(), '..', 'public', 'fonts'),
  ]

  for (const base of baseCandidates) {
    const regular = path.join(base, 'arial.ttf')
    const bold = path.join(base, 'arialbd.ttf')
    if (fs.existsSync(regular) && fs.existsSync(bold)) {
      return { regular, bold }
    }
  }

  if (process.platform === 'win32') {
    const windowsFontDir = path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts')
    const regular = path.join(windowsFontDir, 'arial.ttf')
    const bold = path.join(windowsFontDir, 'arialbd.ttf')
    if (fs.existsSync(regular) && fs.existsSync(bold)) {
      return { regular, bold }
    }
  }

  return null
}
