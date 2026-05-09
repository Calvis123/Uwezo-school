export const ALL_CLASSES_MARKER = '[ALL_CLASSES]'
const CLASS_SCOPE_PATTERN = /\[CLASS_SCOPE:([A-Z0-9_-]+)\]/
const TRANSPORT_ROUTE_PATTERN = /\[TRANSPORT_ROUTE:([^\]]+)\]/

export const TRANSPORT_FEE_GROUPS = {
  WITHIN_KAPSOYA: 'Within Kapsoya',
  OUTSIDE_KAPSOYA: 'Outside Kapsoya',
} as const

export type FeeClassScope = 'PLAYGROUP' | 'PP1_PP2' | 'ECDE' | 'GRADE_1_4' | 'GRADE_5_6' | 'JSS' | 'REST_OF_SCHOOL'

export const FEE_CLASS_SCOPES: Record<FeeClassScope, { label: string; description: string }> = {
  PLAYGROUP: { label: 'Playgroup', description: 'Playgroup only' },
  PP1_PP2: { label: 'PP1 - PP2', description: 'PP1, PP2' },
  ECDE: { label: 'ECDE', description: 'Playgroup, PP1, PP2' },
  GRADE_1_4: { label: 'Grade 1 - Grade 4', description: 'Grade 1, Grade 2, Grade 3, Grade 4' },
  GRADE_5_6: { label: 'Grade 5 - Grade 6', description: 'Grade 5, Grade 6' },
  JSS: { label: 'JSS', description: 'Grade 7, Grade 8, Grade 9' },
  REST_OF_SCHOOL: { label: 'Rest of School', description: 'Grade 1 through Grade 9' },
}

export function isAllClassesScopeDescription(description?: string | null) {
  return String(description || '').trimStart().startsWith(ALL_CLASSES_MARKER)
}

export function addAllClassesScopeMarker(description?: string | null) {
  const cleaned = removeClassScopeMarker(removeAllClassesScopeMarker(description))
  return cleaned ? `${ALL_CLASSES_MARKER} ${cleaned}` : ALL_CLASSES_MARKER
}

export function removeAllClassesScopeMarker(description?: string | null) {
  return String(description || '')
    .replace(ALL_CLASSES_MARKER, '')
    .trim()
}

export function getClassScopeFromDescription(description?: string | null): FeeClassScope | null {
  const match = String(description || '').match(CLASS_SCOPE_PATTERN)
  const value = match?.[1]
  return value && value in FEE_CLASS_SCOPES ? value as FeeClassScope : null
}

export function isClassScopeDescription(description?: string | null) {
  return Boolean(getClassScopeFromDescription(description))
}

export function addClassScopeMarker(scope: FeeClassScope, description?: string | null) {
  const cleaned = removeClassScopeMarker(removeAllClassesScopeMarker(description))
  const marker = `[CLASS_SCOPE:${scope}]`
  return cleaned ? `${marker} ${cleaned}` : marker
}

export function feeClassScopeAppliesToClass(
  feeScope?: FeeClassScope | null,
  classScope?: FeeClassScope | null
) {
  if (!feeScope || !classScope) return false
  if (feeScope === classScope) return true
  return feeScope === 'ECDE' && (classScope === 'PLAYGROUP' || classScope === 'PP1_PP2')
}

export function removeClassScopeMarker(description?: string | null) {
  return String(description || '')
    .replace(CLASS_SCOPE_PATTERN, '')
    .trim()
}

function normalizeTransportRoute(value?: string | null) {
  return String(value || '').trim().toLowerCase()
}

export function getTransportFeeGroupForMode(transportMode?: string | null) {
  const mode = String(transportMode || 'TWO_WAY_WITHIN_KAPSOYA')
  if (mode === 'TWO_WAY_OUTSIDE_KAPSOYA') return TRANSPORT_FEE_GROUPS.OUTSIDE_KAPSOYA
  if (
    mode === 'TWO_WAY_WITHIN_KAPSOYA' ||
    mode === 'TWO_WAY' ||
    mode.startsWith('ONE_WAY')
  ) {
    return TRANSPORT_FEE_GROUPS.WITHIN_KAPSOYA
  }
  return null
}

export function isTransportFeeGroup(value?: string | null) {
  const normalized = normalizeTransportRoute(value)
  return Object.values(TRANSPORT_FEE_GROUPS).some((group) => normalizeTransportRoute(group) === normalized)
}

export function addTransportRouteMarker(routeName: string, description?: string | null) {
  const cleaned = removeTransportRouteMarker(description)
  const marker = `[TRANSPORT_ROUTE:${routeName.trim()}]`
  return cleaned ? `${marker} ${cleaned}` : marker
}

export function getTransportRouteFromDescription(description?: string | null) {
  return String(description || '').match(TRANSPORT_ROUTE_PATTERN)?.[1]?.trim() || null
}

export function transportRouteAppliesToStudent(
  feeRouteName?: string | null,
  studentRouteName?: string | null,
  transportMode?: string | null
) {
  if (!feeRouteName) return true
  if (isTransportFeeGroup(feeRouteName)) {
    return normalizeTransportRoute(feeRouteName) === normalizeTransportRoute(getTransportFeeGroupForMode(transportMode))
  }
  return normalizeTransportRoute(feeRouteName) === normalizeTransportRoute(studentRouteName)
}

export function removeTransportRouteMarker(description?: string | null) {
  return String(description || '')
    .replace(TRANSPORT_ROUTE_PATTERN, '')
    .trim()
}

export function removeFeeScopeMarkers(description?: string | null) {
  return removeTransportRouteMarker(removeClassScopeMarker(removeAllClassesScopeMarker(description)))
}

export function getFeeClassScopeForClass(cls?: { name?: string | null; level?: string | null } | null): FeeClassScope | null {
  const level = String(cls?.level || '').toUpperCase()
  const name = String(cls?.name || '').toLowerCase()

  if (
    ['PLAYGROUP', 'PRE_NURSERY'].includes(level) ||
    name.includes('playgroup') ||
    name.includes('play group') ||
    name.includes('pre-nursery') ||
    name.includes('pre nursery')
  ) return 'PLAYGROUP'

  if (
    ['NURSERY', 'PP1', 'PP2'].includes(level) ||
    name === 'nursery' ||
    name.includes('pp1') ||
    name.includes('pp2') ||
    name.includes('pre-primary 1') ||
    name.includes('pre-primary 2')
  ) return 'PP1_PP2'

  const gradeMatch = level.match(/^GRADE_(\d)$/) || name.match(/grade\s*([1-9])/)
  const grade = gradeMatch ? Number(gradeMatch[1]) : null

  if (grade !== null) {
    if (grade >= 1 && grade <= 4) return 'GRADE_1_4'
    if (grade >= 5 && grade <= 6) return 'GRADE_5_6'
    if (grade >= 7 && grade <= 9) return 'JSS'
  }

  if (level === 'PRIMARY') {
    const primaryGrade = name.match(/grade\s*([1-6])/)
    const gradeNumber = primaryGrade ? Number(primaryGrade[1]) : null
    if (gradeNumber && gradeNumber <= 4) return 'GRADE_1_4'
    if (gradeNumber && gradeNumber <= 6) return 'GRADE_5_6'
  }

  if (level === 'JUNIOR_SECONDARY') return 'JSS'

  return null
}

export function getTransportFeeScopeForClass(cls?: { name?: string | null; level?: string | null } | null): FeeClassScope | null {
  const academicScope = getFeeClassScopeForClass(cls)
  if (academicScope === 'PLAYGROUP' || academicScope === 'PP1_PP2' || academicScope === 'ECDE') return 'ECDE'
  if (academicScope === 'GRADE_1_4' || academicScope === 'GRADE_5_6' || academicScope === 'JSS') {
    return 'REST_OF_SCHOOL'
  }
  return null
}
