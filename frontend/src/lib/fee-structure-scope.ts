export const ALL_CLASSES_MARKER = '[ALL_CLASSES]'

export function isAllClassesScopeDescription(description?: string | null) {
  return String(description || '').trimStart().startsWith(ALL_CLASSES_MARKER)
}

export function addAllClassesScopeMarker(description?: string | null) {
  const cleaned = removeAllClassesScopeMarker(description)
  return cleaned ? `${ALL_CLASSES_MARKER} ${cleaned}` : ALL_CLASSES_MARKER
}

export function removeAllClassesScopeMarker(description?: string | null) {
  return String(description || '')
    .replace(ALL_CLASSES_MARKER, '')
    .trim()
}

