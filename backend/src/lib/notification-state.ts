// In-memory notification read state, scoped per user.
// Notifications are generated on-the-fly from existing data; this tracks read/unread
// without persisting to the database.

const readNotificationIdsByUser = new Map<string, Set<string>>();
const allReadTimestampByUser = new Map<string, number>();

function getUserSet(userId: string): Set<string> {
  const existing = readNotificationIdsByUser.get(userId);
  if (existing) return existing;
  const set = new Set<string>();
  readNotificationIdsByUser.set(userId, set);
  return set;
}

export function markNotificationRead(userId: string, id: string) {
  getUserSet(userId).add(id);
}

export function isNotificationRead(userId: string, id: string): boolean {
  return getUserSet(userId).has(id);
}

export function markAllRead(userId: string) {
  allReadTimestampByUser.set(userId, Date.now());
}

export function isAllRead(userId: string, createdAt: Date | string | number): boolean {
  const markedAt = allReadTimestampByUser.get(userId);
  if (!markedAt) return false;

  const createdAtMs =
    createdAt instanceof Date
      ? createdAt.getTime()
      : typeof createdAt === 'number'
        ? createdAt
        : new Date(createdAt).getTime();

  if (!Number.isFinite(createdAtMs)) return false;
  return createdAtMs <= markedAt;
}
