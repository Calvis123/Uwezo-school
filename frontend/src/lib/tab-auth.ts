const TAB_AUTH_KEY = 'uwezo_school_tab_authenticated'
const TAB_AUTH_LAST_SEEN_KEY = 'uwezo_school_tab_last_seen'
const DEFAULT_MAX_IDLE_MS = 10 * 1000

export function markTabAuthenticated(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(TAB_AUTH_KEY, '1')
  window.sessionStorage.setItem(TAB_AUTH_LAST_SEEN_KEY, String(Date.now()))
}

export function clearTabAuthenticated(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(TAB_AUTH_KEY)
  window.sessionStorage.removeItem(TAB_AUTH_LAST_SEEN_KEY)
}

export function isTabAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return window.sessionStorage.getItem(TAB_AUTH_KEY) === '1'
}

export function touchTabAuthenticated(): void {
  if (typeof window === 'undefined') return
  if (!isTabAuthenticated()) return
  window.sessionStorage.setItem(TAB_AUTH_LAST_SEEN_KEY, String(Date.now()))
}

export function isTabSessionFresh(maxIdleMs = DEFAULT_MAX_IDLE_MS): boolean {
  if (typeof window === 'undefined') return false
  if (!isTabAuthenticated()) return false

  const lastSeenRaw = window.sessionStorage.getItem(TAB_AUTH_LAST_SEEN_KEY)
  const lastSeen = lastSeenRaw ? Number(lastSeenRaw) : 0
  if (!lastSeen) return false

  return Date.now() - lastSeen <= maxIdleMs
}
