export const MARKED_ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const

export function isPresentEquivalentStatus(status: string) {
  return status === 'PRESENT' || status === 'LATE'
}
