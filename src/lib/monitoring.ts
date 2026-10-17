export const ONLINE_WINDOW_MS = 90_000;
export function isOnline(lastSeen: string | null, lastLogout: string | null, now: number) {
  if (!lastSeen) return false;
  const seen = Date.parse(lastSeen);
  return Number.isFinite(seen) && now - seen < ONLINE_WINDOW_MS && (!lastLogout || seen > Date.parse(lastLogout));
}
export function rankParticipants<T extends { score: number; completed_at: string | null; created_at: string }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.completed_at && !b.completed_at) return -1;
    if (!a.completed_at && b.completed_at) return 1;
    if (a.completed_at && b.completed_at) {
      const diff = Date.parse(a.completed_at) - Date.parse(b.completed_at);
      if (diff) return diff;
    }
    return Date.parse(a.created_at) - Date.parse(b.created_at);
  });
}