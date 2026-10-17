import { describe, expect, it } from "vitest";
import { isOnline, rankParticipants } from "@/lib/monitoring";
describe("Live competition monitoring", () => {
  const now = Date.parse("2026-10-17T12:00:00Z");
  it("expires presence after 90 seconds", () => {
    expect(isOnline("2026-10-17T11:59:00Z", null, now)).toBe(true);
    expect(isOnline("2026-10-17T11:58:30Z", null, now)).toBe(false);
  });
  it("marks an explicitly ended session offline", () => {
    expect(isOnline("2026-10-17T11:59:30Z", "2026-10-17T11:59:30Z", now)).toBe(false);
  });
  it("ranks by score then earliest completion then registration", () => {
    const rows = [
      { id: "later", score: 100, completed_at: "2026-10-17T11:00:00Z", created_at: "2026-10-17T09:00:00Z" },
      { id: "earlier", score: 100, completed_at: "2026-10-17T10:00:00Z", created_at: "2026-10-17T09:30:00Z" },
      { id: "high", score: 200, completed_at: null, created_at: "2026-10-17T09:00:00Z" },
      { id: "unfinished", score: 100, completed_at: null, created_at: "2026-10-17T08:00:00Z" },
    ];
    expect(rankParticipants(rows).map(x => x.id)).toEqual(["high", "earlier", "later", "unfinished"]);
  });
});