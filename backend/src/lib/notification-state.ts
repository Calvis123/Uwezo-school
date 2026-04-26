// In-memory notification read state, scoped per user.
// Notifications are generated on-the-fly from existing data; this tracks read/unread
// without persisting to the database.

const readNotificationIdsByUser = new Map<string, Set<string>>();
const allReadTimestampByUser = new Map<string, string>();

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
  allReadTimestampByUser.set(userId, new Date().toISOString());
}

export function isAllRead(userId: string): boolean {
  return allReadTimestampByUser.has(userId);
}
