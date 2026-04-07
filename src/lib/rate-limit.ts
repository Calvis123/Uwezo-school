/**
 * In-Memory Rate Limiter
 * Simple Map-based rate limiting with automatic cleanup of expired entries.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

/** Interval reference for periodic cleanup */
let cleanupTimer: ReturnType<typeof setInterval> | null = null

/**
 * Clean up expired entries from the rate limit store.
 */
function cleanup(): void {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) {
      store.delete(key)
    }
  }
}

/**
 * Ensure the cleanup timer is running (only one timer at a time).
 */
function ensureCleanup(): void {
  if (cleanupTimer) return
  cleanupTimer = setInterval(cleanup, 60_000) // every 60 seconds
  // Allow the process to exit without waiting for the timer
  if (typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref()
  }
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean
  /** How many requests remain in the current window */
  remaining: number
  /** Timestamp (ms) when the rate limit window resets */
  resetAt: number
}

/**
 * Check (and increment) a rate limit for the given key.
 *
 * @param key    - Unique identifier (e.g. IP address or "ip:endpoint")
 * @param limit  - Maximum number of requests allowed in the window
 * @param windowMs - Duration of the rate-limit window in milliseconds
 * @returns RateLimitResult with success flag and metadata
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  ensureCleanup()

  const now = Date.now()
  const existing = store.get(key)

  // If no entry exists or the window has expired, create a fresh entry
  if (!existing || now >= existing.resetAt) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { success: true, remaining: limit - 1, resetAt }
  }

  // Window is still active — increment the counter
  existing.count += 1

  if (existing.count > limit) {
    return {
      success: false,
      remaining: 0,
      resetAt: existing.resetAt,
    }
  }

  return {
    success: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  }
}
