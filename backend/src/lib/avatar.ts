/**
 * Avatar utility for generating deterministic avatar colors and initials
 */

const AVATAR_COLORS = [
  { bg: '#0d9488', light: '#ccfbf1', dark: '#134e4a' },   // teal
  { bg: '#2563eb', light: '#dbeafe', dark: '#1e3a5f' },   // blue
  { bg: '#d97706', light: '#fef3c7', dark: '#78350f' },   // amber
  { bg: '#dc2626', light: '#fee2e2', dark: '#7f1d1d' },   // red
  { bg: '#7c3aed', light: '#ede9fe', dark: '#4c1d95' },   // violet
  { bg: '#059669', light: '#d1fae5', dark: '#064e3b' },   // emerald
  { bg: '#ea580c', light: '#ffedd5', dark: '#7c2d12' },   // orange
  { bg: '#0891b2', light: '#cffafe', dark: '#164e63' },   // cyan
]

/**
 * Get 1-2 letter initials from first and last name
 */
export function getInitials(firstName: string, lastName: string): string {
  if (!firstName && !lastName) return '?'
  const first = firstName?.trim().charAt(0)?.toUpperCase() || ''
  const last = lastName?.trim().charAt(0)?.toUpperCase() || ''
  return first + (last || '')
}

/**
 * Get a deterministic color from a name (same name = same color always)
 * Uses a simple hash of the combined name
 */
export function getAvatarColor(name: string): typeof AVATAR_COLORS[0] {
  if (!name) return AVATAR_COLORS[0]

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  const index = Math.abs(hash) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

/**
 * Get initials-based data URL SVG avatar
 */
export function getAvatarUrl(
  student: { firstName: string; lastName: string } | null | undefined,
  size: number = 80
): string {
  if (!student) return ''
  const initials = getInitials(student.firstName, student.lastName)
  const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim()
  const color = getAvatarColor(fullName)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${size / 2}" fill="${color.bg}"/>
    <text x="50%" y="54%" dominant-baseline="central" text-anchor="middle"
      font-family="system-ui, -apple-system, sans-serif"
      font-size="${size * 0.4}" font-weight="700" fill="white">
      ${initials}
    </text>
  </svg>`

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
