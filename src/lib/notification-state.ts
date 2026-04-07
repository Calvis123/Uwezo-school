// Shared in-memory notification read state
// Since notifications are generated on-the-fly from existing data,
// we track read/unread state in memory

export const readNotificationIds = new Set<string>();
export let allReadTimestamp: string | null = null;

export function markNotificationRead(id: string) {
  readNotificationIds.add(id);
}

export function isNotificationRead(id: string): boolean {
  return readNotificationIds.has(id);
}

export function markAllRead() {
  allReadTimestamp = new Date().toISOString();
}

export function isAllRead(): boolean {
  return allReadTimestamp !== null;
}
